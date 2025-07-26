import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import {
	getShippingOptions,
	createShippingOption,
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

		// Get shipping options
		const shippingOptions = await getShippingOptions(storeId);

		return NextResponse.json({
			success: true,
			data: shippingOptions,
		});
	} catch (error) {
		console.error("Error fetching shipping options:", error);
		return NextResponse.json(
			{ error: "Failed to fetch shipping options" },
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

		// Get shipping option data from request body
		const shippingOptionData = await request.json();

		// Validate required fields
		if (!shippingOptionData.name?.trim()) {
			return NextResponse.json(
				{ error: "Shipping option name is required" },
				{ status: 400 }
			);
		}

		if (
			!shippingOptionData.delivery_min_days ||
			shippingOptionData.delivery_min_days < 1
		) {
			return NextResponse.json(
				{ error: "Minimum delivery days must be at least 1" },
				{ status: 400 }
			);
		}

		if (
			!shippingOptionData.delivery_max_days ||
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

		// Create shipping option
		const shippingOption = await createShippingOption(storeId, {
			name: shippingOptionData.name,
			delivery_min_days: parseInt(shippingOptionData.delivery_min_days),
			delivery_max_days: parseInt(shippingOptionData.delivery_max_days),
		});

		return NextResponse.json({
			success: true,
			data: shippingOption,
		});
	} catch (error) {
		console.error("Error creating shipping option:", error);
		return NextResponse.json(
			{ error: "Failed to create shipping option" },
			{ status: 500 }
		);
	}
}
