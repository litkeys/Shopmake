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

		// Generate store foundation
		const result = await shopifyClient.generateStoreFoundation(
			storeData || {
				id: "",
				store_id: storeId,
				brand_name: store.name,
				description: "",
				main_product_category: "",
				contact_email: "",
				updated_at: new Date().toISOString(),
			},
			storeId
		);

		return NextResponse.json({
			success: true,
			result,
			message: "Store foundation generated successfully",
		});
	} catch (error) {
		console.error("Foundation generation error:", error);
		return NextResponse.json(
			{
				error: "Failed to generate store foundation",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
