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

		console.log("Making GraphQL request to:", url);
		console.log("Query:", query.substring(0, 200) + "...");
		console.log("Variables:", variables);

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

		console.log("GraphQL response status:", response.status);
		console.log("GraphQL response ok:", response.ok);

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
		console.log("GraphQL response data:", result);

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
			console.log(
				"Importing products from CSV files using bulk operations..."
			);

			// Get CSV uploads for this store
			const { getStoreUploads, supabaseAdmin } = await import(
				"./supabase"
			);
			const csvUploads = await getStoreUploads(storeId, "csv_products");

			if (csvUploads.length === 0) {
				console.log("No product CSV files found, skipping import");
				return 0;
			}

			let totalProductsCreated = 0;

			for (const upload of csvUploads) {
				try {
					console.log(`Processing CSV file: ${upload.file_name}`);

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
						console.log(
							`No valid products found in ${upload.file_name}`
						);
						continue;
					}

					console.log(
						`Found ${products.length} products in ${upload.file_name}`
					);

					// Convert products to JSONL format for bulk import
					const jsonlContent = this.convertProductsToJSONL(products);
					console.log(
						`Generated JSONL content preview (first 500 chars):`,
						jsonlContent.substring(0, 500)
					);
					console.log(
						`Total JSONL content length: ${jsonlContent.length} characters`
					);

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

			console.log(`Total products imported: ${totalProductsCreated}`);
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
		console.log("Starting CSV parsing...");

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
			console.log("CSV file has no data rows");
			return [];
		}

		const headers = rows[0];
		console.log(
			`Found ${headers.length} headers in CSV:`,
			headers.slice(0, 10)
		);

		const products = [];

		for (let i = 1; i < rows.length; i++) {
			const values = rows[i];
			if (values.length < headers.length / 2) {
				console.log(
					`Skipping malformed row ${i}: only ${values.length} values for ${headers.length} headers`
				);
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
					case "product_type":
					case "type":
					case "category":
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
			} else {
				console.log(`Skipped product - missing title or price:`, {
					title: product.title,
					price: product.price,
					hasTitle: !!product.title,
					hasPrice: !!product.price,
				});
			}
		}

		console.log(
			`CSV parsing completed. Found ${
				products.length
			} valid products out of ${rows.length - 1} total rows`
		);
		return products;
	}

	// Convert products to JSONL format for bulk import
	private convertProductsToJSONL(
		products: Array<{
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

		const result = jsonlLines.join("\n");

		// Log first JSONL line for debugging
		if (jsonlLines.length > 0) {
			console.log("Sample JSONL line:", jsonlLines[0]);
		}

		return result;
	}

	// Bulk import products using Shopify Bulk Operations
	private async bulkImportProducts(jsonlContent: string): Promise<number> {
		try {
			console.log("Starting bulk import process...");
			console.log(`JSONL content size: ${jsonlContent.length} bytes`);

			// Step 1: Create staged upload
			console.log("Step 1: Creating staged upload...");
			const stagedUpload = await this.createStagedUpload();
			console.log("Staged upload created successfully:", {
				url: stagedUpload.url.substring(0, 50) + "...",
				resourceUrl: stagedUpload.resourceUrl,
				parameterCount: stagedUpload.parameters.length,
			});
			console.log("Full resourceUrl:", stagedUpload.resourceUrl);

			// Step 2: Upload JSONL file to staged upload URL
			console.log("Step 2: Uploading JSONL file...");
			await this.uploadJSONLFile(
				stagedUpload.url,
				stagedUpload.parameters,
				jsonlContent
			);
			console.log("JSONL file uploaded successfully");

			// Step 3: Start bulk operation
			console.log("Step 3: Starting bulk operation...");

			// Extract the file key from the parameters for bulkOperationRunMutation
			// The key parameter contains the full path needed for the bulk operation
			const keyParameter = stagedUpload.parameters.find(
				(param) => param.name === "key"
			);

			if (!keyParameter || !keyParameter.value) {
				console.error(
					"No key parameter found in staged upload response:",
					stagedUpload.parameters
				);
				throw new Error(
					"Staged upload did not return a valid key parameter. Cannot proceed with bulk operation."
				);
			}

			const stagedUploadPath = keyParameter.value;
			console.log(
				"Extracted staged upload path from key:",
				stagedUploadPath
			);

			if (!stagedUploadPath || stagedUploadPath === "") {
				throw new Error("Extracted key parameter is empty");
			}

			const bulkOperation = await this.startBulkProductImport(
				stagedUploadPath
			);
			console.log("Bulk operation started successfully:", bulkOperation);

			// Step 4: Wait for completion and return count
			console.log("Step 4: Waiting for bulk operation completion...");
			const completedOperation =
				await this.waitForBulkOperationCompletion(bulkOperation.id);
			console.log("Bulk operation completed:", completedOperation);

			return completedOperation.objectCount || 0;
		} catch (error) {
			console.error("Error in bulk import:", error);
			console.error("Error details:", {
				message: error instanceof Error ? error.message : String(error),
				stack:
					error instanceof Error
						? error.stack?.substring(0, 500)
						: undefined,
			});
			throw error;
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

		console.log(
			"Full staged upload response:",
			JSON.stringify(result, null, 2)
		);

		if (result.stagedUploadsCreate.userErrors.length > 0) {
			const errors = result.stagedUploadsCreate.userErrors
				.map((error) => error.message)
				.join("; ");
			throw new Error(`Staged upload creation errors: ${errors}`);
		}

		if (result.stagedUploadsCreate.stagedTargets.length === 0) {
			throw new Error("No staged upload was created");
		}

		const stagedTarget = result.stagedUploadsCreate.stagedTargets[0];
		console.log("Staged target details:", {
			url: stagedTarget.url,
			resourceUrl: stagedTarget.resourceUrl,
			parameters: stagedTarget.parameters,
		});

		return stagedTarget;
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

		// Log response details to see if we get a file key
		const responseText = await response.text();
		console.log("Upload response status:", response.status);
		console.log(
			"Upload response headers:",
			Object.fromEntries(response.headers.entries())
		);
		console.log("Upload response body:", responseText);
		console.log("JSONL file uploaded successfully");
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
			console.log(
				`Bulk operation status: ${operation.status}, objects: ${operation.objectCount}`
			);

			if (operation.status === "COMPLETED") {
				console.log("Bulk operation completed details:", {
					objectCount: operation.objectCount,
					resultUrl: operation.url,
					partialDataUrl: operation.partialDataUrl,
				});

				// Download and analyze the result URL to check for errors
				if (operation.url) {
					try {
						console.log("Downloading bulk operation results...");
						const resultResponse = await fetch(operation.url);
						if (resultResponse.ok) {
							const resultText = await resultResponse.text();
							const resultLines = resultText
								.trim()
								.split("\n")
								.filter((line) => line);
							console.log(
								`Result file contains ${resultLines.length} lines`
							);

							// Parse first few lines to check for errors
							const sampleResults = resultLines
								.slice(0, 3)
								.map((line) => {
									try {
										return JSON.parse(line);
									} catch {
										return line;
									}
								});
							console.log(
								"Sample result entries:",
								sampleResults
							);

							// Count successful vs failed operations
							let successCount = 0;
							let errorCount = 0;
							resultLines.forEach((line) => {
								try {
									const result = JSON.parse(line);
									if (
										result.userErrors &&
										result.userErrors.length > 0
									) {
										errorCount++;
									} else if (result.product || result.data) {
										successCount++;
									}
								} catch {
									// Skip unparseable lines
								}
							});

							console.log(
								`Bulk operation results: ${successCount} successful, ${errorCount} errors`
							);
						}
					} catch (resultError) {
						console.warn(
							"Could not download bulk operation results:",
							resultError
						);
					}
				}

				// If objectCount is 0 but we know products were created,
				// fall back to counting products directly from Shopify
				let finalObjectCount =
					parseInt(operation.objectCount.toString()) || 0;

				if (finalObjectCount === 0) {
					console.log(
						"Object count is 0, checking actual products created..."
					);
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

						// Count products created in the last 10 minutes (bulk operation timeframe)
						const tenMinutesAgo = new Date(
							Date.now() - 10 * 60 * 1000
						);
						const recentProducts =
							productsResult.products.nodes.filter(
								(product) =>
									new Date(product.createdAt) > tenMinutesAgo
							);

						finalObjectCount = recentProducts.length;
						console.log(
							`Found ${finalObjectCount} products created in the last 10 minutes`
						);
					} catch (countError) {
						console.warn(
							"Could not count recent products:",
							countError
						);
						// Use the bulk operation count even if it's 0
					}
				}

				return {
					status: operation.status,
					objectCount: finalObjectCount,
				};
			}

			if (
				operation.status === "FAILED" ||
				operation.status === "CANCELED"
			) {
				console.error("Bulk operation failed/canceled:", {
					errorCode: operation.errorCode,
					resultUrl: operation.url,
					partialDataUrl: operation.partialDataUrl,
				});

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

	// Generate full store
	async generateStore(
		storeData: StoreData,
		storeId: string
	): Promise<{
		theme_id: number;
		products_created: number;
		logo_uploaded: boolean;
		contact_email_set: boolean;
	}> {
		try {
			// 1. Upload and publish theme
			const themeName = `Genesis - ${storeData.brand_name || "Store"}`;
			const { theme_id } = await this.uploadTheme(themeName);
			await this.publishTheme(theme_id);

			// 2. Update store branding (including logo and contact email)
			const brandingResult = await this.updateStoreBranding(
				storeData,
				storeId,
				theme_id
			);

			// 3. Import products from CSV files
			const products_created = await this.importProductsFromCSV(storeId);

			return {
				theme_id,
				products_created,
				logo_uploaded: brandingResult.logo_uploaded,
				contact_email_set: brandingResult.contact_email_set,
			};
		} catch (error) {
			console.error("Error generating store:", error);
			throw error;
		}
	}
}
