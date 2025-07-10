import { SHOPIFY_CONFIG } from "./constants";
import { ShopifyAdminToken, StoreData } from "@/types";

// Test Admin API connection
export async function testShopifyConnection(
	shop: string,
	adminToken: string
): Promise<boolean> {
	try {
		const url = `https://${shop}.myshopify.com/admin/api/2023-10/shop.json`;

		const response = await fetch(url, {
			headers: {
				"X-Shopify-Access-Token": adminToken,
				"Content-Type": "application/json",
			},
		});

		return response.ok;
	} catch (error) {
		console.error("Error testing Shopify connection:", error);
		return false;
	}
}

// Shopify API Client class
export class ShopifyClient {
	private shop: string;
	private accessToken: string;

	constructor(shop: string, accessToken: string) {
		this.shop = shop;
		this.accessToken = accessToken;
	}

	private async makeRequest<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<T> {
		const url = `https://${this.shop}.myshopify.com/admin/api/2023-10${endpoint}`;

		const response = await fetch(url, {
			...options,
			headers: {
				"X-Shopify-Access-Token": this.accessToken,
				"Content-Type": "application/json",
				...options.headers,
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Shopify API error: ${response.status} ${response.statusText} - ${errorText}`
			);
		}

		return response.json();
	}

	// Upload and install theme
	async uploadTheme(themeName: string): Promise<{ theme_id: number }> {
		try {
			let themeBuffer: ArrayBuffer;

			// Check if Genesis theme URL is a Supabase storage URL
			if (SHOPIFY_CONFIG.GENESIS_THEME_URL.includes("supabase")) {
				// For Supabase storage, we need to handle authentication
				const { supabaseAdmin } = await import("./supabase");

				// Extract bucket and path from URL
				// Expected format: https://project.supabase.co/storage/v1/object/public/bucket-name/path/theme.zip
				const url = new URL(SHOPIFY_CONFIG.GENESIS_THEME_URL);
				const pathParts = url.pathname.split("/");
				const bucketIndex =
					pathParts.findIndex((part) => part === "public") + 1;
				const bucketName = pathParts[bucketIndex];
				const filePath = pathParts.slice(bucketIndex + 1).join("/");

				// Download from Supabase storage
				const { data, error } = await supabaseAdmin.storage
					.from(bucketName)
					.download(filePath);

				if (error) {
					throw new Error(
						`Failed to download theme from Supabase: ${error.message}`
					);
				}

				themeBuffer = await data.arrayBuffer();
			} else {
				// Download from external URL
				const themeResponse = await fetch(
					SHOPIFY_CONFIG.GENESIS_THEME_URL
				);
				if (!themeResponse.ok) {
					throw new Error(
						`Failed to download Genesis theme: ${themeResponse.statusText}`
					);
				}
				themeBuffer = await themeResponse.arrayBuffer();
			}

			const themeBase64 = Buffer.from(themeBuffer).toString("base64");

			// Create theme via Shopify API
			const result = await this.makeRequest<{ theme: { id: number } }>(
				"/themes.json",
				{
					method: "POST",
					body: JSON.stringify({
						theme: {
							name: themeName,
							src: `data:application/zip;base64,${themeBase64}`,
							role: "unpublished",
						},
					}),
				}
			);

			return { theme_id: result.theme.id };
		} catch (error) {
			console.error("Error uploading theme:", error);
			throw error;
		}
	}

	// Publish theme
	async publishTheme(themeId: number): Promise<void> {
		await this.makeRequest(`/themes/${themeId}.json`, {
			method: "PUT",
			body: JSON.stringify({
				theme: {
					id: themeId,
					role: "main",
				},
			}),
		});
	}

	// Create collection
	async createCollection(
		title: string,
		description?: string
	): Promise<{ collection_id: number }> {
		const result = await this.makeRequest<{
			custom_collection: { id: number };
		}>("/custom_collections.json", {
			method: "POST",
			body: JSON.stringify({
				custom_collection: {
					title: title,
					body_html: description || "",
					published: true,
				},
			}),
		});

		return { collection_id: result.custom_collection.id };
	}

	// Create product
	async createProduct(product: {
		title: string;
		description: string;
		vendor?: string;
		product_type?: string;
		price: string;
		compare_at_price?: string;
		inventory_quantity?: number;
		weight?: number;
		requires_shipping?: boolean;
		taxable?: boolean;
		sku?: string;
		barcode?: string;
		images?: string[];
	}): Promise<{ product_id: number }> {
		const variants = [
			{
				price: product.price,
				compare_at_price: product.compare_at_price,
				inventory_quantity: product.inventory_quantity || 0,
				weight: product.weight,
				requires_shipping: product.requires_shipping !== false,
				taxable: product.taxable !== false,
				sku: product.sku,
				barcode: product.barcode,
			},
		];

		const images = product.images?.map((src) => ({ src })) || [];

		const result = await this.makeRequest<{ product: { id: number } }>(
			"/products.json",
			{
				method: "POST",
				body: JSON.stringify({
					product: {
						title: product.title,
						body_html: product.description,
						vendor: product.vendor || "",
						product_type: product.product_type || "",
						variants: variants,
						images: images,
						published: true,
					},
				}),
			}
		);

		return { product_id: result.product.id };
	}

	// Update store branding
	async updateStoreBranding(storeData: StoreData): Promise<void> {
		try {
			// Update shop settings
			if (storeData.brand_name) {
				await this.makeRequest("/shop.json", {
					method: "PUT",
					body: JSON.stringify({
						shop: {
							name: storeData.brand_name,
						},
					}),
				});
			}

			// Add more branding updates here as needed
			// For example, updating theme settings, adding logo, etc.
		} catch (error) {
			console.error("Error updating store branding:", error);
			throw error;
		}
	}

	// Generate full store
	async generateStore(storeData: StoreData): Promise<{
		theme_id: number;
		collection_id?: number;
		products_created: number;
	}> {
		try {
			// 1. Upload and publish theme
			const themeName = `Genesis - ${storeData.brand_name || "Store"}`;
			const { theme_id } = await this.uploadTheme(themeName);
			await this.publishTheme(theme_id);

			// 2. Update store branding
			await this.updateStoreBranding(storeData);

			// 3. Create main collection if category is provided
			let collection_id: number | undefined;
			if (storeData.main_product_category) {
				const result = await this.createCollection(
					storeData.main_product_category,
					`Featured ${storeData.main_product_category} collection`
				);
				collection_id = result.collection_id;
			}

			// 4. Create sample products (you can expand this based on CSV data)
			let products_created = 0;
			if (storeData.main_product_category) {
				// Create a sample product for the category
				await this.createProduct({
					title: `Sample ${storeData.main_product_category}`,
					description: `This is a sample product in the ${storeData.main_product_category} category. Replace with your actual products.`,
					product_type: storeData.main_product_category,
					price: "29.99",
					inventory_quantity: 100,
				});
				products_created = 1;
			}

			return {
				theme_id,
				collection_id,
				products_created,
			};
		} catch (error) {
			console.error("Error generating store:", error);
			throw error;
		}
	}
}
