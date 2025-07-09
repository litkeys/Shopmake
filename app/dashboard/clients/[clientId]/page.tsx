"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, Save, Upload, Trash2, ExternalLink } from "lucide-react";
import {
	getStore,
	getStoreData,
	upsertStoreData,
	uploadFile,
	getStoreUploads,
	deleteFile,
} from "@/lib/supabase";
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
	const { userId } = useAuth();
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [store, setStore] = useState<Store | null>(null);
	const [storeData, setStoreData] = useState<StoreData | null>(null);
	const [uploads, setUploads] = useState<UploadType[]>([]);
	const [logoPreview, setLogoPreview] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

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

			// Load store
			const storeResult = await getStore(params.clientId);
			if (!storeResult) {
				setError("Store not found");
				return;
			}

			// Check ownership
			if (storeResult.created_by !== userId) {
				setError("You don't have permission to edit this store");
				return;
			}

			setStore(storeResult);

			// Update store name in form data
			setFormData((prev) => ({
				...prev,
				brand_name: storeResult.name,
			}));

			// Load store data
			const storeDataResult = await getStoreData(params.clientId);
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
			}

			// Load uploads
			const uploadsResult = await getStoreUploads(params.clientId);
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
			await upsertStoreData(store.id, {
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
			const { url } = await uploadFile(store.id, file, "logo");

			// Update store data with logo URL
			await upsertStoreData(store.id, {
				logo_url: url,
			});

			// Refresh uploads
			const uploadsResult = await getStoreUploads(store.id);
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

			await uploadFile(store.id, file, `csv_${type}`);

			// Refresh uploads
			const uploadsResult = await getStoreUploads(store.id);
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

			await deleteFile(upload.file_path);

			// If it's a logo, clear the preview
			if (upload.file_type === "logo") {
				setLogoPreview(null);
				await upsertStoreData(store.id, {
					logo_url: null,
				});
			}

			// Refresh uploads
			const uploadsResult = await getStoreUploads(store.id);
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
			await upsertStoreData(store.id, {
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
								href={`https://${store.shopify_store_domain}`}
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
