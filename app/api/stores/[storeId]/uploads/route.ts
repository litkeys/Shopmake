import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { getStore, getStoreUploads } from "@/lib/supabase";

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

		const url = new URL(request.url);
		const fileType = url.searchParams.get("fileType") || undefined;

		const uploads = await getStoreUploads(params.storeId, fileType);

		return NextResponse.json({ data: uploads });
	} catch (error) {
		console.error("Error fetching uploads:", error);
		return NextResponse.json(
			{ error: "Failed to fetch uploads" },
			{ status: 500 }
		);
	}
}
