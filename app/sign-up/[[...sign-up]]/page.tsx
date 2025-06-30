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
						Create your account to get started
					</p>

					{/* Admin-only notice */}
					<div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
						<div className="flex">
							<div className="ml-3">
								<h3 className="text-sm font-medium text-amber-800">
									Admin Access Only
								</h3>
								<div className="mt-2 text-sm text-amber-700">
									<p>
										This application is restricted to
										authorized administrators only. Only
										pre-approved email addresses can create
										accounts. If you believe you should have
										access, please contact your system
										administrator.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
				<SignUp
					routing="path"
					path="/sign-up"
					signInUrl="/sign-in"
					afterSignUpUrl="/dashboard"
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
