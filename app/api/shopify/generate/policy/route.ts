import { NextRequest, NextResponse } from "next/server";
import { getStore, getStoreData, getShopifyAdminToken } from "@/lib/supabase";
import { ShopifyClient } from "@/lib/shopify";

export async function POST(request: NextRequest) {
	try {
		const { storeId } = await request.json();

		if (!storeId) {
			return NextResponse.json(
				{ error: "Store ID is required" },
				{ status: 400 }
			);
		}

		// Get store and store data
		const store = await getStore(storeId);
		const storeData = await getStoreData(storeId);

		if (!store) {
			return NextResponse.json(
				{ error: "Store not found" },
				{ status: 404 }
			);
		}

		if (!storeData) {
			return NextResponse.json(
				{ error: "Store data not found" },
				{ status: 404 }
			);
		}

		// Get Shopify token for the store
		const shopifyToken = await getShopifyAdminToken(storeId);
		if (!shopifyToken) {
			return NextResponse.json(
				{ error: "Store is not connected to Shopify" },
				{ status: 400 }
			);
		}

		// Initialize Shopify client
		const shopifyClient = new ShopifyClient(
			shopifyToken.shopify_store_domain,
			shopifyToken.admin_api_token
		);

		// Update store policies
		const result = await shopifyClient.updateStorePolicies(storeData);

		return NextResponse.json({
			success: true,
			result,
			message: "Store policies updated successfully",
		});
	} catch (error) {
		console.error("Policy update error:", error);
		return NextResponse.json(
			{
				error: "Failed to update store policies",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
