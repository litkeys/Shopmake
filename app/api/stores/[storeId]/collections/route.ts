import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import {
	getStore,
	getStoreCollections,
	createStoreCollection,
} from "@/lib/supabase";

export async function GET(
	request: NextRequest,
	{ params }: { params: { storeId: string } }
) {
	try {
		const { userId } = auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
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

		const collections = await getStoreCollections(storeId);

		return NextResponse.json({ data: collections });
	} catch (error) {
		console.error("Error fetching store collections:", error);
		return NextResponse.json(
			{ error: "Failed to fetch store collections" },
			{ status: 500 }
		);
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: { storeId: string } }
) {
	try {
		const { userId } = auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
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

		const body = await request.json();
		const { title, description } = body;

		if (!title || !title.trim()) {
			return NextResponse.json(
				{ error: "Collection title is required" },
				{ status: 400 }
			);
		}

		const collection = await createStoreCollection(storeId, {
			title: title.trim(),
			description: description?.trim() || "",
		});

		return NextResponse.json({ data: collection });
	} catch (error) {
		console.error("Error creating store collection:", error);
		return NextResponse.json(
			{ error: "Failed to create store collection" },
			{ status: 500 }
		);
	}
}
