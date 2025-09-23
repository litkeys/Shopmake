"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PublicTermsPage() {
	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white border-b">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						<div className="flex items-center gap-4">
							<Link href="/">
								<Button variant="ghost" size="sm">
									<ArrowLeft className="w-4 h-4 mr-2" />
									Back to Home
								</Button>
							</Link>
							<h1 className="text-xl font-semibold text-gray-900">
								Shopmake
							</h1>
						</div>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="space-y-6">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">
							Terms of Service
						</h1>
						<p className="mt-2 text-lg text-gray-600">
							Please read these terms and conditions carefully
							before using our application.
						</p>
					</div>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg font-semibold text-red-600">
								⚠️ Important Disclaimer
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="bg-red-50 border border-red-200 rounded-lg p-4">
								<p className="text-sm text-red-800 font-medium mb-2">
									Limitation of Liability
								</p>
								<p className="text-sm text-red-700">
									The developers of this application
									("Shopmake") are <strong>NOT LIABLE</strong>{" "}
									for any consequences, damages, losses, or
									issues that may arise from using this
									application. This includes but is not
									limited to:
								</p>
								<ul className="list-disc list-inside mt-2 text-sm text-red-700 space-y-1">
									<li>
										Business losses or financial damages
										resulting from store generation or
										management
									</li>
									<li>
										Data loss, corruption, or unauthorized
										access to your Shopify store
									</li>
									<li>
										Incorrect product configurations,
										pricing, or inventory management
									</li>
									<li>
										Any disruption to your business
										operations or customer experience
									</li>
									<li>
										Third-party integration failures or
										API-related issues
									</li>
								</ul>
							</div>

							<div className="prose prose-sm max-w-none">
								<h3 className="text-lg font-semibold text-gray-900 mt-6">
									Use at Your Own Risk
								</h3>
								<p className="text-gray-700">
									By using this application, you acknowledge
									and agree that:
								</p>
								<ul className="list-disc list-inside text-gray-700 space-y-1">
									<li>
										You use this application entirely at
										your own risk and discretion
									</li>
									<li>
										You are responsible for backing up your
										data and monitoring your store's
										performance
									</li>
									<li>
										You will not hold the developers liable
										for any direct, indirect, incidental,
										consequential, or punitive damages
									</li>
									<li>
										You understand that this application is
										provided "as is" without any warranties
										or guarantees
									</li>
								</ul>

								<h3 className="text-lg font-semibold text-gray-900 mt-6">
									Recommended Precautions
								</h3>
								<p className="text-gray-700">
									We strongly recommend that you:
								</p>
								<ul className="list-disc list-inside text-gray-700 space-y-1">
									<li>
										Test all generated content and
										configurations before making them live
									</li>
									<li>
										Regularly backup your Shopify store data
									</li>
									<li>
										Monitor your store's performance and
										customer feedback closely
									</li>
									<li>
										Have appropriate business insurance to
										cover potential losses
									</li>
									<li>
										Consult with legal and business
										professionals as needed
									</li>
								</ul>

								<h3 className="text-lg font-semibold text-gray-900 mt-6">
									Acceptance of Terms
								</h3>
								<p className="text-gray-700">
									By accessing or using Shopmake, you agree to
									be bound by these Terms of Service. If you
									disagree with any part of these terms, then
									you may not access the service.
								</p>

								<h3 className="text-lg font-semibold text-gray-900 mt-6">
									Changes to Terms
								</h3>
								<p className="text-gray-700">
									We reserve the right, at our sole
									discretion, to modify or replace these Terms
									at any time. If a revision is material, we
									will try to provide at least 30 days notice
									prior to any new terms taking effect.
								</p>

								<h3 className="text-lg font-semibold text-gray-900 mt-6">
									Contact Information
								</h3>
								<p className="text-gray-700">
									If you have any questions about these Terms
									of Service, please contact us before using
									the application. However, please note that
									seeking clarification does not change our
									limitation of liability.
								</p>

								<div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
									<p className="text-sm text-gray-600">
										<strong>Last Updated:</strong> September
										23, 2025
									</p>
									<p className="text-sm text-gray-600 mt-1">
										By continuing to use this application,
										you acknowledge that you have read,
										understood, and agree to these terms and
										conditions.
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Call to Action */}
					<div className="bg-white border rounded-lg p-6 text-center">
						<h3 className="text-lg font-semibold text-gray-900 mb-2">
							Ready to Get Started?
						</h3>
						<p className="text-gray-600 mb-4">
							If you agree to these terms, you can sign up for
							Shopmake and start generating your Shopify store.
						</p>
						<div className="flex justify-center gap-4">
							<Link href="/sign-up">
								<Button>Sign Up</Button>
							</Link>
							<Link href="/sign-in">
								<Button variant="outline">Sign In</Button>
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
