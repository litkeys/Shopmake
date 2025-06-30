import { SignIn } from "@clerk/nextjs";

export default function Page({
	searchParams,
}: {
	searchParams: { [key: string]: string | string[] | undefined };
}) {
	const showAdminError = searchParams.error === "admin_required";

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="max-w-md w-full space-y-8">
				<div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
						Welcome to Genesis Project
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						Please sign in to continue to your dashboard
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
										authorized administrators only. If you
										believe you should have access, please
										contact your system administrator.
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Error message for non-admin users */}
					{showAdminError && (
						<div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
							<div className="flex">
								<div className="ml-3">
									<h3 className="text-sm font-medium text-red-800">
										Access Denied
									</h3>
									<div className="mt-2 text-sm text-red-700">
										<p>
											Your account does not have
											administrative privileges. Please
											sign in with an authorized
											administrator account.
										</p>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
				<SignIn
					routing="path"
					path="/sign-in"
					signUpUrl="/sign-up"
					afterSignInUrl="/dashboard"
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
