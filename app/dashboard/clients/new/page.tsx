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
import { ArrowLeft, Save, Upload, Image as ImageIcon } from "lucide-react";
import { createStoreAPI, updateStoreDataAPI, uploadFileAPI } from "@/lib/api";
import { StoreFormData } from "@/types";
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

export default function NewClientPage() {
	const router = useRouter();
	const { userId } = useAuth();
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [storeId, setStoreId] = useState<string | null>(null);
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

	// Auto-save effect
	useEffect(() => {
		if (storeId && debouncedFormData.brand_name.trim()) {
			handleAutoSave();
		}
	}, [debouncedFormData, storeId]);

	const handleAutoSave = useCallback(async () => {
		if (!storeId || isSaving) return;

		setIsSaving(true);
		try {
			await updateStoreDataAPI(storeId, {
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
	}, [storeId, debouncedFormData, isSaving]);

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
		if (!file || !storeId) return;

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
			const { url } = await uploadFileAPI(storeId, file, "logo");

			// Update store data with logo URL
			await updateStoreDataAPI(storeId, {
				logo_url: url,
			});

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
		if (!file || !storeId) return;

		// Validate file type
		if (!file.name.toLowerCase().endsWith(".csv")) {
			setError("Please upload a CSV file");
			return;
		}

		try {
			setIsLoading(true);
			setError(null);

			await uploadFileAPI(storeId, file, `csv_${type}`);

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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!userId) {
			setError("Not authenticated");
			return;
		}

		if (!formData.brand_name.trim()) {
			setError("Store name is required");
			return;
		}

		try {
			setIsLoading(true);
			setError(null);

			let currentStoreId = storeId;

			// Create store if it doesn't exist
			if (!currentStoreId) {
				const newStore = await createStoreAPI(formData.brand_name);
				currentStoreId = newStore.id;
				setStoreId(currentStoreId);
			}

			// Save store data
			await updateStoreDataAPI(currentStoreId, {
				brand_name: formData.brand_name,
				description: formData.description,
				main_product_category: formData.main_product_category,
				contact_email: formData.contact_email,
			});

			setSuccess("Client store created successfully!");

			// Redirect to edit page after a short delay
			setTimeout(() => {
				router.push(`/dashboard/clients/${currentStoreId}`);
			}, 1000);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to create store"
			);
		} finally {
			setIsLoading(false);
		}
	};

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
				<h1 className="text-3xl font-bold text-gray-900">
					New Client Store
				</h1>
				<p className="text-gray-600">
					Add a new client store and configure their data.
				</p>
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
						<CardTitle>Logo Upload</CardTitle>
						<CardDescription>
							Upload the client's logo (optional)
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div>
								<Label htmlFor="logo">Logo</Label>
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
										Upload Logo
									</Button>
									<p className="text-sm text-muted-foreground mt-1">
										PNG, JPG up to 5MB
									</p>
								</div>
							</div>

							{logoPreview && (
								<div className="mt-4">
									<Label>Logo Preview</Label>
									<div className="mt-2 p-4 border rounded-lg bg-gray-50">
										<img
											src={logoPreview}
											alt="Logo preview"
											className="max-h-32 max-w-full object-contain"
										/>
									</div>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Data Files</CardTitle>
						<CardDescription>
							Upload existing CSV files (optional)
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Label htmlFor="products_csv">Products CSV</Label>
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

						<div>
							<Label htmlFor="customers_csv">Customers CSV</Label>
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

						<div>
							<Label htmlFor="orders_csv">Orders CSV</Label>
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
							<Link href="/dashboard/clients">Cancel</Link>
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? (
								"Creating..."
							) : (
								<>
									<Save className="h-4 w-4 mr-2" />
									Create Store
								</>
							)}
						</Button>
					</div>
				</div>
			</form>
		</div>
	);
}
