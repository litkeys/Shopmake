import { auth, currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";

export default async function HomePage() {
	const { userId } = auth();

	if (userId) {
		// Check if user is admin
		const user = await currentUser();
		const userEmail = user?.emailAddresses[0]?.emailAddress;

		if (userEmail && isAdminEmail(userEmail)) {
			redirect("/dashboard");
		} else {
			// User is signed in but not admin - redirect to sign-in with a message
			redirect("/sign-in?error=admin_required");
		}
	} else {
		redirect("/sign-in");
	}

	// This return statement will never be reached, but TypeScript requires it
	return null;
}
