import {
	Store,
	StoreData,
	StoreLocation,
	StoreCollection,
	CollectionMapping,
	CollectionWithMappings,
	CollectionFormData,
	MappingFormData,
	ShopifyStoreGenerationRequest,
	ShopifyCustomAppConnection,
	ShippingOption,
} from "@/types";

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

// Shopify-related API functions
export async function connectShopifyStoreAPI(
	storeId: string,
	connection: ShopifyCustomAppConnection
): Promise<{
	store_domain: string;
	store_url: string;
	token_name: string;
}> {
	const response = await fetch(`${getBaseUrl()}/api/shopify/connect`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			store_id: storeId,
			...connection,
		}),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to connect Shopify store");
	}

	const result = await response.json();
	return result.data;
}

export async function generateShopifyStoreAPI(
	storeId: string,
	forceRegenerate: boolean = false
): Promise<{
	store_domain: string;
	theme_id: number;
	collection_id?: number;
	products_created: number;
	variants_updated: number;
	products_published: number;
	store_url: string;
}> {
	const response = await fetch(`${getBaseUrl()}/api/shopify/generate`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			store_id: storeId,
			force_regenerate: forceRegenerate,
		} as ShopifyStoreGenerationRequest),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to generate Shopify store");
	}

	const result = await response.json();
	return result.data;
}

// Chunked store generation API functions
export async function generateStoreFoundationAPI(storeId: string): Promise<{
	theme_id: number;
	locations_created: number;
	logo_uploaded: boolean;
	contact_email_set: boolean;
}> {
	const response = await fetch(
		`${getBaseUrl()}/api/shopify/generate/foundation`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ storeId }),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to generate store foundation");
	}

	const result = await response.json();
	return result.result;
}

export async function generateStoreVisualsAPI(storeId: string): Promise<{
	visuals_updated: boolean;
}> {
	const response = await fetch(
		`${getBaseUrl()}/api/shopify/generate/visuals`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ storeId }),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to generate store visuals");
	}

	const result = await response.json();
	return result.result;
}

export async function generateStoreProductsAPI(storeId: string): Promise<{
	products_created: number;
	images_added: number;
	taxonomy_updated: number;
}> {
	const response = await fetch(
		`${getBaseUrl()}/api/shopify/generate/products`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ storeId }),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to generate store products");
	}

	const result = await response.json();
	return result.result;
}

export async function generateStoreVariantsAPI(storeId: string): Promise<{
	variants_updated: number;
	products_published: number;
}> {
	const response = await fetch(
		`${getBaseUrl()}/api/shopify/generate/variants`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ storeId }),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to process store variants");
	}

	const result = await response.json();
	return result.result;
}

export async function processStoreInventoryAPI(storeId: string): Promise<{
	inventory_updated: number;
}> {
	const response = await fetch(
		`${getBaseUrl()}/api/shopify/generate/inventory`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ storeId }),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to process store inventory");
	}

	const result = await response.json();
	return result.result;
}

export async function generateStoreCollectionsAPI(storeId: string): Promise<{
	collections_created: number;
	collections_updated: number;
}> {
	const response = await fetch(
		`${getBaseUrl()}/api/shopify/generate/collection`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ storeId }),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to generate store collections");
	}

	const result = await response.json();
	return result.result;
}

export async function generateStoreCustomersAPI(storeId: string): Promise<{
	customers_created: number;
	errors: string[];
}> {
	const response = await fetch(
		`${getBaseUrl()}/api/shopify/generate/customer`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ store_id: storeId }),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to generate store customers");
	}

	const result = await response.json();
	return result.data;
}

export async function updateStorePoliciesAPI(storeId: string): Promise<{
	policies_updated: number;
	skipped_policies: number;
}> {
	const response = await fetch(
		`${getBaseUrl()}/api/shopify/generate/policy`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ storeId }),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update store policies");
	}

	const result = await response.json();
	return result.result;
}

export async function generateStoreCompositionAPI(storeId: string): Promise<{
	templates_updated: number;
}> {
	const response = await fetch(
		`${getBaseUrl()}/api/shopify/generate/composition`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ storeId }),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to generate store composition");
	}

	const result = await response.json();
	return result.result;
}

export async function disconnectShopifyStoreAPI(
	storeId: string
): Promise<void> {
	const response = await fetch(`${getBaseUrl()}/api/shopify/disconnect`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ store_id: storeId }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to disconnect Shopify store");
	}
}

