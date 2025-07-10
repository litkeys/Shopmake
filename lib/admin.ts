// Server-side admin utilities
export function getAdminEmails(): string[] {
	const adminEmailsEnv = process.env.ADMIN_EMAILS;
	console.log("Admin emails env:", adminEmailsEnv);
	if (!adminEmailsEnv) {
		console.warn("ADMIN_EMAILS environment variable not set");
		return [];
	}
	const emails = adminEmailsEnv
		.split(",")
		.map((email) => email.trim())
		.filter((email) => email.length > 0);
	console.log("Parsed admin emails:", emails);
	return emails;
}

export function isAdminEmail(email: string): boolean {
	const adminEmails = getAdminEmails();
	const isAdmin = adminEmails.includes(email);
	console.log(
		`Checking if ${email} is admin:`,
		isAdmin,
		"Admin emails:",
		adminEmails
	);
	return isAdmin;
}
