import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, User, Bell, Shield, CreditCard } from "lucide-react";

export default function SettingsPage() {
	return (
		<div>
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900">Settings</h1>
				<p className="text-gray-600">
					Manage your account preferences and application settings.
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<User className="mr-2 h-5 w-5" />
							Profile Settings
						</CardTitle>
						<CardDescription>
							Update your personal information and preferences
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">
								Display Name
							</label>
							<div className="p-2 bg-gray-50 rounded text-sm text-gray-600">
								Your current display name
							</div>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">
								Email Address
							</label>
							<div className="p-2 bg-gray-50 rounded text-sm text-gray-600">
								your.email@example.com
							</div>
						</div>
						<Button variant="outline" className="w-full">
							Edit Profile
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<Bell className="mr-2 h-5 w-5" />
							Notifications
						</CardTitle>
						<CardDescription>
							Configure how you receive notifications
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium">
									Email Notifications
								</p>
								<p className="text-xs text-gray-500">
									Receive updates via email
								</p>
							</div>
							<Button variant="outline" size="sm">
								Configure
							</Button>
						</div>
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium">
									Push Notifications
								</p>
								<p className="text-xs text-gray-500">
									Browser push notifications
								</p>
							</div>
							<Button variant="outline" size="sm">
								Configure
							</Button>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<Shield className="mr-2 h-5 w-5" />
							Security
						</CardTitle>
						<CardDescription>
							Manage your account security settings
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium">
									Two-Factor Authentication
								</p>
								<p className="text-xs text-gray-500">
									Add an extra layer of security
								</p>
							</div>
							<Button variant="outline" size="sm">
								Enable
							</Button>
						</div>
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium">Password</p>
								<p className="text-xs text-gray-500">
									Last changed 30 days ago
								</p>
							</div>
							<Button variant="outline" size="sm">
								Change
							</Button>
						</div>
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium">
									Active Sessions
								</p>
								<p className="text-xs text-gray-500">
									Manage logged-in devices
								</p>
							</div>
							<Button variant="outline" size="sm">
								View
							</Button>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<CreditCard className="mr-2 h-5 w-5" />
							Billing & Subscription
						</CardTitle>
						<CardDescription>
							Manage your billing information and subscription
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<p className="text-sm font-medium">Current Plan</p>
							<div className="p-3 bg-indigo-50 rounded-lg">
								<p className="text-sm font-semibold text-indigo-900">
									Professional Plan
								</p>
								<p className="text-xs text-indigo-600">
									$29/month • Renews Jan 15, 2024
								</p>
							</div>
						</div>
						<div className="space-y-2">
							<Button variant="outline" className="w-full">
								View Billing History
							</Button>
							<Button variant="outline" className="w-full">
								Update Payment Method
							</Button>
							<Button variant="outline" className="w-full">
								Change Plan
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="mt-8">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<Settings className="mr-2 h-5 w-5" />
							Application Preferences
						</CardTitle>
						<CardDescription>
							Customize your application experience
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4 md:grid-cols-2">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium">Theme</p>
									<p className="text-xs text-gray-500">
										Choose your preferred theme
									</p>
								</div>
								<Button variant="outline" size="sm">
									Light
								</Button>
							</div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium">
										Language
									</p>
									<p className="text-xs text-gray-500">
										Application language
									</p>
								</div>
								<Button variant="outline" size="sm">
									English
								</Button>
							</div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium">
										Timezone
									</p>
									<p className="text-xs text-gray-500">
										Your local timezone
									</p>
								</div>
								<Button variant="outline" size="sm">
									UTC-5
								</Button>
							</div>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium">
										Data Export
									</p>
									<p className="text-xs text-gray-500">
										Download your data
									</p>
								</div>
								<Button variant="outline" size="sm">
									Export
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
