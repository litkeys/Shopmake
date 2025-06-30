// Server-side admin utilities
export function getAdminEmails(): string[] {
	const adminEmailsEnv = process.env.ADMIN_EMAILS;
	if (!adminEmailsEnv) {
		console.warn("ADMIN_EMAILS environment variable not set");
		return [];
	}
	return adminEmailsEnv
		.split(",")
		.map((email) => email.trim())
		.filter((email) => email.length > 0);
}

export function isAdminEmail(email: string): boolean {
	const adminEmails = getAdminEmails();
	return adminEmails.includes(email);
}
