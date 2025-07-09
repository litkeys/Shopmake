import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { getStore, getStoreData, upsertStoreData } from "@/lib/supabase";

export async function GET(
	request: NextRequest,
	{ params }: { params: { storeId: string } }
) {
	try {
		const { userId } = auth();

		if (!userId) {
			return NextResponse.json(
				{ error: "Not authenticated" },
				{ status: 401 }
			);
		}

		const store = await getStore(params.storeId);

		if (!store) {
			return NextResponse.json(
				{ error: "Store not found" },
				{ status: 404 }
			);
		}

		// Check ownership
		if (store.created_by !== userId) {
			return NextResponse.json(
				{ error: "Access denied" },
				{ status: 403 }
			);
		}

		const storeData = await getStoreData(params.storeId);

		return NextResponse.json({
			data: {
				store,
				storeData,
			},
		});
	} catch (error) {
		console.error("Error fetching store:", error);
		return NextResponse.json(
			{ error: "Failed to fetch store" },
			{ status: 500 }
		);
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: { storeId: string } }
) {
	try {
		const { userId } = auth();

		if (!userId) {
			return NextResponse.json(
				{ error: "Not authenticated" },
				{ status: 401 }
			);
		}

		const store = await getStore(params.storeId);

		if (!store) {
			return NextResponse.json(
				{ error: "Store not found" },
				{ status: 404 }
			);
		}

		// Check ownership
		if (store.created_by !== userId) {
			return NextResponse.json(
				{ error: "Access denied" },
				{ status: 403 }
			);
		}

		const storeData = await request.json();

		const updatedStoreData = await upsertStoreData(
			params.storeId,
			storeData
		);

		return NextResponse.json({ data: updatedStoreData });
	} catch (error) {
		console.error("Error updating store data:", error);
		return NextResponse.json(
			{ error: "Failed to update store data" },
			{ status: 500 }
		);
	}
}
