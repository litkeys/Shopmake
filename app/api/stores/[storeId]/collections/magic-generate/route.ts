import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import OpenAI from "openai";
import {
	getStore,
	getStoreUploads,
	createStoreCollection,
	createCollectionMapping,
	supabaseAdmin,
} from "@/lib/supabase";

// Initialize OpenAI client
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

// Define the structured output schema for collections
interface MappingRule {
	mapping_type: "product_tag" | "product_type";
	mapping_value: string;
}

interface GeneratedCollection {
	title: string;
	description: string;
	mapping_rules: MappingRule[];
}

interface CollectionsResponse {
	collections: GeneratedCollection[];
}

export async function POST(
	request: NextRequest,
	{ params }: { params: { storeId: string } }
) {
	try {
		const { userId } = auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const storeId = params.storeId;

		// Verify store exists and user has access
		const store = await getStore(storeId);
		if (!store) {
			return NextResponse.json(
				{ error: "Store not found" },
				{ status: 404 }
			);
		}

		if (store.created_by !== userId) {
			return NextResponse.json(
				{ error: "Access denied" },
				{ status: 403 }
			);
		}

		// Check if OpenAI API key is configured
		if (!process.env.OPENAI_API_KEY) {
			return NextResponse.json(
				{ error: "OpenAI API key not configured" },
				{ status: 500 }
			);
		}

		// Get product CSV uploads
		const productUploads = await getStoreUploads(storeId, "csv_products");
		if (productUploads.length === 0) {
			return NextResponse.json(
				{
					error: "No product CSV found. Please upload a products CSV first.",
				},
				{ status: 400 }
			);
		}

		// Parse the most recent product CSV to extract types and tags
		const latestUpload = productUploads[0];
		let productData;

		try {
			// Download the CSV file from Supabase storage
			const { data: csvData, error } = await supabaseAdmin.storage
				.from("store-files")
				.download(latestUpload.file_path);

			if (error) {
				console.error(
					`Error downloading CSV ${latestUpload.file_name}:`,
					error
				);
				return NextResponse.json(
					{ error: "Failed to download product CSV" },
					{ status: 500 }
				);
			}

			const csvText = await csvData.text();
			productData = parseProductCSV(csvText);
		} catch (parseError) {
			console.error("Error parsing product CSV:", parseError);
			return NextResponse.json(
				{ error: "Failed to parse product CSV" },
				{ status: 500 }
			);
		}

		// Extract distinct product types and tags
		const productTypes = new Set<string>();
		const productTags = new Set<string>();

		productData.forEach((product) => {
			if (product.product_type) {
				productTypes.add(product.product_type);
			}
			if (product.tags && Array.isArray(product.tags)) {
				product.tags.forEach((tag) => {
					if (tag && tag.trim()) {
						productTags.add(tag.trim());
					}
				});
			}
		});

		const distinctTypes = Array.from(productTypes).filter(Boolean);
		const distinctTags = Array.from(productTags).filter(Boolean);

		if (distinctTypes.length === 0 && distinctTags.length === 0) {
			return NextResponse.json(
				{
					error: "No product types or tags found in the CSV data. Please ensure your products have 'type' and/or 'tags' columns with meaningful values.",
				},
				{ status: 400 }
			);
		}

		// Generate collections using OpenAI structured outputs
		const prompt = `Your goals:
- Generate up to 6 meaningful smart collections that help buyers efficiently navigate the catalog.
- Collections should reflect real buying behavior to increase conversion rate, such as by use case or by buyer intent.
- Avoid overly granular or redundant collections.
- Favor clarity and functional language over marketing language.

Available Product Types: ${distinctTypes.join(", ") || "None"}
Available Product Tags: ${distinctTags.join(", ") || "None"}

For each collection, you must:
1. Create a customer-friendly title
2. Write a concise description of what products belong in this collection
3. Define at least one mapping rule that specifies which products belong in this collection

Each mapping rule should use one of these types:
- "product_tag": Match products that have a specific tag
- "product_type": Match products of a specific type

The mapping rules for each collection are used to match products that satisfy ANY of the rules. You can use multiple rules of DIFFERENT types per collection to include products with a mix of different product tags and/or product types. 

Make sure the collections are diverse and cover different aspects of the product catalog. Generated collections do NOT have to cover all product types and tags.`;

		let generatedCollections: GeneratedCollection[];

		try {
			const completion = await openai.chat.completions.create({
				model: "gpt-4.1-mini-2025-04-14",
				messages: [
					{
						role: "system",
						content:
							"You're a Shopify merchandising strategist trained to optimize customer experience and conversion rate for e-commerce stores. Your task is to generate a concise, high-quality set of up to six Shopify smart collections based on a given set of distinct product types and tags associated with the store's products.",
					},
					{
						role: "user",
						content: prompt,
					},
				],
				response_format: {
					type: "json_schema",
					json_schema: {
						name: "collections_response",
						strict: true,
						schema: {
							type: "object",
							properties: {
								collections: {
									type: "array",
									items: {
										type: "object",
										properties: {
											title: {
												type: "string",
												description:
													"The collection title",
											},
											description: {
												type: "string",
												description:
													"The collection description",
											},
											mapping_rules: {
												type: "array",
												minItems: 1,
												items: {
													type: "object",
													properties: {
														mapping_type: {
															type: "string",
															enum: [
																"product_tag",
																"product_type",
															],
															description:
																"The type of mapping rule",
														},
														mapping_value: {
															type: "string",
															description:
																"The value to match for this mapping rule",
														},
													},
													required: [
														"mapping_type",
														"mapping_value",
													],
													additionalProperties: false,
												},
											},
										},
										required: [
											"title",
											"description",
											"mapping_rules",
										],
										additionalProperties: false,
									},
								},
							},
							required: ["collections"],
							additionalProperties: false,
						},
					},
				},
			});

			const responseContent = completion.choices[0].message.content;
			if (!responseContent) {
				throw new Error("No response content from OpenAI");
			}
			const response = JSON.parse(responseContent) as CollectionsResponse;
			generatedCollections = response.collections;
		} catch (openaiError) {
			console.error(
				"Error generating collections with OpenAI:",
				openaiError
			);
			return NextResponse.json(
				{ error: "Failed to generate collections. Please try again." },
				{ status: 500 }
			);
		}

		// Create the generated collections in the database
		const createdCollections = [];

		for (const generatedCollection of generatedCollections) {
			try {
				// Validate that the collection has mapping rules
				if (
					!generatedCollection.mapping_rules ||
					generatedCollection.mapping_rules.length === 0
				) {
					console.warn(
						`Skipping collection "${generatedCollection.title}" - no mapping rules provided`
					);
					continue;
				}

				// Validate that all mapping rules have required fields
				const validMappingRules =
					generatedCollection.mapping_rules.filter(
						(rule) =>
							rule.mapping_type &&
							rule.mapping_value &&
							rule.mapping_value.trim()
					);

				if (validMappingRules.length === 0) {
					console.warn(
						`Skipping collection "${generatedCollection.title}" - no valid mapping rules`
					);
					continue;
				}

				// Create the collection
				const collection = await createStoreCollection(storeId, {
					title: generatedCollection.title,
					description: generatedCollection.description,
				});

				// Create the mapping rules for this collection
				const mappings = [];
				for (const rule of validMappingRules) {
					const mapping = await createCollectionMapping(
						collection.id,
						{
							mapping_type: rule.mapping_type,
							mapping_value: rule.mapping_value.trim(),
						}
					);
					mappings.push(mapping);
				}

				createdCollections.push({
					...collection,
					mappings,
				});
			} catch (dbError) {
				console.error(
					`Error creating collection "${generatedCollection.title}":`,
					dbError
				);
				// Continue with other collections even if one fails
			}
		}

		return NextResponse.json({
			data: {
				collections_created: createdCollections.length,
				collections: createdCollections,
			},
		});
	} catch (error) {
		console.error("Error in magic generate collections:", error);
		return NextResponse.json(
			{ error: "Failed to generate collections" },
			{ status: 500 }
		);
	}
}

