import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import {
	updateShippingOption,
	deleteShippingOption,
	getStore,
} from "@/lib/supabase";

export async function PUT(
	request: NextRequest,
	{ params }: { params: { storeId: string; shippingOptionId: string } }
) {
	try {
		const { userId } = auth();

		if (!userId) {
			return NextResponse.json(
				{ error: "Not authenticated" },
				{ status: 401 }
			);
		}

		const { storeId, shippingOptionId } = params;

		// Verify store ownership
		const store = await getStore(storeId);
		if (!store || store.created_by !== userId) {
			return NextResponse.json(
				{ error: "Store not found or access denied" },
				{ status: 404 }
			);
		}

		// Get shipping option data from request body
		const shippingOptionData = await request.json();

		// Validate data if provided
		if (
			shippingOptionData.delivery_min_days &&
			shippingOptionData.delivery_min_days < 1
		) {
			return NextResponse.json(
				{ error: "Minimum delivery days must be at least 1" },
				{ status: 400 }
			);
		}

		if (
			shippingOptionData.delivery_max_days &&
			shippingOptionData.delivery_min_days &&
			shippingOptionData.delivery_max_days <
				shippingOptionData.delivery_min_days
		) {
			return NextResponse.json(
				{
					error: "Maximum delivery days must be greater than or equal to minimum delivery days",
				},
				{ status: 400 }
			);
		}

		// Update shipping option
		const shippingOption = await updateShippingOption(shippingOptionId, {
			name: shippingOptionData.name,
			delivery_min_days: shippingOptionData.delivery_min_days
				? parseInt(shippingOptionData.delivery_min_days)
				: undefined,
			delivery_max_days: shippingOptionData.delivery_max_days
				? parseInt(shippingOptionData.delivery_max_days)
				: undefined,
		});

		return NextResponse.json({
			success: true,
			data: shippingOption,
		});
	} catch (error) {
		console.error("Error updating shipping option:", error);
		return NextResponse.json(
			{ error: "Failed to update shipping option" },
			{ status: 500 }
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { storeId: string; shippingOptionId: string } }
) {
	try {
		const { userId } = auth();

		if (!userId) {
			return NextResponse.json(
				{ error: "Not authenticated" },
				{ status: 401 }
			);
		}

		const { storeId, shippingOptionId } = params;

		// Verify store ownership
		const store = await getStore(storeId);
		if (!store || store.created_by !== userId) {
			return NextResponse.json(
				{ error: "Store not found or access denied" },
				{ status: 404 }
			);
		}

		// Delete shipping option
		await deleteShippingOption(shippingOptionId);

		return NextResponse.json({
			success: true,
			message: "Shipping option deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting shipping option:", error);
		return NextResponse.json(
			{ error: "Failed to delete shipping option" },
			{ status: 500 }
		);
	}
}
