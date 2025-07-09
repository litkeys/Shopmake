import { Store, StoreData } from "@/types";

// Helper to get the base URL
function getBaseUrl() {
	if (typeof window !== "undefined") {
		// Client-side
		return window.location.origin;
	}
	// Server-side
	return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function createStoreAPI(name: string): Promise<Store> {
	const response = await fetch(`${getBaseUrl()}/api/stores`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ name }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to create store");
	}

	const result = await response.json();
	return result.data;
}

export async function updateStoreDataAPI(
	storeId: string,
	storeData: Partial<StoreData>
): Promise<StoreData> {
	const response = await fetch(`${getBaseUrl()}/api/stores/${storeId}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(storeData),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update store data");
	}

	const result = await response.json();
	return result.data;
}

export async function uploadFileAPI(
	storeId: string,
	file: File,
	fileType: string
): Promise<{ path: string; url: string }> {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("storeId", storeId);
	formData.append("fileType", fileType);

	const response = await fetch(`${getBaseUrl()}/api/uploads`, {
		method: "POST",
		body: formData,
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to upload file");
	}

	const result = await response.json();
	return result.data;
}

export async function getStoreAPI(storeId: string): Promise<{
	store: Store;
	storeData: StoreData | null;
}> {
	const response = await fetch(`${getBaseUrl()}/api/stores/${storeId}`);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch store");
	}

	const result = await response.json();
	return result.data;
}

export async function getStoresAPI(): Promise<Store[]> {
	const response = await fetch(`${getBaseUrl()}/api/stores`);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch stores");
	}

	const result = await response.json();
	return result.data;
}

export async function getStoreUploadsAPI(
	storeId: string,
	fileType?: string
): Promise<any[]> {
	const url = new URL(`${getBaseUrl()}/api/stores/${storeId}/uploads`);
	if (fileType) {
		url.searchParams.set("fileType", fileType);
	}

	const response = await fetch(url.toString());

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch uploads");
	}

	const result = await response.json();
	return result.data;
}

export async function deleteFileAPI(filePath: string): Promise<void> {
	const response = await fetch(`${getBaseUrl()}/api/uploads`, {
		method: "DELETE",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ filePath }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to delete file");
	}
}
