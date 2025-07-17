import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { getStore, createCollectionMapping } from "@/lib/supabase";

export async function POST(
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
		const { mapping_type, mapping_value } = body;

		if (!mapping_type || !mapping_value) {
			return NextResponse.json(
				{ error: "Mapping type and value are required" },
				{ status: 400 }
			);
		}

		const validTypes = ["product_tag", "product_type", "product_category"];
		if (!validTypes.includes(mapping_type)) {
			return NextResponse.json(
				{ error: "Invalid mapping type" },
				{ status: 400 }
			);
		}

		const mapping = await createCollectionMapping(collectionId, {
			mapping_type,
			mapping_value: mapping_value.trim(),
		});

		return NextResponse.json({ data: mapping });
	} catch (error) {
		console.error("Error creating collection mapping:", error);
		return NextResponse.json(
			{ error: "Failed to create collection mapping" },
			{ status: 500 }
		);
	}
}
