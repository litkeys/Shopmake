import { auth, currentUser } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { generateShopifyOAuthUrl } from "@/lib/shopify";
import { getStore } from "@/lib/supabase";

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
		const shop = searchParams.get("shop");
		const state = searchParams.get("state"); // store ID

		if (!shop || !state) {
			return NextResponse.redirect(
				new URL("/dashboard/clients?error=missing_params", request.url)
			);
		}

		// Verify store ownership
		const store = await getStore(state);
		if (!store || store.created_by !== userId) {
			return NextResponse.redirect(
				new URL(
					"/dashboard/clients?error=store_access_denied",
					request.url
				)
			);
		}

		// Ensure shop domain format
		const shopDomain = shop.replace(".myshopify.com", "");

		// Generate OAuth URL
		const oauthUrl = generateShopifyOAuthUrl(shopDomain, state);

		// Redirect to Shopify OAuth
		return NextResponse.redirect(oauthUrl);
	} catch (error) {
		console.error("Error initiating Shopify OAuth:", error);

		return NextResponse.redirect(
			new URL("/dashboard/clients?error=oauth_init_failed", request.url)
		);
	}
}
