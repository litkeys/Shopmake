import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import {
	getStore,
	updateStoreCollection,
	deleteStoreCollection,
} from "@/lib/supabase";

export async function PUT(
	request: NextRequest,
	{ params }: { params: { storeId: string; collectionId: string } }
) {
	try {
		const { userId } = auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const { storeId, collectionId } = params;

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

		const body = await request.json();
		const { title, description } = body;

		const updateData: any = {};
		if (title !== undefined) {
			if (!title || !title.trim()) {
				return NextResponse.json(
					{ error: "Collection title is required" },
					{ status: 400 }
				);
			}
			updateData.title = title.trim();
		}
		if (description !== undefined) {
			updateData.description = description || "";
		}

		const collection = await updateStoreCollection(
			collectionId,
			updateData
		);

		return NextResponse.json({ data: collection });
	} catch (error) {
		console.error("Error updating store collection:", error);
		return NextResponse.json(
			{ error: "Failed to update store collection" },
			{ status: 500 }
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { storeId: string; collectionId: string } }
) {
	try {
		const { userId } = auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const { storeId, collectionId } = params;

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

		await deleteStoreCollection(collectionId);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting store collection:", error);
		return NextResponse.json(
			{ error: "Failed to delete store collection" },
			{ status: 500 }
		);
	}
}
