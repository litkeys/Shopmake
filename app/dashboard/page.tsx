import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
	const { userId } = auth();

	if (!userId) {
		redirect("/");
	}

	// Redirect to clients page since it's the only implemented functionality
	redirect("/dashboard/clients");
}
