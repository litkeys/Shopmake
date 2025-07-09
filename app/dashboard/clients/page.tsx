import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, Store as StoreIcon, Calendar } from "lucide-react";
import { getStores } from "@/lib/supabase";
import { Store } from "@/types";
import Link from "next/link";

export default async function ClientsPage() {
	const { userId } = auth();

	if (!userId) {
		redirect("/sign-in");
	}

	let stores: Store[] = [];
	let error: string | null = null;

	try {
		stores = await getStores(userId);
	} catch (err) {
		error = err instanceof Error ? err.message : "Failed to load stores";
	}

	return (
		<div>
			<div className="mb-8">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">
							Clients
						</h1>
						<p className="text-gray-600">
							Manage your client stores and projects.
						</p>
					</div>
					<Button asChild>
						<Link href="/dashboard/clients/new">
							<Plus className="mr-2 h-4 w-4" />
							New Client
						</Link>
					</Button>
				</div>
			</div>

			{error && (
				<div className="mb-6">
					<Card className="border-red-200 bg-red-50">
						<CardContent className="pt-6">
							<p className="text-red-800">{error}</p>
						</CardContent>
					</Card>
				</div>
			)}

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<Users className="mr-2 h-5 w-5" />
							Total Clients
						</CardTitle>
						<CardDescription>Active client stores</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">
							{stores.length}
						</div>
						<p className="text-sm text-muted-foreground">
							{stores.length === 1 ? "store" : "stores"} managed
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Recent Activity</CardTitle>
						<CardDescription>Latest store updates</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{stores.slice(0, 3).map((store) => (
								<p key={store.id} className="text-sm">
									• {store.name} updated
								</p>
							))}
							{stores.length === 0 && (
								<p className="text-sm text-muted-foreground">
									No recent activity
								</p>
							)}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Quick Actions</CardTitle>
						<CardDescription>Common tasks</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						<Button variant="outline" className="w-full" asChild>
							<Link href="/dashboard/clients/new">
								Add New Client
							</Link>
						</Button>
						<Button variant="outline" className="w-full">
							Export Data
						</Button>
						<Button variant="outline" className="w-full">
							View Analytics
						</Button>
					</CardContent>
				</Card>
			</div>

			<div className="mt-8">
				<Card>
					<CardHeader>
						<CardTitle>Client Stores</CardTitle>
						<CardDescription>
							Manage your client stores and their data
						</CardDescription>
					</CardHeader>
					<CardContent>
						{stores.length === 0 ? (
							<div className="text-center py-12">
								<StoreIcon className="mx-auto h-12 w-12 text-gray-400" />
								<h3 className="mt-2 text-sm font-semibold text-gray-900">
									No client stores yet
								</h3>
								<p className="mt-1 text-sm text-gray-500">
									Get started by adding your first client
									store.
								</p>
								<div className="mt-6">
									<Button asChild>
										<Link href="/dashboard/clients/new">
											<Plus className="mr-2 h-4 w-4" />
											Add Client Store
										</Link>
									</Button>
								</div>
							</div>
						) : (
							<div className="space-y-4">
								{stores.map((store) => (
									<div
										key={store.id}
										className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
									>
										<div className="flex items-center space-x-4">
											<div className="bg-blue-100 p-2 rounded-lg">
												<StoreIcon className="h-5 w-5 text-blue-600" />
											</div>
											<div>
												<h3 className="font-semibold text-gray-900">
													{store.name}
												</h3>
												<div className="flex items-center text-sm text-gray-500 mt-1">
													<Calendar className="h-4 w-4 mr-1" />
													Created{" "}
													{new Date(
														store.created_at
													).toLocaleDateString()}
												</div>
											</div>
										</div>
										<div className="flex items-center space-x-2">
											<Button
												variant="outline"
												size="sm"
												asChild
											>
												<Link
													href={`/dashboard/clients/${store.id}`}
												>
													Edit
												</Link>
											</Button>
											{store.shopify_store_domain && (
												<Button
													variant="outline"
													size="sm"
													asChild
												>
													<a
														href={`https://${store.shopify_store_domain}`}
														target="_blank"
														rel="noopener noreferrer"
													>
														View Store
													</a>
												</Button>
											)}
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
