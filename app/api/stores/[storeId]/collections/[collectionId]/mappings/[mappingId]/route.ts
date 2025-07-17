import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import {
	getStore,
	updateCollectionMapping,
	deleteCollectionMapping,
} from "@/lib/supabase";

export async function PUT(
	request: NextRequest,
	{
		params,
	}: { params: { storeId: string; collectionId: string; mappingId: string } }
) {
	try {
		const { userId } = auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const { storeId, mappingId } = params;

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
		const { mapping_type, mapping_value } = body;

		const updateData: any = {};
		if (mapping_type !== undefined) {
			const validTypes = [
				"product_tag",
				"product_type",
				"product_category",
			];
			if (!validTypes.includes(mapping_type)) {
				return NextResponse.json(
					{ error: "Invalid mapping type" },
					{ status: 400 }
				);
			}
			updateData.mapping_type = mapping_type;
		}
		if (mapping_value !== undefined) {
			updateData.mapping_value = mapping_value || "";
		}

		const mapping = await updateCollectionMapping(mappingId, updateData);

		return NextResponse.json({ data: mapping });
	} catch (error) {
		console.error("Error updating collection mapping:", error);
		return NextResponse.json(
			{ error: "Failed to update collection mapping" },
			{ status: 500 }
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{
		params,
	}: { params: { storeId: string; collectionId: string; mappingId: string } }
) {
	try {
		const { userId } = auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const { storeId, mappingId } = params;

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

		await deleteCollectionMapping(mappingId);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting collection mapping:", error);
		return NextResponse.json(
			{ error: "Failed to delete collection mapping" },
			{ status: 500 }
		);
	}
}