// Helper function to parse product CSV (simplified version)
function parseProductCSV(csvText: string): Array<{
	title: string;
	product_type?: string;
	tags?: string[];
}> {
	const parseCSV = (csvText: string): string[][] => {
		const rows: string[][] = [];
		let currentRow: string[] = [];
		let currentField = "";
		let inQuotes = false;
		let i = 0;

		while (i < csvText.length) {
			const char = csvText[i];

			if (char === '"') {
				if (i + 1 < csvText.length && csvText[i + 1] === '"') {
					currentField += '"';
					i += 2;
				} else {
					inQuotes = !inQuotes;
					i++;
				}
			} else if (char === "," && !inQuotes) {
				currentRow.push(currentField.trim());
				currentField = "";
				i++;
			} else if ((char === "\n" || char === "\r") && !inQuotes) {
				if (currentField.trim() || currentRow.length > 0) {
					currentRow.push(currentField.trim());
					if (currentRow.some((field) => field.length > 0)) {
						rows.push(currentRow);
					}
					currentRow = [];
					currentField = "";
				}
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
			continue;
		}

		const product: any = {};

		headers.forEach((header, index) => {
			const value = values[index] || "";
			const cleanValue = value.replace(/^"|"$/g, "");
			if (!cleanValue) return;

			const lowerHeader = header.toLowerCase();

			switch (lowerHeader) {
				case "title":
				case "name":
				case "product_title":
					product.title = cleanValue;
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
			}
		});

		if (product.title) {
			products.push(product);
		}
	}

	return products;
}
