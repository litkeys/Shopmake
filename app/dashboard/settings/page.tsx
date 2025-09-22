import { redirect } from "next/navigation";

export default function SettingsPage() {
	// Redirect to clients page since it's the only implemented functionality
	redirect("/dashboard/clients");
}
