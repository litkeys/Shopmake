"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">
					Terms & Conditions
				</h1>
				<p className="mt-1 text-sm text-gray-600">
					Please read these terms and conditions carefully before
					using our application.
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
							The developers of this application ("Shopmake") are{" "}
							<strong>NOT LIABLE</strong> for any consequences,
							damages, losses, or issues that may arise from using
							this application. This includes but is not limited
							to:
						</p>
						<ul className="list-disc list-inside mt-2 text-sm text-red-700 space-y-1">
							<li>
								Business losses or financial damages resulting
								from store generation or management
							</li>
							<li>
								Data loss, corruption, or unauthorized access to
								your Shopify store
							</li>
							<li>
								Incorrect product configurations, pricing, or
								inventory management
							</li>
							<li>
								Any disruption to your business operations or
								customer experience
							</li>
							<li>
								Third-party integration failures or API-related
								issues
							</li>
						</ul>
					</div>

					<div className="prose prose-sm max-w-none">
						<h3 className="text-lg font-semibold text-gray-900 mt-6">
							Use at Your Own Risk
						</h3>
						<p className="text-gray-700">
							By using this application, you acknowledge and agree
							that:
						</p>
						<ul className="list-disc list-inside text-gray-700 space-y-1">
							<li>
								You use this application entirely at your own
								risk and discretion
							</li>
							<li>
								You are responsible for backing up your data and
								monitoring your store's performance
							</li>
							<li>
								You will not hold the developers liable for any
								direct, indirect, incidental, consequential, or
								punitive damages
							</li>
							<li>
								You understand that this application is provided
								"as is" without any warranties or guarantees
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
								Test all generated content and configurations
								before making them live
							</li>
							<li>Regularly backup your Shopify store data</li>
							<li>
								Monitor your store's performance and customer
								feedback closely
							</li>
							<li>
								Have appropriate business insurance to cover
								potential losses
							</li>
							<li>
								Consult with legal and business professionals as
								needed
							</li>
						</ul>

						<h3 className="text-lg font-semibold text-gray-900 mt-6">
							Contact Information
						</h3>
						<p className="text-gray-700">
							If you have any questions about these terms, please
							contact us before using the application. However,
							please note that seeking clarification does not
							change our limitation of liability.
						</p>

						<div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
							<p className="text-sm text-gray-600">
								<strong>Last Updated:</strong> September 23,
								2025
							</p>
							<p className="text-sm text-gray-600 mt-1">
								By continuing to use this application, you
								acknowledge that you have read, understood, and
								agree to these terms and conditions.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
