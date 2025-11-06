import { SignIn } from "@clerk/nextjs";

export default function Page() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="max-w-md w-full space-y-8">
				<div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
						Welcome to Shopmake
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						Sign in to access your dashboard and start building
						amazing Shopify experiences
					</p>
				</div>
				<SignIn
					routing="path"
					path="/sign-in"
					signUpUrl="/sign-up"
					afterSignInUrl="/dashboard/clients"
					appearance={{
						elements: {
							formButtonPrimary:
								"bg-slate-500 hover:bg-slate-400 text-sm normal-case",
						},
					}}
				/>
				<p className="mt-4 text-center text-xs text-gray-500">
					Created by James to power a web agency 💻
				</p>
			</div>
		</div>
	);
}
