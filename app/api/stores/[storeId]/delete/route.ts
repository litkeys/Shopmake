import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/admin";
import { getStore, deleteShopifyAdminToken } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
	{
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	}
);

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { storeId: string } }
) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		// Check if user is admin
		const user = await currentUser();
		const userEmail = user?.emailAddresses[0]?.emailAddress;
		console.log("Delete - User email:", userEmail);
		console.log(
			"Delete - Is admin:",
			userEmail ? isAdminEmail(userEmail) : false
		);
		if (!userEmail || !isAdminEmail(userEmail)) {
			return NextResponse.json(
				{ error: "Admin access required" },
				{ status: 403 }
			);
		}

		const storeId = params.storeId;

		// Verify store exists and user has access
		const store = await getStore(storeId);
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

		// Delete all related data in the correct order to avoid foreign key constraints

		// 1. Delete Shopify token if exists
		try {
			await deleteShopifyAdminToken(storeId);
		} catch (error) {
			// Token might not exist, that's okay
			console.log("No Shopify token to delete");
		}

		// 2. Delete all store files from storage
		const { data: files } = await supabaseAdmin.storage
			.from("store-files")
			.list(storeId);

		if (files && files.length > 0) {
			const filePaths = files.map((file) => `${storeId}/${file.name}`);
			await supabaseAdmin.storage.from("store-files").remove(filePaths);
		}

		// 3. Delete uploads records (will cascade delete due to foreign keys)
		await supabaseAdmin.from("uploads").delete().eq("store_id", storeId);

		// 4. Delete store data (will cascade delete due to foreign keys)
		await supabaseAdmin.from("store_data").delete().eq("store_id", storeId);

		// 5. Finally delete the store itself
		await supabaseAdmin.from("stores").delete().eq("id", storeId);

		return NextResponse.json({
			success: true,
			message: "Store and all associated data deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting store:", error);
		return NextResponse.json(
			{ error: "Failed to delete store" },
			{ status: 500 }
		);
	}
}
