import { SHOPIFY_CONFIG } from "./constants";
import { ShopifyAdminToken, StoreData } from "@/types";

// Test Admin API connection
export async function testShopifyConnection(
	shop: string,
	adminToken: string
): Promise<boolean> {
	try {
		console.log("Testing Shopify connection for shop:", shop);
		console.log("Token length:", adminToken?.length || 0);

		const response = await fetch(
			`https://${shop}.myshopify.com/admin/api/2023-10/shop.json`,
			{
				headers: {
					"X-Shopify-Access-Token": adminToken,
					"Content-Type": "application/json",
				},
			}
		);

		console.log("Connection test response status:", response.status);
		console.log("Connection test response ok:", response.ok);

		if (!response.ok) {
			const errorText = await response.text();
			console.log("Connection test error response:", errorText);
		}

		return response.ok;
	} catch (error) {
		console.error("Error testing Shopify connection:", error);
		return false;
	}
}

export async function testShopifyPermissions(
	shop: string,
	adminToken: string
): Promise<{
	shop: boolean;
	themes: boolean;
	products: boolean;
	collections: boolean;
}> {
	const results = {
		shop: false,
		themes: false,
		products: false,
		collections: false,
	};

	const baseUrl = `https://${shop}.myshopify.com/admin/api/2023-10`;
	const headers = {
		"X-Shopify-Access-Token": adminToken,
		"Content-Type": "application/json",
	};

	try {
		// Test shop access
		const shopResponse = await fetch(`${baseUrl}/shop.json`, { headers });
		results.shop = shopResponse.ok;
		console.log("Shop API test:", shopResponse.status, shopResponse.ok);

		// Test themes access
		const themesResponse = await fetch(`${baseUrl}/themes.json`, {
			headers,
		});
		results.themes = themesResponse.ok;
		console.log(
			"Themes API test:",
			themesResponse.status,
			themesResponse.ok
		);

		// Test products access
		const productsResponse = await fetch(
			`${baseUrl}/products.json?limit=1`,
			{ headers }
		);
		results.products = productsResponse.ok;
		console.log(
			"Products API test:",
			productsResponse.status,
			productsResponse.ok
		);

		// Test collections access
		const collectionsResponse = await fetch(
			`${baseUrl}/custom_collections.json?limit=1`,
			{ headers }
		);
		results.collections = collectionsResponse.ok;
		console.log(
			"Collections API test:",
			collectionsResponse.status,
			collectionsResponse.ok
		);
	} catch (error) {
		console.error("Error testing permissions:", error);
	}

	return results;
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

		console.log("Making Shopify API request to:", url);
		console.log("Request method:", options.method || "GET");
		console.log("Access token length:", this.accessToken?.length || 0);

		const response = await fetch(url, {
			...options,
			headers: {
				"X-Shopify-Access-Token": this.accessToken,
				"Content-Type": "application/json",
				...options.headers,
			},
		});

		console.log("API response status:", response.status);
		console.log("API response ok:", response.ok);

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Shopify API error response:", errorText);
			console.error(
				"Response headers:",
				Object.fromEntries(response.headers.entries())
			);

			if (response.status === 401 || response.status === 403) {
				throw new Error(
					"Insufficient Shopify permissions. Please reconnect your store with the required permissions."
				);
			}

			if (response.status === 422) {
				// Parse the error response to get more specific information
				try {
					console.log("Full 422 error response:", errorText);
					const errorData = JSON.parse(errorText);
					if (errorData.errors) {
						const errorMessages = Object.entries(errorData.errors)
							.map(
								([field, messages]) =>
									`${field}: ${
										Array.isArray(messages)
											? messages.join(", ")
											: messages
									}`
							)
							.join("; ");
						throw new Error(
							`Shopify validation error: ${errorMessages}`
						);
					}
				} catch (parseError) {
					console.error(
						"Could not parse 422 error response:",
						parseError
					);
				}
				throw new Error(
					`Shopify validation error: ${errorText.substring(
						0,
						500
					)}...`
				);
			}

			throw new Error(
				`Shopify API error: ${response.status} ${response.statusText} - ${errorText}`
			);
		}

		const data = await response.json();
		console.log("API response data:", data);
		return data;
	}

	// Upload and install theme using asset upload method (more reliable than base64)
	async uploadTheme(themeName: string): Promise<{ theme_id: number }> {
		try {
			console.log(
				"Starting theme upload. Theme URL:",
				SHOPIFY_CONFIG.GENESIS_THEME_URL
			);

			// First create an empty theme
			console.log("Creating empty theme...");
			const themeResult = await this.makeRequest<{
				theme: { id: number };
			}>("/themes.json", {
				method: "POST",
				body: JSON.stringify({
					theme: {
						name: themeName,
						role: "unpublished",
					},
				}),
			});

			const themeId = themeResult.theme.id;
			console.log("Created empty theme with ID:", themeId);

			// Download the theme ZIP file
			let themeBuffer: ArrayBuffer;
			if (SHOPIFY_CONFIG.GENESIS_THEME_URL.includes("supabase")) {
				console.log("Downloading theme from Supabase storage...");
				const { supabaseAdmin } = await import("./supabase");

				const url = new URL(SHOPIFY_CONFIG.GENESIS_THEME_URL);
				const pathParts = url.pathname
					.split("/")
					.filter((part) => part.length > 0);
				const bucketIndex =
					pathParts.findIndex((part) => part === "public") + 1;
				const bucketName = pathParts[bucketIndex];
				const filePath = pathParts.slice(bucketIndex + 1).join("/");

				console.log(
					"Supabase bucket:",
					bucketName,
					"File path:",
					filePath
				);

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
				console.log("Downloading theme from external URL...");
				const themeResponse = await fetch(
					SHOPIFY_CONFIG.GENESIS_THEME_URL
				);
				console.log(
					"Theme download response status:",
					themeResponse.status
				);
				if (!themeResponse.ok) {
					throw new Error(
						`Failed to download Genesis theme: ${themeResponse.status} ${themeResponse.statusText}`
					);
				}
				themeBuffer = await themeResponse.arrayBuffer();
			}

			console.log("Theme file size:", themeBuffer.byteLength, "bytes");

			// Extract and upload theme files individually using JSZip
			const JSZip = (await import("jszip")).default;
			const zip = new JSZip();
			const zipContents = await zip.loadAsync(themeBuffer);

			console.log("Extracting theme files...");
			const uploadPromises: Promise<void>[] = [];

			// Upload each file in the ZIP to the theme
			for (const [relativePath, file] of Object.entries(
				zipContents.files
			)) {
				if (!file.dir) {
					// Skip directories
					const content = await file.async("text");
					console.log("Uploading file:", relativePath);

					const uploadPromise = this.uploadThemeAsset(
						themeId,
						relativePath,
						content
					);
					uploadPromises.push(uploadPromise);
				}
			}

			// Wait for all files to upload
			await Promise.all(uploadPromises);
			console.log("All theme files uploaded successfully");

			return { theme_id: themeId };
		} catch (error) {
			console.error("Error uploading theme:", error);
			throw error;
		}
	}

	// Helper method to upload individual theme assets
	private async uploadThemeAsset(
		themeId: number,
		assetKey: string,
		content: string
	): Promise<void> {
		await this.makeRequest(`/themes/${themeId}/assets.json`, {
			method: "PUT",
			body: JSON.stringify({
				asset: {
					key: assetKey,
					value: content,
				},
			}),
		});
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
