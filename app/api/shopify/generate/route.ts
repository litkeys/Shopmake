import { auth, currentUser } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { ShopifyClient } from "@/lib/shopify";
import { getStore, getStoreData, getShopifyAdminToken } from "@/lib/supabase";
import { ShopifyStoreGenerationRequest } from "@/types";

export async function POST(request: NextRequest) {
	try {
		const { userId } = auth();

		if (!userId) {
			return NextResponse.json(
				{ error: "Not authenticated" },
				{ status: 401 }
			);
		}

		// Check if user is admin
		const user = await currentUser();
		const userEmail = user?.emailAddresses[0]?.emailAddress;

		if (!userEmail || !isAdminEmail(userEmail)) {
			return NextResponse.json(
				{ error: "Admin access required" },
				{ status: 403 }
			);
		}

		const body: ShopifyStoreGenerationRequest = await request.json();
		const { store_id, force_regenerate = false } = body;

		console.log("Generate store request:", {
			store_id,
			force_regenerate,
			userId,
		});

		if (!store_id) {
			console.log("Error: Store ID is missing");
			return NextResponse.json(
				{ error: "Store ID is required" },
				{ status: 400 }
			);
		}

		// Verify store ownership
		const store = await getStore(store_id);
		console.log(
			"Store found:",
			store ? "Yes" : "No",
			"User match:",
			store?.created_by === userId
		);
		if (!store || store.created_by !== userId) {
			console.log("Error: Store not found or access denied");
			return NextResponse.json(
				{ error: "Store not found or access denied" },
				{ status: 404 }
			);
		}

		// Get store data
		const storeData = await getStoreData(store_id);
		console.log(
			"Store data found:",
			storeData ? "Yes" : "No",
			"Brand name:",
			storeData?.brand_name
		);
		if (!storeData) {
			console.log("Error: Store data not found");
			return NextResponse.json(
				{
					error: "Store data not found. Please complete the store form first.",
				},
				{ status: 400 }
			);
		}

		// Check if brand name is provided
		if (!storeData.brand_name?.trim()) {
			console.log("Error: Brand name is missing");
			return NextResponse.json(
				{ error: "Store brand name is required for generation" },
				{ status: 400 }
			);
		}

		// Get Shopify token for the store
		console.log("Looking for Shopify token for store ID:", store_id);
		const shopifyToken = await getShopifyAdminToken(store_id);
		console.log("Shopify token found:", !!shopifyToken);
		console.log(
			"Shopify store domain:",
			shopifyToken?.shopify_store_domain
		);
		console.log(
			"Token length:",
			shopifyToken?.admin_api_token?.length || 0
		);

		if (!shopifyToken) {
			console.log("No Shopify token found for store ID:", store_id);
			return NextResponse.json(
				{ error: "Store not connected to Shopify" },
				{ status: 400 }
			);
		}

		// Initialize Shopify client
		const shopify = new ShopifyClient(
			shopifyToken.shopify_store_domain,
			shopifyToken.admin_api_token
		);

		// Generate the store
		console.log(`Starting store generation for ${storeData.brand_name}...`);

		const result = await shopify.generateStore(storeData, store_id);

		console.log(`Store generation completed:`, result);

		return NextResponse.json({
			success: true,
			message:
				"Store generated successfully! Theme installation and publishing completed.",
			data: {
				store_domain: shopifyToken.shopify_store_domain,
				theme_id: result.theme_id,
				products_created: result.products_created,
				variants_updated: result.variants_updated,
				products_published: result.products_published,
				logo_uploaded: result.logo_uploaded,
				contact_email_set: result.contact_email_set,
				locations_created: result.locations_created,
				inventory_updated: result.inventory_updated,
				visuals_updated: result.visuals_updated,
				collections_created: result.collections_created,
				customers_created: result.customers_created,
				policies_updated: result.policies_updated,
				templates_updated: result.templates_updated,
				store_url: `https://${shopifyToken.shopify_store_domain}.myshopify.com`,
			},
		});
	} catch (error) {
		console.error("Error generating Shopify store:", error);

		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";

		// Return more specific error messages for common issues
		if (
			errorMessage.includes("403") ||
			errorMessage.includes("Forbidden")
		) {
			return NextResponse.json(
				{
					error: "Insufficient Shopify permissions. Please reconnect your store with the required permissions.",
				},
				{ status: 400 }
			);
		}

		if (
			errorMessage.includes("404") ||
			errorMessage.includes("Not Found")
		) {
			return NextResponse.json(
				{
					error: "Shopify store not found. Please verify your store connection.",
				},
				{ status: 400 }
			);
		}

		if (
			errorMessage.includes("401") ||
			errorMessage.includes("Unauthorized")
		) {
			return NextResponse.json(
				{
					error: "Shopify authorization expired. Please reconnect your store.",
				},
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{ error: `Store generation failed: ${errorMessage}` },
			{ status: 500 }
		);
	}
}
