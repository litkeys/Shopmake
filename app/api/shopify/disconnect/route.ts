import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getStore, updateStore, deleteShopifyAdminToken } from "@/lib/supabase";

export async function POST(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		// Get current user
		const user = await currentUser();
		const userEmail = user?.emailAddresses[0]?.emailAddress;
		console.log("Disconnect - User email:", userEmail);
		if (!userEmail) {
			return NextResponse.json(
				{ error: "User email not found" },
				{ status: 400 }
			);
		}

		const { store_id } = await request.json();

		if (!store_id) {
			return NextResponse.json(
				{ error: "Store ID is required" },
				{ status: 400 }
			);
		}

		// Verify store exists and user has access
		const store = await getStore(store_id);
		console.log(
			"Disconnect - Store found:",
			!!store,
			"Store ID:",
			store_id
		);
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

		console.log("Disconnect - Deleting Shopify token for store:", store_id);
		// Delete the Shopify token
		await deleteShopifyAdminToken(store_id);

		console.log("Disconnect - Updating store to remove Shopify domain");
		// Remove Shopify domain from store - use raw update to avoid type issues
		try {
			await updateStore(store_id, {
				shopify_store_domain: null as any,
			});
		} catch (updateError) {
			console.error(
				"Failed to update store shopify_store_domain, but token was deleted:",
				updateError
			);
			// Continue anyway since the token deletion is the important part
		}

		console.log("Disconnect - Successfully disconnected store:", store_id);
		return NextResponse.json({
			success: true,
			message: "Store disconnected from Shopify successfully",
		});
	} catch (error) {
		console.error("Error disconnecting Shopify store:", error);
		return NextResponse.json(
			{ error: "Failed to disconnect store" },
			{ status: 500 }
		);
	}
}