export async function deleteStoreAPI(storeId: string): Promise<void> {
	const response = await fetch(
		`${getBaseUrl()}/api/stores/${storeId}/delete`,
		{
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to delete store");
	}
}

// Store locations API functions
export async function getStoreLocationsAPI(
	storeId: string
): Promise<StoreLocation[]> {
	const response = await fetch(
		`${getBaseUrl()}/api/stores/${storeId}/locations`
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch store locations");
	}

	const result = await response.json();
	return result.data;
}

export async function createStoreLocationAPI(
	storeId: string,
	locationData: Omit<
		StoreLocation,
		"id" | "store_id" | "created_at" | "updated_at"
	>
): Promise<StoreLocation> {
	const response = await fetch(
		`${getBaseUrl()}/api/stores/${storeId}/locations`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(locationData),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to create store location");
	}

	const result = await response.json();
	return result.data;
}

export async function updateStoreLocationAPI(
	storeId: string,
	locationId: string,
	locationData: Partial<
		Omit<StoreLocation, "id" | "store_id" | "created_at" | "updated_at">
	>
): Promise<StoreLocation> {
	const response = await fetch(
		`${getBaseUrl()}/api/stores/${storeId}/locations/${locationId}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(locationData),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update store location");
	}

	const result = await response.json();
	return result.data;
}

export async function deleteStoreLocationAPI(
	storeId: string,
	locationId: string
): Promise<void> {
	const response = await fetch(
		`${getBaseUrl()}/api/stores/${storeId}/locations/${locationId}`,
		{
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to delete store location");
	}
}

// Store collections API functions
export async function getStoreCollectionsAPI(
	storeId: string
): Promise<CollectionWithMappings[]> {
	const response = await fetch(
		`${getBaseUrl()}/api/stores/${storeId}/collections`
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch store collections");
	}

	const result = await response.json();
	return result.data;
}

export async function createStoreCollectionAPI(
	storeId: string,
	collectionData: CollectionFormData
): Promise<StoreCollection> {
	const response = await fetch(
		`${getBaseUrl()}/api/stores/${storeId}/collections`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(collectionData),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to create store collection");
	}

	const result = await response.json();
	return result.data;
}

export async function updateStoreCollectionAPI(
	storeId: string,
	collectionId: string,
	collectionData: Partial<CollectionFormData>
): Promise<StoreCollection> {
	const response = await fetch(
		`${getBaseUrl()}/api/stores/${storeId}/collections/${collectionId}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(collectionData),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update store collection");
	}

	const result = await response.json();
	return result.data;
}

export async function deleteStoreCollectionAPI(
	storeId: string,
	collectionId: string
): Promise<void> {
	const response = await fetch(
		`${getBaseUrl()}/api/stores/${storeId}/collections/${collectionId}`,
		{
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to delete store collection");
	}
}

export async function magicGenerateCollectionsAPI(storeId: string): Promise<{
	collections_created: number;
	collections: CollectionWithMappings[];
}> {
	const response = await fetch(
		`${getBaseUrl()}/api/stores/${storeId}/collections/magic-generate`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to generate collections");
	}

	const result = await response.json();
	return result.data;
}

// Collection mappings API functions
export async function createCollectionMappingAPI(
	storeId: string,
	collectionId: string,
	mappingData: MappingFormData
): Promise<CollectionMapping> {
	const response = await fetch(
		`${getBaseUrl()}/api/stores/${storeId}/collections/${collectionId}/mappings`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(mappingData),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to create collection mapping");
	}

	const result = await response.json();
	return result.data;
}

export async function updateCollectionMappingAPI(
	storeId: string,
	collectionId: string,
	mappingId: string,
	mappingData: Partial<MappingFormData>
): Promise<CollectionMapping> {
	const response = await fetch(
		`${getBaseUrl()}/api/stores/${storeId}/collections/${collectionId}/mappings/${mappingId}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(mappingData),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update collection mapping");
	}

	const result = await response.json();
	return result.data;
}

export async function deleteCollectionMappingAPI(
	storeId: string,
	collectionId: string,
	mappingId: string
): Promise<void> {
	const response = await fetch(
		`${getBaseUrl()}/api/stores/${storeId}/collections/${collectionId}/mappings/${mappingId}`,
		{
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to delete collection mapping");
	}
}

// Shipping options API functions
export async function getShippingOptionsAPI(
	storeId: string
): Promise<ShippingOption[]> {
	const response = await fetch(
		`${getBaseUrl()}/api/stores/${storeId}/shipping-options`
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch shipping options");
	}

	const result = await response.json();
	return result.data;
}

export async function createShippingOptionAPI(
	storeId: string,
	shippingOptionData: Omit<
		ShippingOption,
		"id" | "store_id" | "created_at" | "updated_at"
	>
): Promise<ShippingOption> {
	const response = await fetch(
		`${getBaseUrl()}/api/stores/${storeId}/shipping-options`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(shippingOptionData),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to create shipping option");
	}

	const result = await response.json();
	return result.data;
}

export async function updateShippingOptionAPI(
	storeId: string,
	shippingOptionId: string,
	shippingOptionData: Partial<
		Omit<ShippingOption, "id" | "store_id" | "created_at" | "updated_at">
	>
): Promise<ShippingOption> {
	const response = await fetch(
		`${getBaseUrl()}/api/stores/${storeId}/shipping-options/${shippingOptionId}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(shippingOptionData),
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update shipping option");
	}

	const result = await response.json();
	return result.data;
}

export async function deleteShippingOptionAPI(
	storeId: string,
	shippingOptionId: string
): Promise<void> {
	const response = await fetch(
		`${getBaseUrl()}/api/stores/${storeId}/shipping-options/${shippingOptionId}`,
		{
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to delete shipping option");
	}
}
