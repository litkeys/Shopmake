import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createStore, getStores } from "@/lib/supabase";

export async function GET() {
	try {
		const { userId } = auth();

		if (!userId) {
			return NextResponse.json(
				{ error: "Not authenticated" },
				{ status: 401 }
			);
		}

		const stores = await getStores(userId);
		return NextResponse.json({ data: stores });
	} catch (error) {
		console.error("Error fetching stores:", error);
		return NextResponse.json(
			{ error: "Failed to fetch stores" },
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const { userId } = auth();

		if (!userId) {
			return NextResponse.json(
				{ error: "Not authenticated" },
				{ status: 401 }
			);
		}

		const { name } = await request.json();

		if (!name) {
			return NextResponse.json(
				{ error: "Store name is required" },
				{ status: 400 }
			);
		}

		const store = await createStore(name, userId);
		return NextResponse.json({ data: store });
	} catch (error) {
		console.error("Error creating store:", error);
		return NextResponse.json(
			{ error: "Failed to create store" },
			{ status: 500 }
		);
	}
}
