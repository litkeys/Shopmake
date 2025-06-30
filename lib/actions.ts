"use server";

import { auth, currentUser } from "@clerk/nextjs";
import { isAdminEmail } from "./admin";

export async function checkIsAdmin(): Promise<boolean> {
	try {
		const { userId } = auth();
		if (!userId) return false;

		const user = await currentUser();
		const userEmail = user?.emailAddresses[0]?.emailAddress;

		return userEmail ? isAdminEmail(userEmail) : false;
	} catch (error) {
		console.error("Error checking admin status:", error);
		return false;
	}
}
