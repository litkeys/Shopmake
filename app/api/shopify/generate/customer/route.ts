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
		const { store_id } = body;

		console.log("Process customers and orders request:", {
			store_id,
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

		// Get Shopify Admin Token
		const shopifyToken = await getShopifyAdminToken(store_id);
		console.log(
			"Shopify token found:",
			shopifyToken ? "Yes" : "No",
			"Store domain:",
			shopifyToken?.shopify_store_domain
		);
		if (!shopifyToken) {
			console.log("Error: Shopify token not found");
			return NextResponse.json(
				{
					error: "Shopify store not connected. Please connect your Shopify store first.",
				},
				{ status: 400 }
			);
		}

		// Initialize Shopify client
		const shopifyClient = new ShopifyClient(
			shopifyToken.shopify_store_domain,
			shopifyToken.admin_api_token
		);

		console.log("Starting customer and order import...");

		// Process customers and orders
		const result = await shopifyClient.processStoreCustomersAndOrders(
			store_id
		);

		console.log("Customer and order import completed:", result);

		return NextResponse.json({
			success: true,
			message: "Customers and orders processed successfully",
			data: {
				customers_created: result.customers_created,
				orders_created: result.orders_created,
				errors: result.errors,
			},
		});
	} catch (error) {
		console.error("Error processing customers and orders:", error);
		return NextResponse.json(
			{
				error: "Failed to process customers and orders",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
