import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { isAdminEmail } from "@/lib/admin";

export async function POST(request: NextRequest) {
	try {
		// Verify the user is authenticated
		const { userId } = auth();
		if (!userId) {
			return NextResponse.json(
				{ isAdmin: false, error: "Not authenticated" },
				{ status: 401 }
			);
		}

		const body = await request.json();
		const { email } = body;

		if (!email || typeof email !== "string") {
			return NextResponse.json(
				{ isAdmin: false, error: "Invalid email" },
				{ status: 400 }
			);
		}

		// Check if the email is in the admin list
		const adminStatus = isAdminEmail(email);

		return NextResponse.json({ isAdmin: adminStatus });
	} catch (error) {
		console.error("Error checking admin status:", error);
		return NextResponse.json(
			{ isAdmin: false, error: "Internal server error" },
			{ status: 500 }
		);
	}
}
