import { SHOPIFY_CONFIG } from "./constants";
import { ShopifyAdminToken, StoreData, StoreLocation } from "@/types";

// Test Admin API connection
export async function testShopifyConnection(
	shop: string,
	adminToken: string
): Promise<boolean> {
	try {
		console.log("Testing Shopify connection for shop:", shop);
		console.log("Token length:", adminToken?.length || 0);

		const response = await fetch(
			`https://${shop}.myshopify.com/admin/api/2025-07/shop.json`,
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

	const baseUrl = `https://${shop}.myshopify.com/admin/api/2025-07`;
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
		const url = `https://${this.shop}.myshopify.com/admin/api/2025-07${endpoint}`;

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

	// GraphQL request method for Admin API 2025-07
	private async makeGraphQLRequest<T>(
		query: string,
		variables?: Record<string, any>
	): Promise<T> {
		const url = `https://${this.shop}.myshopify.com/admin/api/2025-07/graphql.json`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"X-Shopify-Access-Token": this.accessToken,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				query,
				variables,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("GraphQL API error response:", errorText);

			if (response.status === 401 || response.status === 403) {
				throw new Error(
					"Insufficient Shopify permissions. Please reconnect your store with the required permissions."
				);
			}

			throw new Error(
				`GraphQL API error: ${response.status} ${response.statusText} - ${errorText}`
			);
		}

		const result = await response.json();

		// Check for GraphQL errors
		if (result.errors && result.errors.length > 0) {
			const errorMessages = result.errors
				.map((error: any) => error.message)
				.join("; ");
			throw new Error(`GraphQL errors: ${errorMessages}`);
		}

		return result.data;
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

	// Set theme logo using GraphQL themeFilesUpsert mutation
	async setThemeLogo(themeId: number, logoUrl: string): Promise<void> {
		try {
			// Download the logo file
			const logoResponse = await fetch(logoUrl);
			if (!logoResponse.ok) {
				throw new Error(`Failed to fetch logo: ${logoResponse.status}`);
			}

			const logoBuffer = await logoResponse.arrayBuffer();
			const logoBase64 = Buffer.from(logoBuffer).toString("base64");

			// Get file extension from URL
			const urlParts = logoUrl.split(".");
			const extension = urlParts[urlParts.length - 1].split("?")[0]; // Remove query params
			const filename = `logo.${extension}`;

			// Use GraphQL themeFilesUpsert mutation to upload logo to theme assets
			const mutation = `
			mutation themeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
				themeFilesUpsert(files: $files, themeId: $themeId) {
					upsertedThemeFiles {
						filename
						size
					}
					userErrors {
						field
						message
					}
				}
			}
		`;

			const variables = {
				themeId: `gid://shopify/OnlineStoreTheme/${themeId}`,
				files: [
					{
						filename: `assets/${filename}`,
						body: {
							type: "BASE64",
							value: logoBase64,
						},
					},
				],
			};

			const result = await this.makeGraphQLRequest<{
				themeFilesUpsert: {
					upsertedThemeFiles: Array<{
						filename: string;
						size: number;
					}>;
					userErrors: Array<{ field: string; message: string }>;
				};
			}>(mutation, variables);

			if (result.themeFilesUpsert.userErrors.length > 0) {
				const errors = result.themeFilesUpsert.userErrors
					.map((error) => error.message)
					.join("; ");
				throw new Error(`Theme file upload errors: ${errors}`);
			}

			console.log(`Logo uploaded successfully as assets/${filename}`);
			console.log(
				`Uploaded files:`,
				result.themeFilesUpsert.upsertedThemeFiles
			);
		} catch (error) {
			console.error("Error setting theme logo:", error);
			throw error;
		}
	}

	// Set contact email in store metafields using GraphQL
	async setContactEmail(email: string): Promise<void> {
		try {
			// First, get the shop ID
			const shopQuery = `
				query {
					shop {
						id
					}
				}
			`;

			const shopResponse = await this.makeGraphQLRequest<{
				shop: {
					id: string;
				};
			}>(shopQuery, {});
			const shopId = shopResponse.shop.id;

			// Then set the metafield with the correct shop ID
			const mutation = `
				mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
					metafieldsSet(metafields: $metafields) {
						metafields {
							id
							namespace
							key
							value
						}
						userErrors {
							field
							message
						}
					}
				}
			`;

			const variables = {
				metafields: [
					{
						ownerId: shopId,
						namespace: "genesis_contact",
						key: "email",
						value: email,
						type: "single_line_text_field",
					},
				],
			};

			const result = await this.makeGraphQLRequest<{
				metafieldsSet: {
					metafields: Array<{
						id: string;
						namespace: string;
						key: string;
						value: string;
					}>;
					userErrors: Array<{ field: string; message: string }>;
				};
			}>(mutation, variables);

			if (result.metafieldsSet.userErrors.length > 0) {
				const errors = result.metafieldsSet.userErrors
					.map((error) => error.message)
					.join("; ");
				throw new Error(`Metafield set errors: ${errors}`);
			}

			console.log("Contact email metafield set successfully");
			console.log("Metafields:", result.metafieldsSet.metafields);
		} catch (error) {
			console.error("Error setting contact email:", error);
			throw error;
		}
	}

	// Import products from CSV files using Shopify Bulk Operations
	async importProductsFromCSV(storeId: string): Promise<number> {
		try {
			// Get CSV uploads for this store
			const { getStoreUploads, supabaseAdmin } = await import(
				"./supabase"
			);
			const csvUploads = await getStoreUploads(storeId, "csv_products");

			if (csvUploads.length === 0) {
				return 0;
			}

			let totalProductsCreated = 0;

			for (const upload of csvUploads) {
				try {
					// Download the CSV file from Supabase storage
					const { data: csvData, error } = await supabaseAdmin.storage
						.from("store-files")
						.download(upload.file_path);

					if (error) {
						console.error(
							`Error downloading CSV ${upload.file_name}:`,
							error
						);
						continue;
					}

					const csvText = await csvData.text();
					const products = this.parseProductCSV(csvText);

					if (products.length === 0) {
						continue;
					}

					// Convert products to JSONL format for bulk import
					const jsonlContent = this.convertProductsToJSONL(products);

					// Use bulk operations to import products
					const importedCount = await this.bulkImportProducts(
						jsonlContent
					);
					totalProductsCreated += importedCount;

					console.log(
						`Successfully imported ${importedCount} products from ${upload.file_name}`
					);
				} catch (fileError) {
					console.error(
						`Error processing CSV file ${upload.file_name}:`,
						fileError
					);
				}
			}

			return totalProductsCreated;
		} catch (error) {
			console.error("Error importing products from CSV:", error);
			return 0; // Don't throw - CSV import is not critical
		}
	}

	// Parse product CSV data with comprehensive field mapping
	private parseProductCSV(csvText: string): Array<{
		title: string;
		description: string;
		vendor?: string;
		product_type?: string;
		product_category?: string;
		price: string;
		compare_at_price?: string;
		inventory_quantity?: number;
		weight?: number;
		requires_shipping?: boolean;
		taxable?: boolean;
		sku?: string;
		barcode?: string;
		images?: string[];
		handle?: string;
		tags?: string[];
		published?: boolean;
		gift_card?: boolean;
		seo_title?: string;
		seo_description?: string;
		options?: Array<{ name: string; values: string[] }>;
		status?: string;
	}> {
		// Proper CSV parsing that handles multi-line quoted fields
		const parseCSV = (csvText: string): string[][] => {
			const rows: string[][] = [];
			let currentRow: string[] = [];
			let currentField = "";
			let inQuotes = false;
			let i = 0;

			while (i < csvText.length) {
				const char = csvText[i];

				if (char === '"') {
					// Check for escaped quotes ("")
					if (i + 1 < csvText.length && csvText[i + 1] === '"') {
						currentField += '"';
						i += 2;
					} else {
						inQuotes = !inQuotes;
						i++;
					}
				} else if (char === "," && !inQuotes) {
					// End of field
					currentRow.push(currentField.trim());
					currentField = "";
					i++;
				} else if ((char === "\n" || char === "\r") && !inQuotes) {
					// End of row (only if not inside quotes)
					if (currentField.trim() || currentRow.length > 0) {
						currentRow.push(currentField.trim());
						if (currentRow.some((field) => field.length > 0)) {
							rows.push(currentRow);
						}
						currentRow = [];
						currentField = "";
					}
					// Skip \r\n combinations
					if (
						char === "\r" &&
						i + 1 < csvText.length &&
						csvText[i + 1] === "\n"
					) {
						i += 2;
					} else {
						i++;
					}
				} else {
					currentField += char;
					i++;
				}
			}

			// Add the last field and row if there's content
			if (currentField.trim() || currentRow.length > 0) {
				currentRow.push(currentField.trim());
				if (currentRow.some((field) => field.length > 0)) {
					rows.push(currentRow);
				}
			}

			return rows;
		};

		const rows = parseCSV(csvText);
		if (rows.length <= 1) {
			return [];
		}

		const headers = rows[0];

		const products = [];

		for (let i = 1; i < rows.length; i++) {
			const values = rows[i];
			if (values.length < headers.length / 2) {
				continue; // Skip malformed rows
			}

			const product: any = {};
			const productOptions: Map<string, Set<string>> = new Map();

			headers.forEach((header, index) => {
				const value = values[index] || "";
				const cleanValue = value.replace(/^"|"$/g, ""); // Remove surrounding quotes
				if (!cleanValue) return;

				const lowerHeader = header.toLowerCase();

				// Map CSV headers to ProductInput fields according to Shopify's latest schema
				switch (lowerHeader) {
					case "handle":
						product.handle = cleanValue;
						break;
					case "title":
					case "name":
					case "product_title":
						product.title = cleanValue;
						break;
					case "body (html)":
					case "description":
					case "body":
					case "body_html":
						product.description = cleanValue;
						break;
					case "vendor":
					case "brand":
						product.vendor = cleanValue;
						break;
					case "product category":
					case "category":
						product.product_category = cleanValue;
						break;
					case "product_type":
					case "type":
						product.product_type = cleanValue;
						break;
					case "tags":
						if (cleanValue) {
							product.tags = cleanValue
								.split(",")
								.map((tag) => tag.trim())
								.filter((tag) => tag);
						}
						break;
					case "published":
						product.published = cleanValue.toLowerCase() === "true";
						break;
					case "gift card":
					case "gift_card":
						product.gift_card = cleanValue.toLowerCase() === "true";
						break;
					case "seo title":
					case "seo_title":
						product.seo_title = cleanValue;
						break;
					case "seo description":
					case "seo_description":
						product.seo_description = cleanValue;
						break;
					case "status":
						product.status = cleanValue.toLowerCase();
						break;

					// Variant-specific fields
					case "variant price":
					case "price":
						if (cleanValue && !isNaN(parseFloat(cleanValue))) {
							product.price = cleanValue;
						}
						break;
					case "variant compare at price":
					case "compare_at_price":
					case "compare_price":
						if (cleanValue && !isNaN(parseFloat(cleanValue))) {
							product.compare_at_price = cleanValue;
						}
						break;
					case "variant grams":
					case "weight":
						if (cleanValue && !isNaN(parseFloat(cleanValue))) {
							product.weight = parseFloat(cleanValue);
						}
						break;
					case "variant requires shipping":
					case "requires_shipping":
						product.requires_shipping =
							cleanValue.toLowerCase() === "true";
						break;
					case "variant taxable":
					case "taxable":
						product.taxable = cleanValue.toLowerCase() === "true";
						break;
					case "variant sku":
					case "sku":
						product.sku = cleanValue;
						break;
					case "variant barcode":
					case "barcode":
						product.barcode = cleanValue;
						break;
					case "variant fulfillment service":
					case "fulfillment_service":
						// This field exists in CSV but not directly mapped to ProductInput
						break;
					case "image src":
					case "image":
					case "images":
						if (cleanValue && cleanValue.includes("http")) {
							if (!product.images) product.images = [];
							product.images.push(cleanValue);
						}
						break;
					case "variant image":
						if (cleanValue && cleanValue.includes("http")) {
							if (!product.images) product.images = [];
							product.images.push(cleanValue);
						}
						break;

					// Product options (Option1 Name, Option1 Value, etc.)
					default:
						if (lowerHeader.match(/^option\d+ name$/)) {
							const optionName = cleanValue;
							if (optionName) {
								productOptions.set(optionName, new Set());
							}
						} else if (lowerHeader.match(/^option\d+ value$/)) {
							// Find the corresponding option name
							const optionNum =
								lowerHeader.match(/^option(\d+) value$/)?.[1];
							if (optionNum) {
								const optionNameHeader = headers.find(
									(h) =>
										h.toLowerCase() ===
										`option${optionNum} name`
								);
								if (optionNameHeader) {
									const optionNameIndex =
										headers.indexOf(optionNameHeader);
									const optionName = values[
										optionNameIndex
									]?.replace(/^"|"$/g, "");
									if (optionName && cleanValue) {
										if (!productOptions.has(optionName)) {
											productOptions.set(
												optionName,
												new Set()
											);
										}
										productOptions
											.get(optionName)
											?.add(cleanValue);
									}
								}
							}
						}
						break;
				}
			});

			// Convert options map to array format
			if (productOptions.size > 0) {
				product.options = Array.from(productOptions.entries()).map(
					([name, values]) => ({
						name,
						values: Array.from(values),
					})
				);
			}

			// Ensure required fields and validate
			if (product.title && product.price) {
				// Set defaults for missing fields
				if (!product.description) {
					product.description = `${product.title} - No description provided`;
				}
				if (product.vendor === undefined) product.vendor = "";
				if (product.product_type === undefined)
					product.product_type = "";
				if (product.requires_shipping === undefined)
					product.requires_shipping = true;
				if (product.taxable === undefined) product.taxable = true;
				if (product.published === undefined) product.published = true;
				if (product.gift_card === undefined) product.gift_card = false;
				if (!product.status) product.status = "active";

				products.push(product);
			}
		}

		return products;
	}

	// Convert products to JSONL format for bulk import
	private convertProductsToJSONL(
		products: Array<{
			title: string;
			description: string;
			vendor?: string;
			product_type?: string;
			product_category?: string;
			price: string;
			compare_at_price?: string;
			inventory_quantity?: number;
			weight?: number;
			requires_shipping?: boolean;
			taxable?: boolean;
			sku?: string;
			barcode?: string;
			images?: string[];
			handle?: string;
			tags?: string[];
			published?: boolean;
			gift_card?: boolean;
			seo_title?: string;
			seo_description?: string;
			options?: Array<{ name: string; values: string[] }>;
			status?: string;
		}>
	): string {
		const jsonlLines = products.map((product) => {
			// Convert product to ProductInput format according to Shopify GraphQL schema
			// Reference: https://shopify.dev/docs/api/admin-graphql/latest/input-objects/ProductInput
			// IMPORTANT: ProductInput does NOT support variants, images, or inventory fields directly
			const productInput: any = {
				title: product.title,
				descriptionHtml: product.description,
				vendor: product.vendor || "",
				productType: product.product_type || "",
				handle: product.handle || undefined,
				tags:
					product.tags && product.tags.length > 0
						? product.tags
						: undefined,
				status:
					product.status?.toUpperCase() === "DRAFT"
						? "DRAFT"
						: "ACTIVE",
				giftCard: product.gift_card || false,

				// SEO fields
				seo:
					product.seo_title || product.seo_description
						? {
								title: product.seo_title || undefined,
								description:
									product.seo_description || undefined,
						  }
						: undefined,

				// Product options (for variants with different sizes, colors, etc.)
				productOptions:
					product.options && product.options.length > 0
						? product.options.map((option) => ({
								name: option.name,
								values: option.values.map((value) => ({
									name: value,
								})),
						  }))
						: undefined,

				// Collections - could be added later based on product_type or tags
				collectionsToJoin: undefined,

				// Metafields for additional data - could include pricing info here
				metafields: [
					// Store the original price as metafield since ProductInput doesn't support pricing
					{
						namespace: "custom",
						key: "original_price",
						value: product.price,
						type: "single_line_text_field",
					},
					// Store compare at price if available
					...(product.compare_at_price
						? [
								{
									namespace: "custom",
									key: "compare_at_price",
									value: product.compare_at_price,
									type: "single_line_text_field",
								},
						  ]
						: []),
					// Store inventory quantity if available
					...(product.inventory_quantity !== undefined
						? [
								{
									namespace: "custom",
									key: "inventory_quantity",
									value: product.inventory_quantity.toString(),
									type: "single_line_text_field",
								},
						  ]
						: []),
					// Store SKU if available
					...(product.sku
						? [
								{
									namespace: "custom",
									key: "sku",
									value: product.sku,
									type: "single_line_text_field",
								},
						  ]
						: []),
					// Store image URLs as metafield for later processing
					...(product.images && product.images.length > 0
						? [
								{
									namespace: "custom",
									key: "image_urls",
									value: product.images.join(","),
									type: "multi_line_text_field",
								},
						  ]
						: []),
					// Store product category for taxonomy mapping
					...(product.product_category
						? [
								{
									namespace: "custom",
									key: "product_category",
									value: product.product_category,
									type: "single_line_text_field",
								},
						  ]
						: []),
				].filter(Boolean),
			};

			// Clean up undefined fields to keep JSONL clean and valid
			const cleanProductInput = JSON.parse(
				JSON.stringify(productInput, (key, value) => {
					return value === undefined ? undefined : value;
				})
			);

			// Return as JSONL format
			return JSON.stringify({ input: cleanProductInput });
		});

		return jsonlLines.join("\n");
	}

	// Fetch and cache Shopify taxonomy categories
	private taxonomyCache: Map<string, string> | null = null;

	private async getTaxonomyCategories(): Promise<Map<string, string>> {
		if (this.taxonomyCache) {
			return this.taxonomyCache;
		}

		try {
			console.log("Fetching Shopify taxonomy categories...");
			const query = `
				query {
					taxonomy {
						categories(first: 250) {
							nodes {
								id
								name
								fullName
								level
								parentId
							}
						}
					}
				}
			`;

			const result = await this.makeGraphQLRequest<{
				taxonomy: {
					categories: {
						nodes: Array<{
							id: string;
							name: string;
							fullName: string;
							level: number;
							parentId?: string;
						}>;
					};
				};
			}>(query);

			// Create a map of category names to IDs for fast lookup
			const categoryMap = new Map<string, string>();

			for (const category of result.taxonomy.categories.nodes) {
				// Map both the name and full name for flexible matching
				categoryMap.set(category.name.toLowerCase(), category.id);
				categoryMap.set(category.fullName.toLowerCase(), category.id);
			}

			this.taxonomyCache = categoryMap;
			console.log(`Cached ${categoryMap.size} taxonomy categories`);
			return categoryMap;
		} catch (error) {
			console.error("Error fetching taxonomy categories:", error);
			// Return empty map if taxonomy fetch fails
			return new Map<string, string>();
		}
	}

	// Find best matching taxonomy category ID for a given category name
	private async findTaxonomyCategoryId(
		categoryName: string
	): Promise<string | null> {
		if (!categoryName) return null;

		const taxonomyMap = await this.getTaxonomyCategories();
		const lowerCategoryName = categoryName.toLowerCase();

		// Try exact match first
		let categoryId = taxonomyMap.get(lowerCategoryName);
		if (categoryId) return categoryId;

		// Try partial matching for common category variations
		for (const [key, value] of Array.from(taxonomyMap.entries())) {
			if (
				key.includes(lowerCategoryName) ||
				lowerCategoryName.includes(key)
			) {
				return value;
			}
		}

		console.warn(`No taxonomy category found for: ${categoryName}`);
		return null;
	}

	// Add taxonomy categories to recently created products
	private async addTaxonomyCategoriesToProducts(): Promise<number> {
		try {
			console.log("Adding taxonomy categories to products...");

			// Query recently created products with category metafields
			const productsQuery = `
				query {
					products(first: 250, sortKey: CREATED_AT, reverse: true) {
						nodes {
							id
							title
							category {
								id
								name
							}
							metafields(first: 15) {
								nodes {
									namespace
									key
									value
								}
							}
						}
					}
				}
			`;

			const result = await this.makeGraphQLRequest<{
				products: {
					nodes: Array<{
						id: string;
						title: string;
						category?: {
							id: string;
							name: string;
						};
						metafields: {
							nodes: Array<{
								namespace: string;
								key: string;
								value: string;
							}>;
						};
					}>;
				};
			}>(productsQuery);

			// Filter products that need taxonomy category updates
			// Simply check if product has a non-empty product_category metafield
			const productsNeedingCategories = result.products.nodes.filter(
				(product) => {
					const categoryMetafield = product.metafields.nodes.find(
						(meta) =>
							meta.namespace === "custom" &&
							meta.key === "product_category"
					);
					return categoryMetafield && categoryMetafield.value.trim();
				}
			);

			if (productsNeedingCategories.length === 0) {
				console.log(
					"No products found that need taxonomy category updates"
				);
				return 0;
			}

			console.log(
				`Processing taxonomy categories for ${productsNeedingCategories.length} products...`
			);

			let updatedCount = 0;

			// Update products with taxonomy categories
			for (const product of productsNeedingCategories) {
				try {
					await this.updateProductTaxonomyCategory(product);
					updatedCount++;
				} catch (error) {
					console.error(
						`Failed to update taxonomy category for product ${product.title}:`,
						error
					);
				}
			}

			console.log(
				`Successfully updated taxonomy categories for ${updatedCount} products`
			);
			return updatedCount;
		} catch (error) {
			console.error(
				"Error adding taxonomy categories to products:",
				error
			);
			return 0;
		}
	}

	// Update a single product's taxonomy category
	private async updateProductTaxonomyCategory(product: {
		id: string;
		title: string;
		metafields: {
			nodes: Array<{ namespace: string; key: string; value: string }>;
		};
	}): Promise<void> {
		// Extract category from metafields
		const categoryMetafield = product.metafields.nodes.find(
			(meta) =>
				meta.namespace === "custom" && meta.key === "product_category"
		);

		if (!categoryMetafield?.value) {
			throw new Error("No product category found in metafields");
		}

		// Find matching taxonomy category ID
		const taxonomyCategoryId = await this.findTaxonomyCategoryId(
			categoryMetafield.value
		);

		if (!taxonomyCategoryId) {
			console.warn(
				`No taxonomy category found for "${categoryMetafield.value}" in product ${product.title}`
			);
			return; // Skip this product instead of throwing error
		}

		// Update the product with taxonomy category
		const mutation = `
			mutation productUpdate($input: ProductInput!) {
				productUpdate(input: $input) {
					product {
						id
						title
						category {
							id
							name
						}
					}
					userErrors {
						field
						message
					}
				}
			}
		`;

		const variables = {
			input: {
				id: product.id,
				category: taxonomyCategoryId,
			},
		};

		const result = await this.makeGraphQLRequest<{
			productUpdate: {
				product: {
					id: string;
					title: string;
					category?: {
						id: string;
						name: string;
					};
				};
				userErrors: Array<{ field: string; message: string }>;
			};
		}>(mutation, variables);

		if (result.productUpdate.userErrors.length > 0) {
			const errors = result.productUpdate.userErrors
				.map((error) => error.message)
				.join("; ");
			throw new Error(`Taxonomy category update errors: ${errors}`);
		}
	}

	// Add variants with pricing to recently created products
	private async addVariantsToProducts(): Promise<number> {
		try {
			console.log("Adding variants and pricing to products...");

			// Query recently created products with metafields
			const productsQuery = `
				query {
					products(first: 250, sortKey: CREATED_AT, reverse: true) {
						nodes {
							id
							title
							variants(first: 1) {
								nodes {
									id
								}
							}
							metafields(first: 10) {
								nodes {
									namespace
									key
									value
								}
							}
						}
					}
				}
			`;

			const result = await this.makeGraphQLRequest<{
				products: {
					nodes: Array<{
						id: string;
						title: string;
						variants: {
							nodes: Array<{ id: string }>;
						};
						metafields: {
							nodes: Array<{
								namespace: string;
								key: string;
								value: string;
							}>;
						};
					}>;
				};
			}>(productsQuery);

			// Filter products that need variant updates (have pricing metafields)
			const productsNeedingUpdates = result.products.nodes.filter(
				(product) => {
					// Check if product has pricing metafields
					const hasPrice = product.metafields.nodes.some(
						(meta) =>
							meta.namespace === "custom" &&
							meta.key === "original_price"
					);
					return hasPrice && product.variants.nodes.length > 0;
				}
			);

			if (productsNeedingUpdates.length === 0) {
				console.log("No products found that need variant updates");
				return 0;
			}

			console.log(
				`Found ${productsNeedingUpdates.length} products that need variant updates`
			);

			let updatedCount = 0;

			// Update variants one by one (productVariantsBulkUpdate works per product)
			for (const product of productsNeedingUpdates) {
				try {
					await this.updateProductVariant(product);
					updatedCount++;
				} catch (error) {
					console.error(
						`Failed to update variants for product ${product.title}:`,
						error
					);
				}
			}

			console.log(
				`Successfully updated variants for ${updatedCount} products`
			);
			return updatedCount;
		} catch (error) {
			console.error("Error adding variants to products:", error);
			return 0;
		}
	}

	// Update a single product's variant with pricing data from metafields using productVariantsBulkUpdate
	private async updateProductVariant(product: {
		id: string;
		title: string;
		variants: { nodes: Array<{ id: string }> };
		metafields: {
			nodes: Array<{ namespace: string; key: string; value: string }>;
		};
	}): Promise<void> {
		// Extract pricing data from metafields
		const metafields = product.metafields.nodes;
		const originalPrice = metafields.find(
			(meta) =>
				meta.namespace === "custom" && meta.key === "original_price"
		)?.value;
		const compareAtPrice = metafields.find(
			(meta) =>
				meta.namespace === "custom" && meta.key === "compare_at_price"
		)?.value;
		const inventoryQuantity = metafields.find(
			(meta) =>
				meta.namespace === "custom" && meta.key === "inventory_quantity"
		)?.value;
		const sku = metafields.find(
			(meta) => meta.namespace === "custom" && meta.key === "sku"
		)?.value;

		if (!originalPrice) {
			throw new Error("No original price found in metafields");
		}

		// Get the default variant ID
		if (product.variants.nodes.length === 0) {
			throw new Error("Product has no variants");
		}
		const variantId = product.variants.nodes[0].id;

		// Prepare variant input for bulk update
		const variantInput: any = {
			id: variantId,
			price: parseFloat(originalPrice).toFixed(2),
		};

		// Add compare at price if available
		if (compareAtPrice) {
			variantInput.compareAtPrice = parseFloat(compareAtPrice).toFixed(2);
		}

		// Add inventoryItem object with tracking enabled and SKU if available
		variantInput.inventoryItem = {
			tracked: true,
			...(sku && { sku: sku }),
		};

		// Note: Skip inventory quantities for now as they require valid location IDs
		// Inventory can be managed separately through the inventory API
		// if (inventoryQuantity) {
		// 	variantInput.inventoryQuantities = [
		// 		{
		// 			availableQuantity: parseInt(inventoryQuantity),
		// 			locationId: "gid://shopify/Location/...", // Requires valid location ID
		// 		},
		// 	];
		// }

		// Update the variant using productVariantsBulkUpdate
		const mutation = `
			mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
				productVariantsBulkUpdate(productId: $productId, variants: $variants) {
					product {
						id
					}
					productVariants {
						id
						price
						compareAtPrice
						sku
						inventoryItem {
							id
							sku
							tracked
						}
					}
					userErrors {
						field
						message
					}
				}
			}
		`;

		const variables = {
			productId: product.id,
			variants: [variantInput],
		};

		const result = await this.makeGraphQLRequest<{
			productVariantsBulkUpdate: {
				product: {
					id: string;
				};
				productVariants: Array<{
					id: string;
					price: string;
					compareAtPrice?: string;
					sku?: string;
					inventoryItem?: {
						id: string;
						sku?: string;
						tracked?: boolean;
					};
				}>;
				userErrors: Array<{ field: string; message: string }>;
			};
		}>(mutation, variables);

		if (result.productVariantsBulkUpdate.userErrors.length > 0) {
			const errors = result.productVariantsBulkUpdate.userErrors
				.map((error) => error.message)
				.join("; ");
			throw new Error(`Variant bulk update errors: ${errors}`);
		}
	}

	// Add images to recently created products
	private async addImagesToProducts(): Promise<number> {
		try {
			console.log("Adding images to products...");

			// Query recently created products with image metafields
			const productsQuery = `
				query {
					products(first: 250, sortKey: CREATED_AT, reverse: true) {
						nodes {
							id
							title
							metafields(first: 10) {
								nodes {
									namespace
									key
									value
								}
							}
						}
					}
				}
			`;

			const result = await this.makeGraphQLRequest<{
				products: {
					nodes: Array<{
						id: string;
						title: string;
						metafields: {
							nodes: Array<{
								namespace: string;
								key: string;
								value: string;
							}>;
						};
					}>;
				};
			}>(productsQuery);

			// Filter products with image URLs
			const productsWithImages = result.products.nodes.filter(
				(product) => {
					return product.metafields.nodes.some(
						(meta) =>
							meta.namespace === "custom" &&
							meta.key === "image_urls"
					);
				}
			);

			if (productsWithImages.length === 0) {
				return 0;
			}

			let updatedCount = 0;

			// Add images to products
			for (const product of productsWithImages) {
				try {
					await this.addImagesToProduct(product);
					updatedCount++;
				} catch (error) {
					console.error(
						`Failed to add images to product ${product.title}:`,
						error
					);
				}
			}

			console.log(
				`Successfully added images to ${updatedCount} products`
			);
			return updatedCount;
		} catch (error) {
			console.error("Error adding images to products:", error);
			return 0;
		}
	}

	// Add images to a single product
	private async addImagesToProduct(product: {
		id: string;
		title: string;
		metafields: {
			nodes: Array<{ namespace: string; key: string; value: string }>;
		};
	}): Promise<void> {
		// Extract image URLs from metafields
		const imageUrlsMetafield = product.metafields.nodes.find(
			(meta) => meta.namespace === "custom" && meta.key === "image_urls"
		);

		if (!imageUrlsMetafield?.value) {
			throw new Error("No image URLs found in metafields");
		}

		const imageUrls = imageUrlsMetafield.value
			.split(",")
			.map((url) => url.trim())
			.filter((url) => url);

		if (imageUrls.length === 0) {
			return;
		}

		// Create media inputs for the product
		const mediaInputs = imageUrls.map((url) => ({
			originalSource: url,
			alt: `${product.title} image`,
			mediaContentType: "IMAGE",
		}));

		// Use productUpdate mutation to add media
		const mutation = `
			mutation productUpdate($input: ProductInput!, $media: [CreateMediaInput!]) {
				productUpdate(input: $input, media: $media) {
					product {
						id
						media(first: 10) {
							nodes {
								... on MediaImage {
									id
									image {
										url
									}
								}
							}
						}
					}
					userErrors {
						field
						message
					}
				}
			}
		`;

		const variables = {
			input: {
				id: product.id,
			},
			media: mediaInputs,
		};

		const result = await this.makeGraphQLRequest<{
			productUpdate: {
				product: {
					id: string;
					media: {
						nodes: Array<{
							id: string;
							image?: { url: string };
						}>;
					};
				};
				userErrors: Array<{ field: string; message: string }>;
			};
		}>(mutation, variables);

		if (result.productUpdate.userErrors.length > 0) {
			const errors = result.productUpdate.userErrors
				.map((error) => error.message)
				.join("; ");
			throw new Error(`Image update errors: ${errors}`);
		}
	}

	// Bulk import products using Shopify Bulk Operations
	private async bulkImportProducts(jsonlContent: string): Promise<number> {
		try {
			console.log("Starting product import...");

			// Create staged upload
			const stagedUpload = await this.createStagedUpload();

			// Upload JSONL file
			await this.uploadJSONLFile(
				stagedUpload.url,
				stagedUpload.parameters,
				jsonlContent
			);

			// Extract key and start bulk operation
			const keyParameter = stagedUpload.parameters.find(
				(param) => param.name === "key"
			);

			if (!keyParameter?.value) {
				throw new Error("Invalid staged upload key parameter");
			}

			const bulkOperation = await this.startBulkProductImport(
				keyParameter.value
			);

			// Wait for completion and return count
			const completedOperation =
				await this.waitForBulkOperationCompletion(bulkOperation.id);

			const baseProductCount = completedOperation.objectCount || 0;

			if (baseProductCount > 0) {
				// Add variants with pricing
				try {
					await this.addVariantsToProducts();
				} catch (error) {
					console.error("Failed to add variants:", error);
				}

				// Add images to products
				try {
					await this.addImagesToProducts();
				} catch (error) {
					console.error("Failed to add images:", error);
				}

				// Add taxonomy categories to products
				try {
					await this.addTaxonomyCategoriesToProducts();
				} catch (error) {
					console.error("Failed to add taxonomy categories:", error);
				}

				// Publish products to Online Store sales channel
				try {
					await this.publishProductsToOnlineStore();
				} catch (error) {
					console.error(
						"Failed to publish products to Online Store:",
						error
					);
				}
			}

			return baseProductCount;
		} catch (error) {
			console.error(
				"Product import failed:",
				error instanceof Error ? error.message : String(error)
			);
			throw error;
		}
	}

	// Get the Online Store publication ID
	private async getOnlineStorePublicationId(): Promise<string> {
		const query = `
			query {
				publications(first: 10) {
					nodes {
						id
						name
					}
				}
			}
		`;

		const result = await this.makeGraphQLRequest<{
			publications: {
				nodes: Array<{
					id: string;
					name: string;
				}>;
			};
		}>(query);

		const onlineStorePublication = result.publications.nodes.find(
			(publication) => publication.name === "Online Store"
		);

		if (!onlineStorePublication) {
			throw new Error("Online Store publication not found");
		}

		return onlineStorePublication.id;
	}

	// Publish recently imported products to Online Store sales channel
	private async publishProductsToOnlineStore(): Promise<number> {
		try {
			console.log("Publishing products to Online Store sales channel...");

			// Get Online Store publication ID
			const publicationId = await this.getOnlineStorePublicationId();

			// Query recently created products
			const productsQuery = `
				query {
					products(first: 250, sortKey: CREATED_AT, reverse: true) {
						nodes {
							id
							title
						}
					}
				}
			`;

			const result = await this.makeGraphQLRequest<{
				products: {
					nodes: Array<{
						id: string;
						title: string;
					}>;
				};
			}>(productsQuery);

			// Filter products created in the last 10 minutes (recently imported)
			const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
			const recentProducts = result.products.nodes.filter((product) => {
				// Extract timestamp from Shopify GID
				const productId = product.id.split("/").pop();
				if (!productId) return false;

				// Shopify product IDs are roughly chronological, but we'll publish all recent products to be safe
				return true; // For now, publish all fetched products since we're getting recently created ones
			});

			if (recentProducts.length === 0) {
				console.log("No recent products found to publish");
				return 0;
			}

			console.log(
				`Found ${recentProducts.length} products to publish to Online Store`
			);

			let publishedCount = 0;

			// Publish each product to Online Store
			for (const product of recentProducts) {
				try {
					await this.publishProductToOnlineStore(
						product.id,
						publicationId
					);
					publishedCount++;
				} catch (error) {
					console.error(
						`Failed to publish product ${product.title} to Online Store:`,
						error
					);
				}
			}

			console.log(
				`Successfully published ${publishedCount} products to Online Store`
			);
			return publishedCount;
		} catch (error) {
			console.error("Error publishing products to Online Store:", error);
			return 0;
		}
	}

	// Publish a single product to Online Store sales channel
	private async publishProductToOnlineStore(
		productId: string,
		publicationId: string
	): Promise<void> {
		const mutation = `
			mutation publishablePublish($id: ID!, $input: [PublicationInput!]!, $publicationId: ID!) {
				publishablePublish(id: $id, input: $input) {
					publishable {
						... on Product {
							id
							title
							publishedOnPublication(publicationId: $publicationId)
						}
					}
					userErrors {
						field
						message
					}
				}
			}
		`;

		const variables = {
			id: productId,
			input: [
				{
					publicationId: publicationId,
				},
			],
			publicationId: publicationId, // For the fragment query
		};

		const result = await this.makeGraphQLRequest<{
			publishablePublish: {
				publishable: {
					id: string;
					title: string;
					publishedOnPublication: boolean;
				};
				userErrors: Array<{ field: string; message: string }>;
			};
		}>(mutation, variables);

		if (result.publishablePublish.userErrors.length > 0) {
			const errors = result.publishablePublish.userErrors
				.map((error) => error.message)
				.join("; ");
			throw new Error(`Product publish errors: ${errors}`);
		}
	}

	// Create staged upload for JSONL file
	private async createStagedUpload(): Promise<{
		url: string;
		parameters: Array<{ name: string; value: string }>;
		resourceUrl: string;
	}> {
		const mutation = `
			mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
				stagedUploadsCreate(input: $input) {
					stagedTargets {
						url
						parameters {
							name
							value
						}
						resourceUrl
					}
					userErrors {
						field
						message
					}
				}
			}
		`;

		const variables = {
			input: [
				{
					filename: "products.jsonl",
					mimeType: "text/jsonl",
					resource: "BULK_MUTATION_VARIABLES",
					httpMethod: "POST",
				},
			],
		};

		const result = await this.makeGraphQLRequest<{
			stagedUploadsCreate: {
				stagedTargets: Array<{
					url: string;
					parameters: Array<{ name: string; value: string }>;
					resourceUrl: string;
				}>;
				userErrors: Array<{ field: string; message: string }>;
			};
		}>(mutation, variables);

		if (result.stagedUploadsCreate.userErrors.length > 0) {
			const errors = result.stagedUploadsCreate.userErrors
				.map((error) => error.message)
				.join("; ");
			throw new Error(`Staged upload creation errors: ${errors}`);
		}

		if (result.stagedUploadsCreate.stagedTargets.length === 0) {
			throw new Error("No staged upload was created");
		}

		return result.stagedUploadsCreate.stagedTargets[0];
	}

	// Upload JSONL file to staged upload URL
	private async uploadJSONLFile(
		url: string,
		parameters: Array<{ name: string; value: string }>,
		jsonlContent: string
	): Promise<void> {
		const formData = new FormData();

		// Add parameters to form data
		parameters.forEach((param) => {
			formData.append(param.name, param.value);
		});

		// Add the file content
		const blob = new Blob([jsonlContent], { type: "text/jsonl" });
		formData.append("file", blob, "products.jsonl");

		const response = await fetch(url, {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Failed to upload JSONL file: ${response.status} ${response.statusText} - ${errorText}`
			);
		}
	}

	// Start bulk product import operation
	private async startBulkProductImport(stagedUploadPath: string): Promise<{
		id: string;
		status: string;
	}> {
		const mutation = `
			mutation bulkOperationRunMutation($mutation: String!, $stagedUploadPath: String!) {
				bulkOperationRunMutation(mutation: $mutation, stagedUploadPath: $stagedUploadPath) {
					bulkOperation {
						id
						status
					}
					userErrors {
						field
						message
					}
				}
			}
		`;

		const variables = {
			mutation: `
				mutation productCreate($input: ProductInput!) {
					productCreate(input: $input) {
						product {
							id
							title
						}
						userErrors {
							field
							message
						}
					}
				}
			`,
			stagedUploadPath: stagedUploadPath,
		};

		const result = await this.makeGraphQLRequest<{
			bulkOperationRunMutation: {
				bulkOperation: {
					id: string;
					status: string;
				};
				userErrors: Array<{ field: string; message: string }>;
			};
		}>(mutation, variables);

		if (result.bulkOperationRunMutation.userErrors.length > 0) {
			const errors = result.bulkOperationRunMutation.userErrors
				.map((error) => error.message)
				.join("; ");
			throw new Error(`Bulk operation start errors: ${errors}`);
		}

		return result.bulkOperationRunMutation.bulkOperation;
	}

	// Wait for bulk operation completion
	private async waitForBulkOperationCompletion(
		bulkOperationId: string
	): Promise<{
		status: string;
		objectCount: number;
	}> {
		const maxAttempts = 60; // Wait up to 10 minutes (60 * 10 seconds)
		let attempts = 0;

		while (attempts < maxAttempts) {
			const query = `
				query($id: ID!) {
					node(id: $id) {
						... on BulkOperation {
							id
							status
							errorCode
							objectCount
							createdAt
							completedAt
							url
							partialDataUrl
						}
					}
				}
			`;

			const result = await this.makeGraphQLRequest<{
				node: {
					id: string;
					status: string;
					errorCode?: string;
					objectCount: number;
					createdAt: string;
					completedAt?: string;
					url?: string;
					partialDataUrl?: string;
				} | null;
			}>(query, { id: bulkOperationId });

			if (!result.node) {
				throw new Error(`Bulk operation not found: ${bulkOperationId}`);
			}

			const operation = result.node;

			if (operation.status === "COMPLETED") {
				// Query Shopify directly for accurate product count
				let actualProductCount = 0;

				try {
					const productsQuery = `
						query {
							products(first: 250, sortKey: CREATED_AT, reverse: true) {
								nodes {
									id
									createdAt
								}
							}
						}
					`;

					const productsResult = await this.makeGraphQLRequest<{
						products: {
							nodes: Array<{ id: string; createdAt: string }>;
						};
					}>(productsQuery);

					// Count products created in the last 10 minutes
					const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
					const recentProducts = productsResult.products.nodes.filter(
						(product) => new Date(product.createdAt) > tenMinutesAgo
					);

					actualProductCount = recentProducts.length;
					console.log(
						`Successfully imported ${actualProductCount} products`
					);
				} catch (countError) {
					console.error(
						"Could not count imported products:",
						countError
					);
					actualProductCount = 0;
				}

				return {
					status: operation.status,
					objectCount: actualProductCount,
				};
			}

			if (
				operation.status === "FAILED" ||
				operation.status === "CANCELED"
			) {
				throw new Error(
					`Bulk operation ${operation.status.toLowerCase()}: ${
						operation.errorCode || "Unknown error"
					}`
				);
			}

			// Wait 10 seconds before checking again
			await new Promise((resolve) => setTimeout(resolve, 10000));
			attempts++;
		}

		throw new Error("Bulk operation timed out after 10 minutes");
	}

	// Update store branding
	async updateStoreBranding(
		storeData: StoreData,
		storeId: string,
		themeId: number
	): Promise<{
		logo_uploaded: boolean;
		contact_email_set: boolean;
	}> {
		let logo_uploaded = false;
		let contact_email_set = false;

		try {
			console.log("Updating store branding...");

			// 1. Upload logo to theme settings if available
			if (storeData.logo_url) {
				try {
					await this.setThemeLogo(themeId, storeData.logo_url);
					logo_uploaded = true;
					console.log("Logo successfully uploaded to theme");
				} catch (logoError) {
					console.error("Error uploading logo to theme:", logoError);
				}
			}

			// 2. Set contact email in theme settings/metafields
			if (storeData.contact_email) {
				try {
					await this.setContactEmail(storeData.contact_email);
					contact_email_set = true;
					console.log("Contact email successfully set");
				} catch (emailError) {
					console.error("Error setting contact email:", emailError);
				}
			}

			// 3. Set store branding via metafields (accessible in theme)
			if (storeData.brand_name) {
				try {
					await this.makeRequest("/metafields.json", {
						method: "POST",
						body: JSON.stringify({
							metafield: {
								namespace: "genesis_branding",
								key: "brand_name",
								value: storeData.brand_name,
								type: "single_line_text_field",
								description:
									"Brand name set by Genesis Project",
							},
						}),
					});
					console.log("Brand name metafield created");
				} catch (metafieldError) {
					console.log(
						"Brand name metafield creation skipped (may already exist)"
					);
				}
			}

			if (storeData.description) {
				try {
					await this.makeRequest("/metafields.json", {
						method: "POST",
						body: JSON.stringify({
							metafield: {
								namespace: "genesis_branding",
								key: "brand_description",
								value: storeData.description,
								type: "multi_line_text_field",
								description:
									"Brand description set by Genesis Project",
							},
						}),
					});
					console.log("Brand description metafield created");
				} catch (metafieldError) {
					console.log(
						"Brand description metafield creation skipped (may already exist)"
					);
				}
			}

			console.log("Store branding update completed");
		} catch (error) {
			console.error("Error updating store branding:", error);
			// Don't throw - branding is not critical for store generation
			console.log(
				"Continuing store generation despite branding error..."
			);
		}

		return {
			logo_uploaded,
			contact_email_set,
		};
	}

	// Location management methods
	async getLocations(): Promise<
		Array<{
			id: string;
			name: string;
			address: {
				address1?: string;
				city?: string;
				country?: string;
				phone?: string;
			};
		}>
	> {
		try {
			const query = `
				query {
					locations(first: 250) {
						nodes {
							id
							name
							address {
								address1
								city
								country
								phone
							}
						}
					}
				}
			`;

			const result = await this.makeGraphQLRequest<{
				locations: {
					nodes: Array<{
						id: string;
						name: string;
						address: {
							address1?: string;
							city?: string;
							country?: string;
							phone?: string;
						};
					}>;
				};
			}>(query);

			return result.locations.nodes;
		} catch (error) {
			console.error("Error fetching locations:", error);
			throw error;
		}
	}

	async deleteLocation(locationId: string): Promise<void> {
		try {
			// First, deactivate the location
			await this.deactivateLocation(locationId);

			// Then delete the location
			const mutation = `
				mutation locationDelete($locationId: ID!) {
					locationDelete(locationId: $locationId) {
						deletedLocationId
						locationDeleteUserErrors {
							field
							message
						}
					}
				}
			`;

			const result = await this.makeGraphQLRequest<{
				locationDelete: {
					deletedLocationId?: string;
					locationDeleteUserErrors: Array<{
						field: string;
						message: string;
					}>;
				};
			}>(mutation, { locationId });

			if (result.locationDelete.locationDeleteUserErrors.length > 0) {
				const errorMessage = `Failed to delete location: ${result.locationDelete.locationDeleteUserErrors
					.map((error) => error.message)
					.join(", ")}`;
				console.warn(errorMessage);
				return; // Don't throw error, just warn and continue
			}

			console.log(`Location ${locationId} deleted successfully`);
		} catch (error) {
			console.warn("Warning: Could not delete location:", error);
			// Don't throw error, just warn and continue
		}
	}

	async deactivateLocation(locationId: string): Promise<void> {
		try {
			const mutation = `
				mutation locationDeactivate($locationId: ID!) {
					locationDeactivate(locationId: $locationId) {
						location {
							id
							name
							isActive
						}
						locationDeactivateUserErrors {
							field
							message
						}
					}
				}
			`;

			const result = await this.makeGraphQLRequest<{
				locationDeactivate: {
					location?: {
						id: string;
						name: string;
						isActive: boolean;
					};
					locationDeactivateUserErrors: Array<{
						field: string;
						message: string;
					}>;
				};
			}>(mutation, { locationId });

			if (
				result.locationDeactivate.locationDeactivateUserErrors.length >
				0
			) {
				const errorMessage = `Failed to deactivate location: ${result.locationDeactivate.locationDeactivateUserErrors
					.map((error) => error.message)
					.join(", ")}`;
				console.warn(errorMessage);
				return; // Don't throw error, just warn and continue
			}

			console.log(`Location ${locationId} deactivated successfully`);
		} catch (error) {
			console.warn("Warning: Could not deactivate location:", error);
			// Don't throw error, just warn and continue
		}
	}

	async addLocation(location: StoreLocation): Promise<{
		id: string;
		name: string;
	} | null> {
		try {
			const mutation = `
				mutation locationAdd($input: LocationAddInput!) {
					locationAdd(input: $input) {
						location {
							id
							name
						}
						userErrors {
							field
							message
						}
					}
				}
			`;

			const input = {
				name: location.name,
				address: {
					address1: location.address || "",
					city: location.city || "",
					countryCode: location.country || "US",
					phone: location.phone || "",
				},
			};

			const result = await this.makeGraphQLRequest<{
				locationAdd: {
					location?: {
						id: string;
						name: string;
					};
					userErrors: Array<{ field: string; message: string }>;
				};
			}>(mutation, { input });

			if (result.locationAdd.userErrors.length > 0) {
				const errorMessage = `Failed to add location: ${result.locationAdd.userErrors
					.map((error) => error.message)
					.join(", ")}`;
				console.warn(errorMessage);
				return null; // Don't throw error, just warn and return null
			}

			if (!result.locationAdd.location) {
				console.warn("Warning: Location was not created");
				return null; // Don't throw error, just warn and return null
			}

			console.log(
				`Location ${result.locationAdd.location.name} added successfully`
			);
			return result.locationAdd.location;
		} catch (error) {
			console.warn("Warning: Could not add location:", error);
			return null; // Don't throw error, just warn and return null
		}
	}

	async manageLocations(locations: StoreLocation[]): Promise<
		Array<{
			id: string;
			name: string;
			originalLocation: StoreLocation;
		}>
	> {
		try {
			console.log("Managing store locations...");

			// 1. Get existing locations
			const existingLocations = await this.getLocations();
			console.log(`Found ${existingLocations.length} existing locations`);

			// 2. Delete all existing locations (except the primary one which might be protected)
			// COMMENTED OUT: No longer deleting existing locations
			// for (const location of existingLocations) {
			// 	try {
			// 		await this.deleteLocation(location.id);
			// 	} catch (error) {
			// 		console.log(
			// 			`Could not delete location ${location.name}:`,
			// 			error
			// 		);
			// 		// Continue with other locations
			// 	}
			// }

			// 3. Add new locations
			const createdLocations = [];
			for (const location of locations) {
				const createdLocation = await this.addLocation(location);
				if (createdLocation) {
					createdLocations.push({
						...createdLocation,
						originalLocation: location,
					});
				} else {
					console.warn(
						`Failed to create location ${location.name} - skipping`
					);
					// Continue with other locations
				}
			}

			console.log(
				`Successfully created ${createdLocations.length} locations`
			);
			return createdLocations;
		} catch (error) {
			console.error("Error managing locations:", error);
			throw error;
		}
	}

	// Inventory management methods
	async setInventoryQuantities(
		inventoryItems: Array<{
			inventoryItemId: string;
			locationId: string;
			quantity: number;
		}>
	): Promise<void> {
		try {
			console.log(
				`Activating and setting inventory quantities for ${inventoryItems.length} items`
			);

			// Since we're generating stores from scratch, we need to activate (stock)
			// each inventory item at each location before we can set quantities
			let successCount = 0;
			const errors: string[] = [];

			// Process inventory items sequentially
			for (const item of inventoryItems) {
				try {
					await this.activateInventoryItem(
						item.inventoryItemId,
						item.locationId,
						item.quantity
					);
					successCount++;
				} catch (error) {
					const errorMessage = `Failed to activate inventory item ${item.inventoryItemId} at location ${item.locationId}: ${error}`;
					console.error(errorMessage);
					errors.push(errorMessage);
				}
			}

			console.log(
				`Successfully activated ${successCount} inventory items`
			);

			if (errors.length > 0) {
				console.warn(
					`${errors.length} inventory items failed to activate`
				);
				// Don't throw error if some items succeeded - log warnings instead
				if (successCount === 0) {
					throw new Error(
						`All inventory activations failed: ${errors.join("; ")}`
					);
				}
			}
		} catch (error) {
			console.error("Error setting inventory quantities:", error);
			throw error;
		}
	}

	private async activateInventoryItem(
		inventoryItemId: string,
		locationId: string,
		availableQuantity: number
	): Promise<void> {
		const mutation = `
			mutation inventoryActivate($inventoryItemId: ID!, $locationId: ID!, $available: Int) {
				inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId, available: $available) {
					inventoryLevel {
						id
						quantities(names: ["available"]) {
							name
							quantity
						}
						item {
							id
						}
						location {
							id
						}
					}
					userErrors {
						field
						message
					}
				}
			}
		`;

		const result = await this.makeGraphQLRequest<{
			inventoryActivate: {
				inventoryLevel?: {
					id: string;
					quantities: Array<{
						name: string;
						quantity: number;
					}>;
					item: {
						id: string;
					};
					location: {
						id: string;
					};
				};
				userErrors: Array<{ field: string; message: string }>;
			};
		}>(mutation, {
			inventoryItemId,
			locationId,
			available: availableQuantity,
		});

		if (result.inventoryActivate.userErrors.length > 0) {
			throw new Error(
				`Failed to activate inventory: ${result.inventoryActivate.userErrors
					.map((error) => error.message)
					.join(", ")}`
			);
		}

		// Inventory item activated successfully (no individual logging to reduce noise)
	}

	async getProductInventoryItems(): Promise<
		Array<{
			productId: string;
			productHandle: string;
			variantId: string;
			inventoryItemId: string;
			sku?: string;
		}>
	> {
		try {
			const query = `
				query {
					products(first: 250) {
						nodes {
							id
							handle
							variants(first: 250) {
								nodes {
									id
									sku
									inventoryItem {
										id
									}
								}
							}
						}
					}
				}
			`;

			const result = await this.makeGraphQLRequest<{
				products: {
					nodes: Array<{
						id: string;
						handle: string;
						variants: {
							nodes: Array<{
								id: string;
								sku?: string;
								inventoryItem: {
									id: string;
								};
							}>;
						};
					}>;
				};
			}>(query);

			const inventoryItems = [];
			for (const product of result.products.nodes) {
				for (const variant of product.variants.nodes) {
					inventoryItems.push({
						productId: product.id,
						productHandle: product.handle,
						variantId: variant.id,
						inventoryItemId: variant.inventoryItem.id,
						sku: variant.sku,
					});
				}
			}

			return inventoryItems;
		} catch (error) {
			console.error("Error fetching product inventory items:", error);
			throw error;
		}
	}

	// CSV parsing methods
	private parseInventoryCSV(csvText: string): Array<{
		handle: string;
		title: string;
		optionName?: string;
		optionValue?: string;
		sku?: string;
		location: string;
		available: number;
	}> {
		const lines = csvText.trim().split("\n");
		if (lines.length < 2) {
			throw new Error(
				"CSV must have at least a header row and one data row"
			);
		}

		const headers = lines[0]
			.split(",")
			.map((h) => h.trim().replace(/"/g, ""));
		const data = [];

		for (let i = 1; i < lines.length; i++) {
			const values = this.parseCSVLine(lines[i]);
			if (values.length !== headers.length) {
				console.warn(
					`Row ${i + 1} has ${values.length} values but expected ${
						headers.length
					}`
				);
				continue;
			}

			const row: any = {};
			headers.forEach((header, index) => {
				row[header] = values[index];
			});

			// Map the CSV headers to our expected format
			const inventoryItem = {
				handle: row["Handle"] || "",
				title: row["Title"] || "",
				optionName: row["Option1 Name"] || row["Option Name"],
				optionValue: row["Option1 Value"] || row["Option Value"],
				sku: row["SKU"] || "",
				location: row["Location"] || "",
				available: parseInt(row["Available"] || "0", 10),
			};

			// Only include rows with valid data
			if (
				inventoryItem.handle &&
				inventoryItem.location &&
				!isNaN(inventoryItem.available)
			) {
				data.push(inventoryItem);
			}
		}

		return data;
	}

	private parseCSVLine(line: string): string[] {
		const values = [];
		let current = "";
		let inQuotes = false;

		for (let i = 0; i < line.length; i++) {
			const char = line[i];

			if (char === '"') {
				inQuotes = !inQuotes;
			} else if (char === "," && !inQuotes) {
				values.push(current.trim());
				current = "";
			} else {
				current += char;
			}
		}

		values.push(current.trim());
		return values;
	}

	async processInventoryCSV(
		storeId: string,
		shopifyLocations: Array<{
			id: string;
			name: string;
			originalLocation: StoreLocation;
		}>
	): Promise<{
		inventoryUpdated: number;
		errors: string[];
	}> {
		try {
			console.log("Processing inventory CSV...");

			// 1. Get inventory CSV file
			const inventoryUploads = await this.getStoreUploads(
				storeId,
				"csv_inventory"
			);
			if (inventoryUploads.length === 0) {
				console.log(
					"No inventory CSV found, skipping inventory update"
				);
				return { inventoryUpdated: 0, errors: [] };
			}

			const inventoryUpload = inventoryUploads[0]; // Use the most recent upload
			const csvText = await this.downloadFile(inventoryUpload.file_path);

			// 2. Parse CSV
			const inventoryData = this.parseInventoryCSV(csvText);
			console.log(
				`Parsed ${inventoryData.length} inventory items from CSV`
			);

			// 3. Get current product inventory items from Shopify
			const productInventoryItems = await this.getProductInventoryItems();

			// 4. Map CSV data to Shopify inventory items
			const inventoryUpdates = [];
			const errors = [];

			for (const csvItem of inventoryData) {
				// Find matching Shopify location
				const shopifyLocation = shopifyLocations.find(
					(loc) =>
						loc.originalLocation.name.toLowerCase() ===
						csvItem.location.toLowerCase()
				);

				if (!shopifyLocation) {
					errors.push(
						`Location "${csvItem.location}" not found in Shopify locations`
					);
					continue;
				}

				// Find matching product by handle and SKU
				const productItem = productInventoryItems.find(
					(item) =>
						item.productHandle === csvItem.handle &&
						(!csvItem.sku || item.sku === csvItem.sku)
				);

				if (!productItem) {
					errors.push(
						`Product with handle "${csvItem.handle}" ${
							csvItem.sku ? `and SKU "${csvItem.sku}"` : ""
						} not found`
					);
					continue;
				}

				inventoryUpdates.push({
					inventoryItemId: productItem.inventoryItemId,
					locationId: shopifyLocation.id,
					quantity: csvItem.available,
				});
			}

			// 5. Update inventory quantities in batches
			const batchSize = 100; // Shopify API limit
			let totalUpdated = 0;

			for (let i = 0; i < inventoryUpdates.length; i += batchSize) {
				const batch = inventoryUpdates.slice(i, i + batchSize);
				try {
					await this.setInventoryQuantities(batch);
					totalUpdated += batch.length;
				} catch (error) {
					errors.push(
						`Failed to update inventory batch ${
							Math.floor(i / batchSize) + 1
						}: ${error}`
					);
				}
			}

			console.log(`Successfully updated ${totalUpdated} inventory items`);
			return { inventoryUpdated: totalUpdated, errors };
		} catch (error) {
			console.error("Error processing inventory CSV:", error);
			throw error;
		}
	}

	// Helper method to get store uploads
	private async getStoreUploads(
		storeId: string,
		fileType: string
	): Promise<
		Array<{
			file_path: string;
			file_name: string;
			uploaded_at: string;
		}>
	> {
		// Import the getStoreUploads function from supabase
		const { getStoreUploads } = await import("./supabase");
		const uploads = await getStoreUploads(storeId, fileType);
		return uploads.map((upload) => ({
			file_path: upload.file_path,
			file_name: upload.file_name,
			uploaded_at: upload.uploaded_at,
		}));
	}

	// Helper method to download file content
	private async downloadFile(filePath: string): Promise<string> {
		// Import supabase client
		const { supabase } = await import("./supabase");

		const { data, error } = await supabase.storage
			.from("store-files")
			.download(filePath);

		if (error) {
			throw new Error(`Failed to download file: ${error.message}`);
		}

		return await data.text();
	}

	// Generate store foundation (theme, locations, branding)
	async generateStoreFoundation(
		storeData: StoreData,
		storeId: string
	): Promise<{
		theme_id: number;
		locations_created: number;
		logo_uploaded: boolean;
		contact_email_set: boolean;
	}> {
		try {
			console.log("Starting store foundation generation...");

			// 1. Upload and publish theme
			const themeName = `Genesis - ${storeData.brand_name || "Store"}`;
			const { theme_id } = await this.uploadTheme(themeName);
			await this.publishTheme(theme_id);

			// 2. Manage store locations
			const { getStoreLocations } = await import("./supabase");
			const storeLocations = await getStoreLocations(storeId);
			console.log(
				`Found ${storeLocations.length} locations to create in Shopify`
			);

			let locations_created = 0;

			if (storeLocations.length > 0) {
				const shopifyLocations = await this.manageLocations(
					storeLocations
				);
				locations_created = shopifyLocations.length;
				console.log(
					`Successfully created ${locations_created} locations in Shopify`
				);
			}

			// 3. Update store branding (including logo and contact email)
			const brandingResult = await this.updateStoreBranding(
				storeData,
				storeId,
				theme_id
			);

			console.log("Store foundation generation completed");

			return {
				theme_id,
				locations_created,
				logo_uploaded: brandingResult.logo_uploaded,
				contact_email_set: brandingResult.contact_email_set,
			};
		} catch (error) {
			console.error("Error generating store foundation:", error);
			throw error;
		}
	}

	// Generate products (import, variants, images, taxonomy)
	async generateStoreProducts(storeId: string): Promise<{
		products_created: number;
		variants_updated: number;
		images_added: number;
		taxonomy_updated: number;
	}> {
		try {
			console.log("Starting product generation...");

			// 1. Import products from CSV files
			const products_created = await this.importProductsFromCSV(storeId);

			let variants_updated = 0;
			let images_added = 0;
			let taxonomy_updated = 0;

			if (products_created > 0) {
				// 2. Add variants with pricing
				try {
					variants_updated = await this.addVariantsToProducts();
				} catch (error) {
					console.error("Failed to add variants:", error);
				}

				// 3. Add images to products
				try {
					images_added = await this.addImagesToProducts();
				} catch (error) {
					console.error("Failed to add images:", error);
				}

				// 4. Add taxonomy categories to products
				try {
					taxonomy_updated =
						await this.addTaxonomyCategoriesToProducts();
				} catch (error) {
					console.error("Failed to add taxonomy categories:", error);
				}
			}

			console.log("Product generation completed");

			return {
				products_created,
				variants_updated,
				images_added,
				taxonomy_updated,
			};
		} catch (error) {
			console.error("Error generating products:", error);
			throw error;
		}
	}

	// Publish products and process inventory
	async finalizeStore(storeId: string): Promise<{
		products_published: number;
		inventory_updated: number;
	}> {
		try {
			console.log("Starting store finalization...");

			// 1. Publish products to Online Store sales channel
			let products_published = 0;
			try {
				products_published = await this.publishProductsToOnlineStore();
			} catch (error) {
				console.error(
					"Failed to publish products to Online Store:",
					error
				);
			}

			// 2. Process inventory CSV if available
			let inventory_updated = 0;
			try {
				// Get all current locations from Shopify
				const allShopifyLocations = await this.getLocations();

				// Convert to the format expected by processInventoryCSV
				const locationsForInventory = allShopifyLocations.map(
					(location) => ({
						id: location.id,
						name: location.name,
						originalLocation: {
							id: location.id,
							store_id: storeId,
							name: location.name,
							address: location.address.address1 || "",
							city: location.address.city || "",
							country: location.address.country || "",
							phone: location.address.phone || "",
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString(),
						},
					})
				);

				if (locationsForInventory.length > 0) {
					const inventoryResult = await this.processInventoryCSV(
						storeId,
						locationsForInventory
					);
					inventory_updated = inventoryResult.inventoryUpdated;

					if (inventoryResult.errors.length > 0) {
						console.warn(
							"Inventory processing errors:",
							inventoryResult.errors
						);
					}
				} else {
					console.log(
						"No locations available for inventory processing"
					);
				}
			} catch (error) {
				console.error("Error processing inventory CSV:", error);
				// Don't fail the entire store generation for inventory issues
			}

			console.log("Store finalization completed");

			return {
				products_published,
				inventory_updated,
			};
		} catch (error) {
			console.error("Error finalizing store:", error);
			throw error;
		}
	}

	// Legacy method for backward compatibility (now uses chunked approach internally)
	async generateStore(
		storeData: StoreData,
		storeId: string
	): Promise<{
		theme_id: number;
		products_created: number;
		logo_uploaded: boolean;
		contact_email_set: boolean;
		locations_created: number;
		inventory_updated: number;
	}> {
		try {
			console.log("Starting full store generation (legacy method)...");

			// Step 1: Foundation
			const foundationResult = await this.generateStoreFoundation(
				storeData,
				storeId
			);

			// Step 2: Products
			const productsResult = await this.generateStoreProducts(storeId);

			// Step 3: Finalization
			const finalizationResult = await this.finalizeStore(storeId);

			return {
				theme_id: foundationResult.theme_id,
				products_created: productsResult.products_created,
				logo_uploaded: foundationResult.logo_uploaded,
				contact_email_set: foundationResult.contact_email_set,
				locations_created: foundationResult.locations_created,
				inventory_updated: finalizationResult.inventory_updated,
			};
		} catch (error) {
			console.error("Error generating store:", error);
			throw error;
		}
	}
}
