import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import {
	getStoreLocations,
	createStoreLocation,
	getStore,
} from "@/lib/supabase";

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

		const storeId = params.storeId;

		// Verify store ownership
		const store = await getStore(storeId);
		if (!store || store.created_by !== userId) {
			return NextResponse.json(
				{ error: "Store not found or access denied" },
				{ status: 404 }
			);
		}

		// Get store locations
		const locations = await getStoreLocations(storeId);

		return NextResponse.json({
			success: true,
			data: locations,
		});
	} catch (error) {
		console.error("Error fetching store locations:", error);
		return NextResponse.json(
			{ error: "Failed to fetch store locations" },
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
				{ error: "Not authenticated" },
				{ status: 401 }
			);
		}

		const storeId = params.storeId;

		// Verify store ownership
		const store = await getStore(storeId);
		if (!store || store.created_by !== userId) {
			return NextResponse.json(
				{ error: "Store not found or access denied" },
				{ status: 404 }
			);
		}

		// Get location data from request body
		const locationData = await request.json();

		// Validate required fields
		if (!locationData.name?.trim()) {
			return NextResponse.json(
				{ error: "Location name is required" },
				{ status: 400 }
			);
		}

		// Create location
		const location = await createStoreLocation(storeId, {
			name: locationData.name,
			address: locationData.address || "",
			city: locationData.city || "",
			country: locationData.country || "",
			phone: locationData.phone || "",
		});

		return NextResponse.json({
			success: true,
			data: location,
		});
	} catch (error) {
		console.error("Error creating store location:", error);
		return NextResponse.json(
			{ error: "Failed to create store location" },
			{ status: 500 }
		);
	}
}
