import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/admin";
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

		// Check if user is admin
		const user = await auth();
		const userEmail = user.sessionClaims?.email as string;
		if (!isAdminEmail(userEmail)) {
			return NextResponse.json(
				{ error: "Admin access required" },
				{ status: 403 }
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

		// Delete the Shopify token
		await deleteShopifyAdminToken(store_id);

		// Remove Shopify domain from store
		await updateStore(store_id, {
			shopify_store_domain: undefined,
		});

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
