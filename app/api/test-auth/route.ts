import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
	try {
		const { userId } = auth();

		if (!userId) {
			return NextResponse.json(
				{ error: "Not authenticated" },
				{ status: 401 }
			);
		}

		// Test querying stores with RLS
		const { data, error } = await supabase
			.from("stores")
			.select("*")
			.eq("created_by", userId);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			userId,
			stores: data,
			message: "Clerk-Supabase integration working!",
		});
	} catch (error) {
		return NextResponse.json(
			{
				error: "Server error",
				details:
					error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
