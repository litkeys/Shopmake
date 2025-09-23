import { SignUp } from "@clerk/nextjs";

export default function Page() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="max-w-md w-full space-y-8">
				<div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
						Join Genesis Project
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						Create your account to start building amazing Shopify
						experiences
					</p>
				</div>
				<SignUp
					routing="path"
					path="/sign-up"
					signInUrl="/sign-in"
					afterSignUpUrl="/dashboard/clients"
					appearance={{
						elements: {
							formButtonPrimary:
								"bg-slate-500 hover:bg-slate-400 text-sm normal-case",
						},
					}}
				/>
			</div>
		</div>
	);
}
