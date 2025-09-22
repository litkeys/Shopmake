"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import {
	Menu,
	X,
	LayoutDashboard,
	Users,
	Settings,
	LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DashboardLayoutProps {
	children: React.ReactNode;
}

// Navigation items for the dashboard

const navigation = [
	{ name: "Clients", href: "/dashboard/clients", icon: Users },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const pathname = usePathname();
	const { signOut } = useClerk();
	const { user, isLoaded, isSignedIn } = useUser();

	const navigationItems = navigation;

	const handleSignOut = () => {
		signOut();
	};

	// Show loading state while Clerk is checking authentication
	if (!isLoaded) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
					<p className="mt-4 text-gray-600">Loading...</p>
				</div>
			</div>
		);
	}

	// If user is not signed in, redirect to sign-in
	if (!isSignedIn) {
		window.location.href = "/sign-in";
		return null;
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Mobile sidebar overlay and panel */}
			{sidebarOpen && (
				<div className="relative z-50 lg:hidden">
					{/* Overlay */}
					<div
						className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm"
						onClick={() => setSidebarOpen(false)}
					/>

					{/* Sidebar panel */}
					<div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl">
						<div className="flex h-full flex-col">
							<div className="flex h-16 shrink-0 items-center justify-between px-4 border-b">
								<span className="text-xl font-semibold text-gray-900">
									Genesis
								</span>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setSidebarOpen(false)}
								>
									<X className="h-6 w-6" />
								</Button>
							</div>
							<nav className="flex-1 space-y-1 px-2 py-4">
								{navigationItems.map((item) => {
									const isActive = pathname === item.href;
									return (
										<Link
											key={item.name}
											href={item.href}
											onClick={() =>
												setSidebarOpen(false)
											}
											className={cn(
												isActive
													? "bg-gray-100 text-gray-900"
													: "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
												"group flex items-center px-2 py-2 text-sm font-medium rounded-md"
											)}
										>
											<item.icon
												className={cn(
													isActive
														? "text-gray-500"
														: "text-gray-400 group-hover:text-gray-500",
													"mr-3 h-6 w-6 shrink-0"
												)}
											/>
											{item.name}
										</Link>
									);
								})}
							</nav>
							<div className="border-t p-4">
								<Button
									variant="ghost"
									onClick={handleSignOut}
									className="flex w-full items-center justify-start px-2 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
								>
									<LogOut className="mr-3 h-5 w-5" />
									Sign Out
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Desktop sidebar */}
			<div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
				<div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 border-r">
					<div className="flex h-16 shrink-0 items-center">
						<span className="text-xl font-semibold text-gray-900">
							Genesis Project
						</span>
					</div>
					<nav className="flex flex-1 flex-col">
						<ul
							role="list"
							className="flex flex-1 flex-col gap-y-7"
						>
							<li>
								<ul role="list" className="-mx-2 space-y-1">
									{navigationItems.map((item) => {
										const isActive = pathname === item.href;
										return (
											<li key={item.name}>
												<Link
													href={item.href}
													className={cn(
														isActive
															? "bg-gray-50 text-indigo-600"
															: "text-gray-700 hover:text-indigo-600 hover:bg-gray-50",
														"group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
													)}
												>
													<item.icon
														className={cn(
															isActive
																? "text-indigo-600"
																: "text-gray-400 group-hover:text-indigo-600",
															"h-6 w-6 shrink-0"
														)}
													/>
													{item.name}
												</Link>
											</li>
										);
									})}
								</ul>
							</li>
							<li className="mt-auto">
								<Button
									variant="ghost"
									onClick={handleSignOut}
									className="group -mx-2 flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
								>
									<LogOut className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-indigo-600" />
									Sign Out
								</Button>
							</li>
						</ul>
					</nav>
				</div>
			</div>

			{/* Main content */}
			<div className="lg:pl-64">
				{/* Top bar */}
				<div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setSidebarOpen(true)}
						className="lg:hidden"
					>
						<Menu className="h-6 w-6" />
					</Button>

					{/* Separator */}
					<div
						className="h-6 w-px bg-gray-200 lg:hidden"
						aria-hidden="true"
					/>

					<div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
						<div className="flex flex-1" />
						<div className="flex items-center gap-x-4 lg:gap-x-6">
							{/* Profile dropdown */}
							<div className="flex items-center gap-x-2">
								<Avatar className="h-8 w-8">
									<AvatarImage
										src={user?.imageUrl}
										alt={user?.firstName || "User"}
									/>
									<AvatarFallback className="bg-indigo-100 text-indigo-600">
										{user?.firstName?.charAt(0) || "U"}
									</AvatarFallback>
								</Avatar>
								<span className="hidden text-sm font-medium text-gray-700 lg:block">
									{user?.firstName || "User"}
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Page content */}
				<main className="py-6">
					<div className="px-4 sm:px-6 lg:px-8">{children}</div>
				</main>
			</div>
		</div>
	);
}
