"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
	ArrowLeft,
	Save,
	Upload,
	Trash2,
	ExternalLink,
	Store as StoreIcon,
	Zap,
} from "lucide-react";
import {
	getStoreAPI,
	updateStoreDataAPI,
	uploadFileAPI,
	getStoreUploadsAPI,
	deleteFileAPI,
	generateShopifyStoreAPI,
	connectShopifyStoreAPI,
} from "@/lib/api";
import { Store, StoreData, StoreFormData, Upload as UploadType } from "@/types";
import Link from "next/link";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
}

interface EditClientPageProps {
	params: {
		clientId: string;
	};
}

export default function EditClientPage({ params }: EditClientPageProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { userId } = useAuth();
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [store, setStore] = useState<Store | null>(null);
	const [storeData, setStoreData] = useState<StoreData | null>(null);
	const [uploads, setUploads] = useState<UploadType[]>([]);
	const [logoPreview, setLogoPreview] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [showShopifyForm, setShowShopifyForm] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const [shopifyFormData, setShopifyFormData] = useState({
		store_domain: "",
		admin_api_token: "",
		token_name: "",
	});

	const [formData, setFormData] = useState<StoreFormData>({
		brand_name: "",
		description: "",
		main_product_category: "",
		contact_email: "",
	});

	// Debounced form data for auto-save
	const debouncedFormData = useDebounce(formData, 500);

	// Load store data on mount
	useEffect(() => {
		loadStoreData();
	}, [params.clientId]);

	// Handle URL parameters for success/error messages
	useEffect(() => {
		const successParam = searchParams.get("success");
		const errorParam = searchParams.get("error");

		if (successParam === "shopify_connected") {
			setSuccess("Shopify store connected successfully!");
			setTimeout(() => setSuccess(null), 5000);
			// Clean up URL parameters
			router.replace(`/dashboard/clients/${params.clientId}`);
		}

		if (errorParam) {
			const errorMessages: Record<string, string> = {
				shopify_connection_failed:
					"Failed to connect to Shopify. Please try again.",
				invalid_credentials: "Invalid store domain or Admin API token.",
				insufficient_permissions:
					"Admin API token doesn't have required permissions.",
				store_access_denied: "Access denied to store.",
			};

			setError(errorMessages[errorParam] || "An error occurred.");
			setTimeout(() => setError(null), 5000);
			// Clean up URL parameters
			router.replace(`/dashboard/clients/${params.clientId}`);
		}
	}, [searchParams, params.clientId, router]);

	// Auto-save effect
	useEffect(() => {
		if (store && debouncedFormData.brand_name.trim() && !isLoading) {
			handleAutoSave();
		}
	}, [debouncedFormData, store, isLoading]);

	const loadStoreData = async () => {
		try {
			setIsLoading(true);
			setError(null);

			// Load store and store data
			const { store: storeResult, storeData: storeDataResult } =
				await getStoreAPI(params.clientId);

			// Check ownership
			if (storeResult.created_by !== userId) {
				setError("You don't have permission to edit this store");
				return;
			}

			setStore(storeResult);

			// Set form data
			if (storeDataResult) {
				setStoreData(storeDataResult);
				setFormData({
					brand_name: storeDataResult.brand_name || storeResult.name,
					description: storeDataResult.description || "",
					main_product_category:
						storeDataResult.main_product_category || "",
					contact_email: storeDataResult.contact_email || "",
				});

				// Set logo preview if exists
				if (storeDataResult.logo_url) {
					setLogoPreview(storeDataResult.logo_url);
				}
			} else {
				// No store data yet, use store name
				setFormData((prev) => ({
					...prev,
					brand_name: storeResult.name,
				}));
			}

			// Load uploads
			const uploadsResult = await getStoreUploadsAPI(params.clientId);
			setUploads(uploadsResult);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load store data"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleAutoSave = useCallback(async () => {
		if (!store || isSaving) return;

		setIsSaving(true);
		try {
			await updateStoreDataAPI(store.id, {
				brand_name: debouncedFormData.brand_name,
				description: debouncedFormData.description,
				main_product_category: debouncedFormData.main_product_category,
				contact_email: debouncedFormData.contact_email,
			});
			setSuccess("Changes saved automatically");
			setTimeout(() => setSuccess(null), 2000);
		} catch (err) {
			console.error("Auto-save failed:", err);
		} finally {
			setIsSaving(false);
		}
	}, [store, debouncedFormData, isSaving]);

	const handleInputChange = (field: keyof StoreFormData, value: string) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleLogoUpload = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = event.target.files?.[0];
		if (!file || !store) return;

		// Validate file type
		if (!file.type.startsWith("image/")) {
			setError("Please upload an image file");
			return;
		}

		// Validate file size (5MB limit)
		if (file.size > 5 * 1024 * 1024) {
			setError("Logo file must be less than 5MB");
			return;
		}

		try {
			setIsLoading(true);
			setError(null);

			// Create preview
			const reader = new FileReader();
			reader.onload = (e) => {
				setLogoPreview(e.target?.result as string);
			};
			reader.readAsDataURL(file);

			// Upload to Supabase
			const { url } = await uploadFileAPI(store.id, file, "logo");

			// Update store data with logo URL
			await updateStoreDataAPI(store.id, {
				logo_url: url,
			});

			// Refresh uploads
			const uploadsResult = await getStoreUploadsAPI(store.id);
			setUploads(uploadsResult);

			setSuccess("Logo uploaded successfully");
			setTimeout(() => setSuccess(null), 2000);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to upload logo"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleCsvUpload = async (
		event: React.ChangeEvent<HTMLInputElement>,
		type: string
	) => {
		const file = event.target.files?.[0];
		if (!file || !store) return;

		// Validate file type
		if (!file.name.toLowerCase().endsWith(".csv")) {
			setError("Please upload a CSV file");
			return;
		}

		try {
			setIsLoading(true);
			setError(null);

			await uploadFileAPI(store.id, file, `csv_${type}`);

			// Refresh uploads
			const uploadsResult = await getStoreUploadsAPI(store.id);
			setUploads(uploadsResult);

			setSuccess(`${type} CSV uploaded successfully`);
			setTimeout(() => setSuccess(null), 2000);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to upload CSV"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleDeleteFile = async (upload: UploadType) => {
		if (!store) return;

		try {
			setIsLoading(true);
			setError(null);

			await deleteFileAPI(upload.file_path);

			// If it's a logo, clear the preview
			if (upload.file_type === "logo") {
				setLogoPreview(null);
				await updateStoreDataAPI(store.id, {
					logo_url: undefined,
				});
			}

			// Refresh uploads
			const uploadsResult = await getStoreUploadsAPI(store.id);
			setUploads(uploadsResult);

			setSuccess("File deleted successfully");
			setTimeout(() => setSuccess(null), 2000);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to delete file"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!store) return;

		if (!formData.brand_name.trim()) {
			setError("Store name is required");
			return;
		}

		try {
			setIsLoading(true);
			setError(null);

			// Save store data
			await updateStoreDataAPI(store.id, {
				brand_name: formData.brand_name,
				description: formData.description,
				main_product_category: formData.main_product_category,
				contact_email: formData.contact_email,
			});

			setSuccess("Store updated successfully!");
			setTimeout(() => setSuccess(null), 2000);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to update store"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const getCsvUploads = (type: string) => {
		return uploads.filter((upload) => upload.file_type === `csv_${type}`);
	};

	const handleShopifyConnect = async () => {
		if (!store) return;

		try {
			setIsConnecting(true);
			setError(null);

			const result = await connectShopifyStoreAPI(store.id, {
				store_domain: shopifyFormData.store_domain,
				admin_api_token: shopifyFormData.admin_api_token,
				token_name:
					shopifyFormData.token_name || "Genesis Project Token",
			});

			setSuccess(
				`Shopify store connected successfully! Store: ${result.store_url}`
			);
			setShowShopifyForm(false);
			setShopifyFormData({
				store_domain: "",
				admin_api_token: "",
				token_name: "",
			});

			// Reload store data to get updated Shopify domain
			await loadStoreData();
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to connect Shopify store"
			);
		} finally {
			setIsConnecting(false);
		}
	};

	const handleGenerateStore = async () => {
		if (!store) return;

		// Check if store has a Shopify domain (means it's connected)
		if (!store.shopify_store_domain) {
			// Show the connection form
			setShowShopifyForm(true);
			return;
		}

		// Store is already connected, proceed with generation
		try {
			setIsGenerating(true);
			setError(null);

			console.log("Starting store generation for store:", store.id);
			const result = await generateShopifyStoreAPI(store.id);

			setSuccess(
				`Store generated successfully! Your store is now live at ${result.store_url}`
			);
			setTimeout(() => setSuccess(null), 10000);
		} catch (err) {
			console.error("Store generation error:", err);
			setError(
				err instanceof Error ? err.message : "Failed to generate store"
			);
		} finally {
			setIsGenerating(false);
		}
	};

	if (isLoading && !store) {
		return (
			<div className="max-w-2xl mx-auto">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900">
						Loading...
					</h1>
					<p className="text-gray-600">Loading store data...</p>
				</div>
			</div>
		);
	}

	if (error && !store) {
		return (
			<div className="max-w-2xl mx-auto">
				<div className="mb-8">
					<Button variant="outline" size="sm" asChild>
						<Link href="/dashboard/clients">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Clients
						</Link>
					</Button>
				</div>
				<Card className="border-red-200 bg-red-50">
					<CardContent className="pt-6">
						<p className="text-red-800">{error}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto">
			<div className="mb-8">
				<div className="flex items-center space-x-4 mb-4">
					<Button variant="outline" size="sm" asChild>
						<Link href="/dashboard/clients">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Clients
						</Link>
					</Button>
				</div>
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">
							Edit {store?.name}
						</h1>
						<p className="text-gray-600">
							Update client store information and files.
						</p>
					</div>
					{store?.shopify_store_domain && (
						<Button variant="outline" asChild>
							<a
								href={`https://${store.shopify_store_domain}.myshopify.com`}
								target="_blank"
								rel="noopener noreferrer"
							>
								<ExternalLink className="h-4 w-4 mr-2" />
								View Store
							</a>
						</Button>
					)}
				</div>
			</div>

			{error && (
				<div className="mb-6">
					<Card className="border-red-200 bg-red-50">
						<CardContent className="pt-6">
							<p className="text-red-800">{error}</p>
						</CardContent>
					</Card>
				</div>
			)}

			{success && (
				<div className="mb-6">
					<Card className="border-green-200 bg-green-50">
						<CardContent className="pt-6">
							<p className="text-green-800">{success}</p>
						</CardContent>
					</Card>
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>Store Information</CardTitle>
						<CardDescription>
							Basic information about the client's store
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Label htmlFor="brand_name">
								Store or Brand Name *
							</Label>
							<Input
								id="brand_name"
								type="text"
								value={formData.brand_name}
								onChange={(e) =>
									handleInputChange(
										"brand_name",
										e.target.value
									)
								}
								placeholder="Enter the store or brand name"
								required
							/>
						</div>

						<div>
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								value={formData.description}
								onChange={(e) =>
									handleInputChange(
										"description",
										e.target.value
									)
								}
								placeholder="Briefly describe what they sell in 1-2 sentences"
								rows={3}
							/>
							<p className="text-sm text-muted-foreground mt-1">
								Example: "We sell luxury soy candles for women
								who want to elevate their home vibe."
							</p>
						</div>

						<div>
							<Label htmlFor="main_product_category">
								Main Product Category
							</Label>
							<Input
								id="main_product_category"
								type="text"
								value={formData.main_product_category}
								onChange={(e) =>
									handleInputChange(
										"main_product_category",
										e.target.value
									)
								}
								placeholder="e.g., Candles, Nappies, Whey Protein"
							/>
							<p className="text-sm text-muted-foreground mt-1">
								Used for generating collections
							</p>
						</div>

						<div>
							<Label htmlFor="contact_email">Contact Email</Label>
							<Input
								id="contact_email"
								type="email"
								value={formData.contact_email}
								onChange={(e) =>
									handleInputChange(
										"contact_email",
										e.target.value
									)
								}
								placeholder="hello@brand.com"
							/>
							<p className="text-sm text-muted-foreground mt-1">
								Used in the footer and contact forms
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Logo</CardTitle>
						<CardDescription>
							Upload and manage the client's logo
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{logoPreview && (
								<div>
									<Label>Current Logo</Label>
									<div className="mt-2 p-4 border rounded-lg bg-gray-50 flex items-center justify-between">
										<img
											src={logoPreview}
											alt="Current logo"
											className="max-h-32 max-w-48 object-contain"
										/>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => {
												const logoUpload = uploads.find(
													(u) =>
														u.file_type === "logo"
												);
												if (logoUpload)
													handleDeleteFile(
														logoUpload
													);
											}}
										>
											<Trash2 className="h-4 w-4 mr-2" />
											Remove
										</Button>
									</div>
								</div>
							)}

							<div>
								<Label htmlFor="logo">Upload New Logo</Label>
								<div className="mt-2">
									<input
										id="logo"
										type="file"
										accept="image/*"
										onChange={handleLogoUpload}
										className="hidden"
									/>
									<Button
										type="button"
										variant="outline"
										onClick={() =>
											document
												.getElementById("logo")
												?.click()
										}
										disabled={isLoading}
									>
										<Upload className="h-4 w-4 mr-2" />
										{logoPreview
											? "Replace Logo"
											: "Upload Logo"}
									</Button>
									<p className="text-sm text-muted-foreground mt-1">
										PNG, JPG up to 5MB
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Data Files</CardTitle>
						<CardDescription>
							Upload and manage CSV files
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Products CSV */}
						<div>
							<Label>Products CSV</Label>
							{getCsvUploads("products").map((upload) => (
								<div
									key={upload.id}
									className="mt-2 p-3 border rounded-lg bg-gray-50 flex items-center justify-between"
								>
									<div>
										<p className="font-medium">
											{upload.file_name}
										</p>
										<p className="text-sm text-muted-foreground">
											Uploaded{" "}
											{new Date(
												upload.uploaded_at
											).toLocaleDateString()}
										</p>
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => handleDeleteFile(upload)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							))}
							<div className="mt-2">
								<input
									id="products_csv"
									type="file"
									accept=".csv"
									onChange={(e) =>
										handleCsvUpload(e, "products")
									}
									className="hidden"
								/>
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										document
											.getElementById("products_csv")
											?.click()
									}
									disabled={isLoading}
								>
									<Upload className="h-4 w-4 mr-2" />
									Upload Products CSV
								</Button>
							</div>
						</div>

						{/* Customers CSV */}
						<div>
							<Label>Customers CSV</Label>
							{getCsvUploads("customers").map((upload) => (
								<div
									key={upload.id}
									className="mt-2 p-3 border rounded-lg bg-gray-50 flex items-center justify-between"
								>
									<div>
										<p className="font-medium">
											{upload.file_name}
										</p>
										<p className="text-sm text-muted-foreground">
											Uploaded{" "}
											{new Date(
												upload.uploaded_at
											).toLocaleDateString()}
										</p>
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => handleDeleteFile(upload)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							))}
							<div className="mt-2">
								<input
									id="customers_csv"
									type="file"
									accept=".csv"
									onChange={(e) =>
										handleCsvUpload(e, "customers")
									}
									className="hidden"
								/>
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										document
											.getElementById("customers_csv")
											?.click()
									}
									disabled={isLoading}
								>
									<Upload className="h-4 w-4 mr-2" />
									Upload Customers CSV
								</Button>
							</div>
						</div>

						{/* Orders CSV */}
						<div>
							<Label>Orders CSV</Label>
							{getCsvUploads("orders").map((upload) => (
								<div
									key={upload.id}
									className="mt-2 p-3 border rounded-lg bg-gray-50 flex items-center justify-between"
								>
									<div>
										<p className="font-medium">
											{upload.file_name}
										</p>
										<p className="text-sm text-muted-foreground">
											Uploaded{" "}
											{new Date(
												upload.uploaded_at
											).toLocaleDateString()}
										</p>
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => handleDeleteFile(upload)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							))}
							<div className="mt-2">
								<input
									id="orders_csv"
									type="file"
									accept=".csv"
									onChange={(e) =>
										handleCsvUpload(e, "orders")
									}
									className="hidden"
								/>
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										document
											.getElementById("orders_csv")
											?.click()
									}
									disabled={isLoading}
								>
									<Upload className="h-4 w-4 mr-2" />
									Upload Orders CSV
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Generate Store Section */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<StoreIcon className="h-5 w-5 mr-2" />
							Generate Shopify Store
						</CardTitle>
						<CardDescription>
							{store?.shopify_store_domain
								? `Connected to ${store.shopify_store_domain}.myshopify.com`
								: "Connect your Shopify Custom App and generate your store with the Genesis theme"}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{store?.shopify_store_domain ? (
								<div className="p-4 bg-green-50 border border-green-200 rounded-lg">
									<div className="flex items-center">
										<div className="flex-shrink-0">
											<svg
												className="h-5 w-5 text-green-400"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fillRule="evenodd"
													d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
													clipRule="evenodd"
												/>
											</svg>
										</div>
										<div className="ml-3">
											<h3 className="text-sm font-medium text-green-800">
												Shopify Store Connected
											</h3>
											<div className="mt-2 text-sm text-green-700">
												<p>
													Your store is connected to{" "}
													<strong>
														{
															store.shopify_store_domain
														}
														.myshopify.com
													</strong>
												</p>
											</div>
										</div>
									</div>
								</div>
							) : showShopifyForm ? (
								<div className="space-y-4">
									<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
										<h3 className="text-sm font-medium text-blue-800 mb-2">
											Connect Your Shopify Custom App
										</h3>
										<p className="text-sm text-blue-700 mb-4">
											Enter your store domain and Admin
											API token from your Shopify Custom
											App.
										</p>
									</div>

									<div>
										<Label htmlFor="store_domain">
											Store Domain *
										</Label>
										<Input
											id="store_domain"
											type="text"
											value={shopifyFormData.store_domain}
											onChange={(e) =>
												setShopifyFormData((prev) => ({
													...prev,
													store_domain:
														e.target.value,
												}))
											}
											placeholder="genesis-project-demo"
										/>
										<p className="text-sm text-muted-foreground mt-1">
											Just the subdomain (without
											.myshopify.com)
										</p>
									</div>

									<div>
										<Label htmlFor="admin_api_token">
											Admin API Token *
										</Label>
										<Input
											id="admin_api_token"
											type="password"
											value={
												shopifyFormData.admin_api_token
											}
											onChange={(e) =>
												setShopifyFormData((prev) => ({
													...prev,
													admin_api_token:
														e.target.value,
												}))
											}
											placeholder="shpat_..."
										/>
										<p className="text-sm text-muted-foreground mt-1">
											From your Custom App in Shopify
											Admin
										</p>
									</div>

									<div>
										<Label htmlFor="token_name">
											Token Name (Optional)
										</Label>
										<Input
											id="token_name"
											type="text"
											value={shopifyFormData.token_name}
											onChange={(e) =>
												setShopifyFormData((prev) => ({
													...prev,
													token_name: e.target.value,
												}))
											}
											placeholder="Genesis Project Token"
										/>
									</div>

									<div className="flex space-x-3">
										<Button
											type="button"
											onClick={handleShopifyConnect}
											disabled={
												isConnecting ||
												!shopifyFormData.store_domain.trim() ||
												!shopifyFormData.admin_api_token.trim()
											}
										>
											{isConnecting ? (
												<>
													<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
													Connecting...
												</>
											) : (
												"Connect Store"
											)}
										</Button>
										<Button
											type="button"
											variant="outline"
											onClick={() =>
												setShowShopifyForm(false)
											}
										>
											Cancel
										</Button>
									</div>
								</div>
							) : (
								<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
									<div className="flex">
										<div className="flex-shrink-0">
											<svg
												className="h-5 w-5 text-blue-400"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fillRule="evenodd"
													d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
													clipRule="evenodd"
												/>
											</svg>
										</div>
										<div className="ml-3">
											<h3 className="text-sm font-medium text-blue-800">
												Connect to Shopify
											</h3>
											<div className="mt-2 text-sm text-blue-700">
												<p>
													You'll need to connect your
													Shopify Custom App before
													generating. We'll need your
													store domain and Admin API
													token.
												</p>
											</div>
										</div>
									</div>
								</div>
							)}

							<div className="flex flex-col space-y-3">
								<Button
									type="button"
									onClick={handleGenerateStore}
									disabled={
										isGenerating ||
										!formData.brand_name.trim()
									}
									className="w-full"
									size="lg"
								>
									{isGenerating ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
											Generating Store...
										</>
									) : (
										<>
											<Zap className="h-4 w-4 mr-2" />
											{store?.shopify_store_domain
												? "Generate Store"
												: "Connect Custom App & Generate Store"}
										</>
									)}
								</Button>

								{!formData.brand_name.trim() && (
									<p className="text-sm text-muted-foreground text-center">
										Please enter a brand name before
										generating
									</p>
								)}
							</div>
						</div>
					</CardContent>
				</Card>

				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2">
						{isSaving && (
							<p className="text-sm text-muted-foreground">
								Saving...
							</p>
						)}
					</div>
					<div className="flex space-x-3">
						<Button type="button" variant="outline" asChild>
							<Link href="/dashboard/clients">
								Back to Clients
							</Link>
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? (
								"Saving..."
							) : (
								<>
									<Save className="h-4 w-4 mr-2" />
									Save Changes
								</>
							)}
						</Button>
					</div>
				</div>
			</form>
		</div>
	);
}
