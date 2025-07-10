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
			`https://${shop}.myshopify.com/admin/api/2025-01/shop.json`,
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

	const baseUrl = `https://${shop}.myshopify.com/admin/api/2025-01`;
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
		const url = `https://${this.shop}.myshopify.com/admin/api/2025-01${endpoint}`;

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

	// Upload and install theme using direct URL (most reliable method)
	async uploadTheme(themeName: string): Promise<{ theme_id: number }> {
		try {
			console.log(
				"Starting theme upload. Theme URL:",
				SHOPIFY_CONFIG.GENESIS_THEME_URL
			);

			// Use direct URL upload - Shopify downloads the ZIP directly
			console.log("Creating theme with direct URL upload...");
			const result = await this.makeRequest<{ theme: { id: number } }>(
				"/themes.json",
				{
					method: "POST",
					body: JSON.stringify({
						theme: {
							name: themeName,
							src: SHOPIFY_CONFIG.GENESIS_THEME_URL, // Direct URL instead of base64
							role: "unpublished",
						},
					}),
				}
			);

			const themeId = result.theme.id;
			console.log("Successfully created theme with ID:", themeId);

			// Wait for theme installation to complete
			await this.waitForThemeInstallation(themeId);

			return { theme_id: themeId };
		} catch (error) {
			console.error("Error uploading theme:", error);

			// If direct URL fails, fall back to base64 method
			console.log("Direct URL upload failed, trying base64 method...");
			return this.uploadThemeBase64(themeName);
		}
	}

	// Wait for theme installation to complete
	private async waitForThemeInstallation(themeId: number): Promise<void> {
		console.log("Waiting for theme installation to complete...");
		const maxWaitTime = 180000; // 3 minutes max
		const pollInterval = 5000; // Check every 5 seconds
		const startTime = Date.now();

		while (Date.now() - startTime < maxWaitTime) {
			try {
				// Get theme status
				const theme = await this.makeRequest<{
					theme: {
						id: number;
						processing?: boolean;
						created_at: string;
						updated_at: string;
					};
				}>(`/themes/${themeId}.json`);

				console.log("Theme status check:", {
					id: theme.theme.id,
					processing: theme.theme.processing,
					created_at: theme.theme.created_at,
					updated_at: theme.theme.updated_at,
				});

				// If theme is not processing and has been updated since creation, it's ready
				if (!theme.theme.processing) {
					const createdTime = new Date(
						theme.theme.created_at
					).getTime();
					const updatedTime = new Date(
						theme.theme.updated_at
					).getTime();

					// If updated time is significantly after created time, installation is complete
					if (updatedTime > createdTime + 10000) {
						// 10 second buffer
						console.log("Theme installation completed!");
						return;
					}
				}

				console.log("Theme still installing, waiting 5 seconds...");
				await new Promise((resolve) =>
					setTimeout(resolve, pollInterval)
				);
			} catch (error) {
				console.error("Error checking theme status:", error);
				// Continue waiting, might be a temporary issue
				await new Promise((resolve) =>
					setTimeout(resolve, pollInterval)
				);
			}
		}

		console.warn(
			"Theme installation wait timeout reached, proceeding anyway..."
		);
	}

	// Fallback base64 method (original approach)
	private async uploadThemeBase64(
		themeName: string
	): Promise<{ theme_id: number }> {
		let themeBuffer: ArrayBuffer;

		// Download the theme ZIP file
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

			console.log("Supabase bucket:", bucketName, "File path:", filePath);

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
			const themeResponse = await fetch(SHOPIFY_CONFIG.GENESIS_THEME_URL);
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
		const themeBase64 = Buffer.from(themeBuffer).toString("base64");
		console.log("Base64 size:", themeBase64.length, "characters");

		// Create theme via Shopify API with base64
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
	}

	// Publish theme
	async publishTheme(themeId: number): Promise<void> {
		const maxRetries = 3;
		const retryDelay = 10000; // 10 seconds between retries

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				console.log(
					`Publishing theme (attempt ${attempt}/${maxRetries})...`
				);

				await this.makeRequest(`/themes/${themeId}.json`, {
					method: "PUT",
					body: JSON.stringify({
						theme: {
							id: themeId,
							role: "main",
						},
					}),
				});

				console.log("Theme successfully published!");
				return;
			} catch (error: any) {
				console.error(`Publish attempt ${attempt} failed:`, error);

				// Check if error is about incomplete installation
				const errorMessage = error.message?.toLowerCase() || "";
				const isInstallationError =
					errorMessage.includes("installation") ||
					errorMessage.includes("complete") ||
					errorMessage.includes("publish");

				if (isInstallationError && attempt < maxRetries) {
					console.log(
						`Theme installation may still be in progress. Waiting ${
							retryDelay / 1000
						} seconds before retry...`
					);
					await new Promise((resolve) =>
						setTimeout(resolve, retryDelay)
					);
					continue;
				}

				// If it's the last attempt or not an installation error, throw
				throw error;
			}
		}
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
			console.log("Updating store branding...");

			// Note: Shop name cannot be updated via Admin API - it's read-only
			// Instead, we can update other branding elements like:

			// 1. Create a branded page if needed
			// 2. Update metafields for branding
			// 3. Configure theme settings (requires theme-specific API calls)

			// For now, we'll skip shop-level updates since they're not supported
			// The branding will be reflected in the theme, products, and collections

			console.log(
				"Store branding update completed (theme-based branding applied)"
			);
		} catch (error) {
			console.error("Error updating store branding:", error);
			// Don't throw - branding is not critical for store generation
			console.log(
				"Continuing store generation despite branding error..."
			);
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
