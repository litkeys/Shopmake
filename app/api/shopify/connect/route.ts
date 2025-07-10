import { auth, currentUser } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { testShopifyConnection } from "@/lib/shopify";
import { getStore, updateStore, upsertShopifyAdminToken } from "@/lib/supabase";
import { ShopifyCustomAppConnection } from "@/types";

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

		const body: ShopifyCustomAppConnection & { store_id: string } =
			await request.json();
		const { store_id, store_domain, admin_api_token, token_name } = body;

		if (!store_id || !store_domain || !admin_api_token) {
			return NextResponse.json(
				{
					error: "Store ID, store domain, and Admin API token are required",
				},
				{ status: 400 }
			);
		}

		// Verify store ownership
		const store = await getStore(store_id);
		if (!store || store.created_by !== userId) {
			return NextResponse.json(
				{ error: "Store not found or access denied" },
				{ status: 404 }
			);
		}

		// Clean store domain (remove .myshopify.com if present)
		const cleanDomain = store_domain.replace(".myshopify.com", "");

		// Test the connection
		console.log(`Testing Shopify connection for ${cleanDomain}...`);
		const isConnectionValid = await testShopifyConnection(
			cleanDomain,
			admin_api_token
		);

		if (!isConnectionValid) {
			return NextResponse.json(
				{
					error: "Invalid Shopify connection. Please check your store domain and Admin API token.",
				},
				{ status: 400 }
			);
		}

		// Save the token
		await upsertShopifyAdminToken(
			store_id,
			cleanDomain,
			admin_api_token,
			token_name
		);

		// Update store with Shopify domain
		await updateStore(store_id, {
			shopify_store_domain: cleanDomain,
		});

		console.log(`Successfully connected Shopify store: ${cleanDomain}`);

		return NextResponse.json({
			success: true,
			message: "Shopify store connected successfully!",
			data: {
				store_domain: cleanDomain,
				store_url: `https://${cleanDomain}.myshopify.com`,
				token_name: token_name || "Genesis Project Token",
			},
		});
	} catch (error) {
		console.error("Error connecting Shopify store:", error);

		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";

		// Return more specific error messages for common issues
		if (
			errorMessage.includes("403") ||
			errorMessage.includes("Forbidden")
		) {
			return NextResponse.json(
				{
					error: "Insufficient Shopify permissions. Please ensure your Custom App has the required scopes: read_products, write_products, read_themes, write_themes.",
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
					error: "Shopify store not found. Please verify your store domain.",
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
					error: "Invalid Admin API token. Please check your token and try again.",
				},
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{ error: `Store connection failed: ${errorMessage}` },
			{ status: 500 }
		);
	}
}
