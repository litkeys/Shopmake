import { auth, currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
	const { userId } = auth();

	if (!userId) {
		redirect("/");
	}

	const user = await currentUser();

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
				<p className="text-gray-600">
					Welcome back, {user?.firstName}! Here's what's happening.
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Welcome Back!</CardTitle>
						<CardDescription>
							Hello, {user?.firstName || "User"}!
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-gray-600">
							Welcome to your dashboard. This is where your SaaS
							magic happens.
						</p>
						<Button className="mt-4" variant="default">
							Get Started
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Quick Stats</CardTitle>
						<CardDescription>Your account overview</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<p className="text-sm text-gray-600">
								Email: {user?.emailAddresses[0]?.emailAddress}
							</p>
							<p className="text-sm text-gray-600">
								Joined:{" "}
								{user?.createdAt
									? new Date(
											user.createdAt
									  ).toLocaleDateString()
									: "N/A"}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Actions</CardTitle>
						<CardDescription>
							Quick actions for your account
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						<Button variant="outline" className="w-full">
							Settings
						</Button>
						<Button variant="outline" className="w-full">
							Profile
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
