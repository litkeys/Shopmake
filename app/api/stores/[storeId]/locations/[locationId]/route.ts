import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import {
	updateStoreLocation,
	deleteStoreLocation,
	getStore,
} from "@/lib/supabase";

export async function PUT(
	request: NextRequest,
	{ params }: { params: { storeId: string; locationId: string } }
) {
	try {
		const { userId } = auth();

		if (!userId) {
			return NextResponse.json(
				{ error: "Not authenticated" },
				{ status: 401 }
			);
		}

		const { storeId, locationId } = params;

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

		// Update location
		const location = await updateStoreLocation(locationId, {
			name: locationData.name,
			address: locationData.address,
			city: locationData.city,
			country: locationData.country,
			phone: locationData.phone,
		});

		return NextResponse.json({
			success: true,
			data: location,
		});
	} catch (error) {
		console.error("Error updating store location:", error);
		return NextResponse.json(
			{ error: "Failed to update store location" },
			{ status: 500 }
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { storeId: string; locationId: string } }
) {
	try {
		const { userId } = auth();

		if (!userId) {
			return NextResponse.json(
				{ error: "Not authenticated" },
				{ status: 401 }
			);
		}

		const { storeId, locationId } = params;

		// Verify store ownership
		const store = await getStore(storeId);
		if (!store || store.created_by !== userId) {
			return NextResponse.json(
				{ error: "Store not found or access denied" },
				{ status: 404 }
			);
		}

		// Delete location
		await deleteStoreLocation(locationId);

		return NextResponse.json({
			success: true,
			message: "Location deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting store location:", error);
		return NextResponse.json(
			{ error: "Failed to delete store location" },
			{ status: 500 }
		);
	}
}
