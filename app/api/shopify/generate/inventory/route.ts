import { NextRequest, NextResponse } from "next/server";
import { getStore, getShopifyAdminToken } from "@/lib/supabase";
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

		// Get store
		const store = await getStore(storeId);

		if (!store) {
			return NextResponse.json(
				{ error: "Store not found" },
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

		// Process store inventory
		const result = await shopifyClient.processStoreInventory(storeId);

		return NextResponse.json({
			success: true,
			result,
			message: "Store inventory processed successfully",
		});
	} catch (error) {
		console.error("Store inventory processing error:", error);
		return NextResponse.json(
			{
				error: "Failed to process store inventory",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
