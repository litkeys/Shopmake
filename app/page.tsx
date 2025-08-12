import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default async function HomePage() {
	const { userId } = auth();

	if (userId) {
		// User is signed in, redirect to dashboard
		redirect("/dashboard");
	} else {
		// User is not signed in, redirect to sign-in
		redirect("/sign-in");
	}

	// This return statement will never be reached, but TypeScript requires it
	return null;
}
