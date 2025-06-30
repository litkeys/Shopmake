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
import { Users, UserPlus, Shield } from "lucide-react";
import { getAdminEmails, isAdminEmail } from "@/lib/admin";

export default async function AdminPage() {
	const { userId } = auth();

	if (!userId) {
		redirect("/sign-in");
	}

	const user = await currentUser();
	const userEmail = user?.emailAddresses[0]?.emailAddress;

	// Check if current user is an admin
	if (!userEmail || !isAdminEmail(userEmail)) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<Card className="max-w-md">
					<CardHeader>
						<CardTitle className="flex items-center text-red-600">
							<Shield className="mr-2 h-5 w-5" />
							Access Denied
						</CardTitle>
						<CardDescription>
							You don&apos;t have permission to access the admin
							panel.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<a href="/dashboard">
							<Button>Back to Dashboard</Button>
						</a>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900">
						Admin Panel
					</h1>
					<p className="text-gray-600">
						Manage user access and invitations
					</p>
				</div>

				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<Users className="mr-2 h-5 w-5" />
								User Management
							</CardTitle>
							<CardDescription>
								Manage existing users and permissions
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="text-center py-4">
								<p className="text-sm text-gray-500 mb-4">
									Configure user management in your Clerk
									dashboard
								</p>
								<a
									href="https://dashboard.clerk.com"
									target="_blank"
									rel="noopener noreferrer"
								>
									<Button variant="outline">
										Open Clerk Dashboard
									</Button>
								</a>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<UserPlus className="mr-2 h-5 w-5" />
								Invite Users
							</CardTitle>
							<CardDescription>
								Send invitations to new users
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="text-center py-4">
								<p className="text-sm text-gray-500 mb-4">
									Use Clerk&apos;s invitation system to add
									new users
								</p>
								<a
									href="https://dashboard.clerk.com"
									target="_blank"
									rel="noopener noreferrer"
								>
									<Button variant="default">
										Send Invitation
									</Button>
								</a>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Current Admins</CardTitle>
							<CardDescription>
								Users with admin access
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								{getAdminEmails().map(
									(email: string, index: number) => (
										<div
											key={index}
											className="flex items-center text-sm"
										>
											<Shield className="mr-2 h-4 w-4 text-green-600" />
											<span
												className={
													email === userEmail
														? "font-semibold"
														: ""
												}
											>
												{email}
												{email === userEmail &&
													" (You)"}
											</span>
										</div>
									)
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="mt-8">
					<Card>
						<CardHeader>
							<CardTitle>Access Control Instructions</CardTitle>
							<CardDescription>
								How to manage user access to your application
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="prose max-w-none">
								<h4 className="font-semibold mb-2">
									Clerk Dashboard Configuration:
								</h4>
								<ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
									<li>
										Go to your{" "}
										<a
											href="https://dashboard.clerk.com"
											target="_blank"
											className="text-blue-600 hover:underline"
										>
											Clerk Dashboard
										</a>
									</li>
									<li>
										Navigate to &quot;User &
										Authentication&quot; →
										&quot;Restrictions&quot;
									</li>
									<li>
										Enable &quot;Allowlist&quot; to restrict
										sign-ups to specific email addresses
									</li>
									<li>
										Add allowed email addresses or domains
										(e.g., @yourcompany.com)
									</li>
									<li>
										Optionally disable public sign-ups
										entirely
									</li>
								</ol>

								<h4 className="font-semibold mb-2 mt-6">
									Invitation System:
								</h4>
								<ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
									<li>
										Use Clerk's invitation system to send
										email invites
									</li>
									<li>
										Set up custom invitation emails with
										your branding
									</li>
									<li>
										Control exactly who can join your
										application
									</li>
								</ul>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
