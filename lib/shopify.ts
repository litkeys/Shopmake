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

	private async makeGraphQLRequest<T>(
		query: string,
		variables: any = {}
	): Promise<T> {
		const url = `https://${this.shop}.myshopify.com/admin/api/2025-01/graphql.json`;

		console.log("Making Shopify GraphQL request");
		console.log("Variables:", JSON.stringify(variables, null, 2));

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
			console.error("Shopify GraphQL error response:", errorText);
			throw new Error(
				`Shopify GraphQL error: ${response.status} ${response.statusText} - ${errorText}`
			);
		}

		const data = await response.json();
		console.log("GraphQL response data:", JSON.stringify(data, null, 2));

		if (data.errors) {
			console.error("GraphQL errors:", data.errors);
			throw new Error(`GraphQL error: ${data.errors[0].message}`);
		}

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
		try {
			console.log(`🛍️ Creating product: ${product.title}`);

			// Use REST API for simplicity and compatibility - 2025 version still supports it
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

			// Don't include images directly in REST API - they cause corruption
			// Create product first, then add images separately
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
							published: true,
						},
					}),
				}
			);

			const productId = result.product.id;
			console.log(
				`✅ Product created: ${product.title} (ID: ${productId})`
			);

			// Add images using separate API calls for better success rate
			if (product.images && product.images.length > 0) {
				await this.addProductImages(productId, product.images);
			}

			return { product_id: productId };
		} catch (error) {
			console.error(`❌ Error creating product ${product.title}:`, error);
			throw error;
		}
	}

	async addProductImages(
		productId: number,
		imageUrls: string[]
	): Promise<void> {
		try {
			console.log(
				`🖼️ Adding ${imageUrls.length} images to product ${productId}`
			);

			for (let i = 0; i < imageUrls.length; i++) {
				const imageUrl = imageUrls[i].trim();
				if (!imageUrl) continue;

				try {
					console.log(
						`📸 Adding image ${i + 1}/${
							imageUrls.length
						}: ${imageUrl}`
					);

					// Use REST API to add image - more reliable than GraphQL for this
					await this.makeRequest(
						`/products/${productId}/images.json`,
						{
							method: "POST",
							body: JSON.stringify({
								image: {
									src: imageUrl,
									alt: `Product image ${i + 1}`,
								},
							}),
						}
					);

					console.log(`✅ Image ${i + 1} added successfully`);
				} catch (imageError) {
					console.warn(`⚠️ Error adding image ${i + 1}:`, imageError);
					// Continue with other images
				}
			}

			console.log(`🖼️ Finished adding images to product ${productId}`);
		} catch (error) {
			console.error("❌ Error adding product images:", error);
			// Don't throw - images are not critical for product creation
		}
	}

	// Set theme logo
	async uploadLogoToFiles(logoUrl: string): Promise<string | null> {
		try {
			console.log("🔄 Uploading logo using modern Shopify Files API...");

			// Step 1: Download the logo file
			const logoResponse = await fetch(logoUrl);
			if (!logoResponse.ok) {
				throw new Error(`Failed to fetch logo: ${logoResponse.status}`);
			}

			const logoBuffer = await logoResponse.arrayBuffer();
			const logoSize = logoBuffer.byteLength;

			// Get file extension and MIME type
			const urlParts = logoUrl.split(".");
			const extension = urlParts[urlParts.length - 1]
				.split("?")[0]
				.toLowerCase();
			const mimeType = this.getMimeType(extension);
			const filename = `store-logo.${extension}`;

			console.log(
				`📁 File details: ${filename}, size: ${logoSize} bytes, type: ${mimeType}`
			);

			// Step 2: Create staged upload using GraphQL
			const stagedUploadMutation = `
				mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
					stagedUploadsCreate(input: $input) {
						stagedTargets {
							resourceUrl
							url
							parameters {
								name
								value
							}
						}
						userErrors {
							field
							message
						}
					}
				}
			`;

			const stagedUploadVariables = {
				input: [
					{
						filename: filename,
						httpMethod: "POST",
						mimeType: mimeType,
						resource: "FILE",
						fileSize: logoSize.toString(),
					},
				],
			};

			console.log("🚀 Creating staged upload...");
			const stagedResponse = await this.makeGraphQLRequest<{
				data: {
					stagedUploadsCreate: {
						stagedTargets: Array<{
							resourceUrl: string;
							url: string;
							parameters: Array<{ name: string; value: string }>;
						}>;
						userErrors: Array<{ field: string; message: string }>;
					};
				};
			}>(stagedUploadMutation, stagedUploadVariables);

			if (
				stagedResponse.data.stagedUploadsCreate.userErrors?.length > 0
			) {
				throw new Error(
					`Staged upload error: ${stagedResponse.data.stagedUploadsCreate.userErrors[0].message}`
				);
			}

			const stagedTarget =
				stagedResponse.data.stagedUploadsCreate.stagedTargets[0];
			const { url, parameters, resourceUrl } = stagedTarget;

			console.log("📤 Uploading file to staged target...");

			// Step 3: Upload file to staged target using proper form data
			const formData = new FormData();

			// Add all parameters from Shopify
			parameters.forEach((param: { name: string; value: string }) => {
				formData.append(param.name, param.value);
			});

			// Add the file data as Blob
			const fileBlob = new Blob([logoBuffer], { type: mimeType });
			formData.append("file", fileBlob, filename);

			const uploadResponse = await fetch(url, {
				method: "POST",
				body: formData,
			});

			if (!uploadResponse.ok) {
				const errorText = await uploadResponse.text();
				throw new Error(
					`File upload failed: ${uploadResponse.status} - ${errorText}`
				);
			}

			console.log("✅ File uploaded to staged target successfully");

			// Step 4: Create file in Shopify Files
			const createFileMutation = `
				mutation fileCreate($files: [FileCreateInput!]!) {
					fileCreate(files: $files) {
						files {
							id
							alt
							fileStatus
							... on MediaImage {
								id
								alt
								image {
									id
									url
									width
									height
								}
								preview {
									image {
										url
									}
								}
							}
							... on GenericFile {
								id
								alt
								url
							}
						}
						userErrors {
							field
							message
						}
					}
				}
			`;

			const createFileVariables = {
				files: [
					{
						alt: "Store Logo",
						contentType: "IMAGE",
						originalSource: resourceUrl,
					},
				],
			};

			console.log("📁 Creating file in Shopify Files...");
			const fileResponse = await this.makeGraphQLRequest<{
				data: {
					fileCreate: {
						files: Array<{
							id: string;
							alt: string;
							fileStatus: string;
							image?: {
								id: string;
								url: string;
								width?: number;
								height?: number;
							};
							preview?: {
								image: {
									url: string;
								};
							};
							url?: string; // for GenericFile
						}>;
						userErrors: Array<{ field: string; message: string }>;
					};
				};
			}>(createFileMutation, createFileVariables);

			if (fileResponse.data.fileCreate.userErrors?.length > 0) {
				throw new Error(
					`File create error: ${fileResponse.data.fileCreate.userErrors[0].message}`
				);
			}

			console.log(
				"📋 File creation response:",
				JSON.stringify(fileResponse.data.fileCreate, null, 2)
			);

			const createdFile = fileResponse.data.fileCreate.files[0];
			console.log(
				"📋 Created file structure:",
				JSON.stringify(createdFile, null, 2)
			);

			// Try multiple possible URL locations
			let imageUrl: string | undefined;

			if (createdFile.image?.url) {
				imageUrl = createdFile.image.url;
				console.log("✅ Found URL in image.url:", imageUrl);
			} else if (createdFile.preview?.image?.url) {
				imageUrl = createdFile.preview.image.url;
				console.log("✅ Found URL in preview.image.url:", imageUrl);
			} else if (createdFile.url) {
				imageUrl = createdFile.url;
				console.log("✅ Found URL in direct url field:", imageUrl);
			}

			if (!imageUrl) {
				console.error(
					"❌ No image URL found in any expected location. Full file object:",
					createdFile
				);
				throw new Error("No image URL returned from file creation");
			}

			console.log(
				`✅ Logo uploaded to Shopify Files successfully: ${imageUrl}`
			);

			return imageUrl;
		} catch (error) {
			console.error("❌ Error uploading logo to Files:", error);
			return null;
		}
	}

	private getMimeType(extension: string): string {
		const ext = extension.toLowerCase();
		switch (ext) {
			case "jpg":
			case "jpeg":
				return "image/jpeg";
			case "png":
				return "image/png";
			case "gif":
				return "image/gif";
			case "webp":
				return "image/webp";
			default:
				return "image/jpeg";
		}
	}

	// Set contact email in store metafields
	async setContactEmail(email: string): Promise<void> {
		try {
			await this.makeRequest("/metafields.json", {
				method: "POST",
				body: JSON.stringify({
					metafield: {
						namespace: "genesis_contact",
						key: "email",
						value: email,
						type: "single_line_text_field",
						description: "Contact email for footer and support",
					},
				}),
			});
		} catch (error) {
			console.error("Error setting contact email:", error);
			throw error;
		}
	}

	// Import products from CSV files
	async importProductsFromCSV(storeId: string): Promise<number> {
		try {
			console.log("Importing products from CSV files...");

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

					console.log(
						`Found ${products.length} products in ${upload.file_name}`
					);

					// Create products in Shopify
					for (const product of products) {
						try {
							await this.createProduct(product);
							totalProductsCreated++;
							console.log(`Created product: ${product.title}`);
						} catch (productError) {
							console.error(
								`Error creating product ${product.title}:`,
								productError
							);
						}
					}
				} catch (fileError) {
					console.error(
						`Error processing CSV file ${upload.file_name}:`,
						fileError
					);
				}
			}

			console.log(
				`Successfully imported ${totalProductsCreated} products from CSV files`
			);
			return totalProductsCreated;
		} catch (error) {
			console.error("Error importing products from CSV:", error);
			return 0; // Don't throw - CSV import is not critical
		}
	}

	// Parse product CSV data with enhanced debugging and field mapping
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
		console.log("🔍 Starting CSV parsing...");

		// Split by newlines and filter empty lines
		const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
		console.log(`📄 CSV has ${lines.length} lines (including header)`);

		if (lines.length <= 1) {
			console.log("❌ No data rows found in CSV");
			return [];
		}

		// Parse headers using proper CSV parsing (handle quoted fields)
		const headers = this.parseCSVLine(lines[0]);
		console.log(
			`📝 Found ${headers.length} headers:`,
			headers.slice(0, 10),
			"..."
		); // Show first 10 headers

		// Find key column indices for debugging
		const titleIndex = headers.findIndex((h) => /^title$/i.test(h.trim()));
		const priceIndex = headers.findIndex((h) =>
			/^variant price$/i.test(h.trim())
		);
		const descriptionIndex = headers.findIndex((h) =>
			/^body \(html\)$/i.test(h.trim())
		);
		const imageIndex = headers.findIndex((h) =>
			/^image src$/i.test(h.trim())
		);
		const vendorIndex = headers.findIndex((h) =>
			/^vendor$/i.test(h.trim())
		);

		console.log(
			`🎯 Key column indices - Title: ${titleIndex}, Price: ${priceIndex}, Description: ${descriptionIndex}, Image: ${imageIndex}, Vendor: ${vendorIndex}`
		);

		const products = [];

		for (let i = 1; i < lines.length; i++) {
			const values = this.parseCSVLine(lines[i]);

			if (values.length === 0) {
				console.log(`⚠️ Skipping empty row ${i}`);
				continue;
			}

			// Debug first few rows
			if (i <= 3) {
				console.log(
					`🔍 Row ${i} has ${values.length} values - Title: "${values[titleIndex]}", Price: "${values[priceIndex]}", Vendor: "${values[vendorIndex]}"`
				);
			}

			const product: any = {};

			headers.forEach((header, index) => {
				const value = values[index]?.trim();
				if (!value || value === "") return;

				const headerLower = header.toLowerCase().trim();

				// Enhanced mapping with exact matches from the CSV
				switch (headerLower) {
					case "title":
					case "name":
					case "product_title":
					case "product name":
						product.title = value;
						break;
					case "body (html)":
					case "description":
					case "body":
					case "body_html":
					case "product description":
						product.description = value;
						break;
					case "vendor":
					case "brand":
					case "manufacturer":
						product.vendor = value;
						break;
					case "type":
					case "product_type":
					case "category":
					case "product type":
					case "product category":
						product.product_type = value;
						break;
					case "variant price":
					case "price":
					case "variant_price":
					case "unit price":
					case "cost":
						// Remove currency symbols and spaces, handle various formats
						const cleanPrice = value.replace(/[$£€¥,\s]/g, "");
						const numPrice = parseFloat(cleanPrice);
						if (!isNaN(numPrice) && numPrice > 0) {
							product.price = numPrice.toFixed(2);
						}
						break;
					case "variant compare at price":
					case "compare_at_price":
					case "compare_price":
					case "msrp":
					case "retail price":
						const cleanComparePrice = value.replace(
							/[$£€¥,\s]/g,
							""
						);
						const numComparePrice = parseFloat(cleanComparePrice);
						if (!isNaN(numComparePrice) && numComparePrice > 0) {
							product.compare_at_price =
								numComparePrice.toFixed(2);
						}
						break;
					case "variant inventory qty":
					case "inventory_quantity":
					case "quantity":
					case "stock":
					case "inventory":
						const qty = parseInt(value);
						if (!isNaN(qty)) {
							product.inventory_quantity = qty;
						}
						break;
					case "variant grams":
					case "weight":
						// Convert grams to pounds for Shopify (if it's in grams)
						let weight = parseFloat(value);
						if (!isNaN(weight)) {
							// If value is very large, assume it's in grams and convert to pounds
							if (weight > 1000) {
								weight = weight / 453.592; // Convert grams to pounds
							}
							product.weight = Math.round(weight * 100) / 100; // Round to 2 decimal places
						}
						break;
					case "variant sku":
					case "sku":
					case "product code":
						product.sku = value;
						break;
					case "variant barcode":
					case "barcode":
					case "upc":
					case "ean":
						product.barcode = value;
						break;
					case "image src":
					case "image":
					case "image_src":
					case "images":
					case "image url":
					case "photo":
						if (value.includes("http")) {
							// Handle multiple images separated by commas or semicolons
							const imageUrls = value
								.split(/[,;]/)
								.map((url) => url.trim())
								.filter(
									(url) =>
										url.includes("http") && url.length > 10
								);
							if (imageUrls.length > 0) {
								product.images = imageUrls;
							}
						}
						break;
					case "variant requires shipping":
					case "requires_shipping":
						product.requires_shipping =
							value.toLowerCase() === "true" ||
							value.toLowerCase() === "yes";
						break;
					case "variant taxable":
					case "taxable":
						product.taxable =
							value.toLowerCase() === "true" ||
							value.toLowerCase() === "yes";
						break;
				}
			});

			// Enhanced validation and debug logging
			if (product.title && product.price) {
				if (!product.description) {
					product.description = `${product.title} - No description provided`;
				}

				// Ensure required defaults
				if (product.requires_shipping === undefined)
					product.requires_shipping = true;
				if (product.taxable === undefined) product.taxable = true;
				if (!product.inventory_quantity) product.inventory_quantity = 0;

				products.push(product);

				// Log first few successful products
				if (products.length <= 3) {
					console.log(
						`✅ Product ${products.length}: "${
							product.title
						}" - Price: $${product.price}, Images: ${
							product.images?.length || 0
						}`
					);
				}
			} else {
				if (i <= 5) {
					// Debug first few failed rows
					console.log(
						`❌ Row ${i} missing required fields - Title: "${product.title}", Price: "${product.price}"`
					);
				}
			}
		}

		console.log(
			`🎉 Successfully parsed ${products.length} products from ${
				lines.length - 1
			} CSV rows`
		);
		return products;
	}

	// Helper function to properly parse CSV lines (handles quoted fields)
	private parseCSVLine(line: string): string[] {
		const result = [];
		let current = "";
		let inQuotes = false;
		let i = 0;

		while (i < line.length) {
			const char = line[i];

			if (char === '"') {
				if (!inQuotes) {
					// Starting a quoted field
					inQuotes = true;
				} else if (i + 1 < line.length && line[i + 1] === '"') {
					// Escaped quote (double quote)
					current += '"';
					i++; // Skip the next quote
				} else {
					// Ending a quoted field
					inQuotes = false;
				}
			} else if (char === "," && !inQuotes) {
				// Field separator (only when not in quotes)
				result.push(current);
				current = "";
			} else {
				// Regular character
				current += char;
			}

			i++;
		}

		// Add the last field
		result.push(current);

		// Clean up the results (remove surrounding quotes and trim)
		return result.map((field) => {
			let cleaned = field.trim();
			// Remove surrounding quotes if present
			if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
				cleaned = cleaned.slice(1, -1);
			}
			return cleaned;
		});
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

			// 1. Upload logo to Shopify Files if available
			if (storeData.logo_url) {
				try {
					const logoFileUrl = await this.uploadLogoToFiles(
						storeData.logo_url
					);
					logo_uploaded = !!logoFileUrl;
					if (logoFileUrl) {
						console.log(
							"Logo successfully uploaded to Shopify Files"
						);
					} else {
						console.log("Logo upload to Shopify Files failed");
					}
				} catch (logoError) {
					console.error("Error uploading logo to Files:", logoError);
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
