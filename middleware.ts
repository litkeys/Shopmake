import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
	publicRoutes: ["/", "/sign-in", "/api/webhooks(.*)", "/favicon.ico"],
	signInUrl: "/sign-in",
	afterAuth: (auth, req) => {
		// If user is signed in and trying to access auth pages, redirect to dashboard
		if (
			auth.userId &&
			(req.nextUrl.pathname === "/sign-in" ||
				req.nextUrl.pathname === "/sign-up")
		) {
			return Response.redirect(new URL("/dashboard/clients", req.url));
		}
	},
});

export const config = {
	matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
