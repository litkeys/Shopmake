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

	// Parse product CSV data
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
	}> {
		const lines = csvText.split("\n").filter((line) => line.trim());
		if (lines.length <= 1) return [];

		const headers = lines[0]
			.split(",")
			.map((h) => h.trim().replace(/"/g, ""));
		const products = [];

		for (let i = 1; i < lines.length; i++) {
			const values = lines[i]
				.split(",")
				.map((v) => v.trim().replace(/"/g, ""));
			if (values.length < headers.length) continue;

			const product: any = {};

			headers.forEach((header, index) => {
				const value = values[index];
				if (!value) return;

				// Map common CSV headers to product fields
				switch (header.toLowerCase()) {
					case "title":
					case "name":
					case "product_title":
						product.title = value;
						break;
					case "description":
					case "body":
					case "body_html":
						product.description = value;
						break;
					case "vendor":
					case "brand":
						product.vendor = value;
						break;
					case "product_type":
					case "type":
					case "category":
						product.product_type = value;
						break;
					case "price":
					case "variant_price":
						product.price = value;
						break;
					case "compare_at_price":
					case "compare_price":
						product.compare_at_price = value;
						break;
					case "inventory_quantity":
					case "quantity":
					case "stock":
						product.inventory_quantity = parseInt(value) || 0;
						break;
					case "weight":
						product.weight = parseFloat(value) || undefined;
						break;
					case "sku":
						product.sku = value;
						break;
					case "barcode":
						product.barcode = value;
						break;
					case "image":
					case "image_src":
					case "images":
						if (value.includes("http")) {
							product.images = [value];
						}
						break;
				}
			});

			// Ensure required fields
			if (product.title && product.price) {
				if (!product.description)
					product.description = `${product.title} - No description provided`;
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
			price: string;
			compare_at_price?: string;
			inventory_quantity?: number;
			weight?: number;
			requires_shipping?: boolean;
			taxable?: boolean;
			sku?: string;
			barcode?: string;
			images?: string[];
		}>
	): string {
		const jsonlLines = products.map((product) => {
			// Convert product to ProductInput format for GraphQL
			const productInput = {
				title: product.title,
				descriptionHtml: product.description,
				vendor: product.vendor || "",
				productType: product.product_type || "",
				variants: [
					{
						price: parseFloat(product.price).toFixed(2),
						compareAtPrice: product.compare_at_price
							? parseFloat(product.compare_at_price).toFixed(2)
							: undefined,
						inventoryQuantities:
							product.inventory_quantity !== undefined
								? [
										{
											availableQuantity:
												product.inventory_quantity,
											locationId:
												"gid://shopify/Location/primary", // Will be resolved by Shopify
										},
								  ]
								: undefined,
						weight: product.weight,
						requiresShipping: product.requires_shipping !== false,
						taxable: product.taxable !== false,
						sku: product.sku,
						barcode: product.barcode,
					},
				],
				images: product.images?.map((src) => ({ src })) || [],
				status: "ACTIVE",
			};

			// Return as JSONL format
			return JSON.stringify({ input: productInput });
		});

		return jsonlLines.join("\n");
	}

	// Bulk import products using Shopify Bulk Operations
	private async bulkImportProducts(jsonlContent: string): Promise<number> {
		try {
			console.log("Starting bulk import process...");

			// Step 1: Create staged upload
			const stagedUpload = await this.createStagedUpload();
			console.log("Staged upload created:", stagedUpload);

			// Step 2: Upload JSONL file to staged upload URL
			await this.uploadJSONLFile(
				stagedUpload.url,
				stagedUpload.parameters,
				jsonlContent
			);
			console.log("JSONL file uploaded successfully");

			// Step 3: Start bulk operation
			const bulkOperation = await this.startBulkProductImport(
				stagedUpload.resourceUrl
			);
			console.log("Bulk operation started:", bulkOperation);

			// Step 4: Wait for completion and return count
			const completedOperation =
				await this.waitForBulkOperationCompletion();
			console.log("Bulk operation completed:", completedOperation);

			return completedOperation.objectCount || 0;
		} catch (error) {
			console.error("Error in bulk import:", error);
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
					stagedUploads {
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
					mimeType: "application/jsonl",
					resource: "BULK_MUTATION_VARIABLES",
					httpMethod: "POST",
				},
			],
		};

		const result = await this.makeGraphQLRequest<{
			stagedUploadsCreate: {
				stagedUploads: Array<{
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

		if (result.stagedUploadsCreate.stagedUploads.length === 0) {
			throw new Error("No staged upload was created");
		}

		return result.stagedUploadsCreate.stagedUploads[0];
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
		const blob = new Blob([jsonlContent], { type: "application/jsonl" });
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
	private async waitForBulkOperationCompletion(): Promise<{
		status: string;
		objectCount: number;
	}> {
		const maxAttempts = 60; // Wait up to 10 minutes (60 * 10 seconds)
		let attempts = 0;

		while (attempts < maxAttempts) {
			const query = `
				query {
					currentBulkOperation {
						id
						status
						errorCode
						objectCount
						createdAt
						completedAt
					}
				}
			`;

			const result = await this.makeGraphQLRequest<{
				currentBulkOperation: {
					id: string;
					status: string;
					errorCode?: string;
					objectCount: number;
					createdAt: string;
					completedAt?: string;
				} | null;
			}>(query);

			if (!result.currentBulkOperation) {
				throw new Error("No current bulk operation found");
			}

			const operation = result.currentBulkOperation;
			console.log(
				`Bulk operation status: ${operation.status}, objects: ${operation.objectCount}`
			);

			if (operation.status === "COMPLETED") {
				return {
					status: operation.status,
					objectCount: operation.objectCount,
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
