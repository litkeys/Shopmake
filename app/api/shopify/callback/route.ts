import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { currentUser } from "@clerk/nextjs";
import { verifyShopifyCallback, exchangeCodeForToken } from "@/lib/shopify";
import { getStore, updateStore, upsertShopifyToken } from "@/lib/supabase";
import { ShopifyCallbackParams } from "@/types";

export async function GET(request: NextRequest) {
	try {
		const { userId } = auth();

		if (!userId) {
			return NextResponse.redirect(new URL("/sign-in", request.url));
		}

		// Check if user is admin
		const user = await currentUser();
		const userEmail = user?.emailAddresses[0]?.emailAddress;

		if (!userEmail || !isAdminEmail(userEmail)) {
			return NextResponse.redirect(
				new URL("/sign-in?error=admin_required", request.url)
			);
		}

		const searchParams = request.nextUrl.searchParams;

		// Extract callback parameters
		const code = searchParams.get("code");
		const hmac = searchParams.get("hmac");
		const shop = searchParams.get("shop");
		const state = searchParams.get("state"); // This should contain our store ID
		const timestamp = searchParams.get("timestamp");

		if (!code || !hmac || !shop || !state || !timestamp) {
			console.error("Missing required callback parameters");
			return NextResponse.redirect(
				new URL(
					"/dashboard/clients?error=oauth_missing_params",
					request.url
				)
			);
		}

		// Verify the callback
		const callbackParams: ShopifyCallbackParams = {
			code,
			hmac,
			shop,
			state,
			timestamp,
		};

		if (!verifyShopifyCallback(callbackParams)) {
			console.error("Invalid Shopify callback signature");
			return NextResponse.redirect(
				new URL(
					"/dashboard/clients?error=oauth_invalid_signature",
					request.url
				)
			);
		}

		// Extract store ID from state parameter
		const storeId = state;

		// Verify store ownership
		const store = await getStore(storeId);
		if (!store || store.created_by !== userId) {
			console.error("Store not found or access denied");
			return NextResponse.redirect(
				new URL(
					"/dashboard/clients?error=store_access_denied",
					request.url
				)
			);
		}

		// Exchange code for access token
		const shopDomain = shop.replace(".myshopify.com", "");
		const tokenData = await exchangeCodeForToken(shopDomain, code);

		// Store the token in our database
		await upsertShopifyToken(
			storeId,
			shopDomain,
			tokenData.access_token,
			tokenData.scope
		);

		// Update the store with the Shopify domain
		await updateStore(storeId, {
			shopify_store_domain: shopDomain,
		});

		// Redirect back to the client page with success
		return NextResponse.redirect(
			new URL(
				`/dashboard/clients/${storeId}?success=shopify_connected`,
				request.url
			)
		);
	} catch (error) {
		console.error("Error in Shopify callback:", error);

		// Try to get store ID from state to redirect appropriately
		const searchParams = request.nextUrl.searchParams;
		const state = searchParams.get("state");

		if (state) {
			return NextResponse.redirect(
				new URL(
					`/dashboard/clients/${state}?error=oauth_failed`,
					request.url
				)
			);
		}

		return NextResponse.redirect(
			new URL("/dashboard/clients?error=oauth_failed", request.url)
		);
	}
}
