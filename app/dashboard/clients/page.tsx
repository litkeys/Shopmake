import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";

export default function ClientsPage() {
	return (
		<div>
			<div className="mb-8">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">
							Clients
						</h1>
						<p className="text-gray-600">
							Manage your client relationships and projects.
						</p>
					</div>
					<Button>
						<Plus className="mr-2 h-4 w-4" />
						Add Client
					</Button>
				</div>
			</div>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<Users className="mr-2 h-5 w-5" />
							Total Clients
						</CardTitle>
						<CardDescription>
							Active client accounts
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">24</div>
						<p className="text-sm text-muted-foreground">
							+2 from last month
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Recent Activity</CardTitle>
						<CardDescription>
							Latest client interactions
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<p className="text-sm">• New client onboarded</p>
							<p className="text-sm">
								• Project milestone reached
							</p>
							<p className="text-sm">• Contract renewed</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Quick Actions</CardTitle>
						<CardDescription>Common client tasks</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						<Button variant="outline" className="w-full">
							View All Clients
						</Button>
						<Button variant="outline" className="w-full">
							Generate Report
						</Button>
						<Button variant="outline" className="w-full">
							Import Clients
						</Button>
					</CardContent>
				</Card>
			</div>

			<div className="mt-8">
				<Card>
					<CardHeader>
						<CardTitle>Client List</CardTitle>
						<CardDescription>
							Your active clients will appear here once you start
							adding them.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-center py-12">
							<Users className="mx-auto h-12 w-12 text-gray-400" />
							<h3 className="mt-2 text-sm font-semibold text-gray-900">
								No clients yet
							</h3>
							<p className="mt-1 text-sm text-gray-500">
								Get started by adding your first client.
							</p>
							<div className="mt-6">
								<Button>
									<Plus className="mr-2 h-4 w-4" />
									Add Client
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
