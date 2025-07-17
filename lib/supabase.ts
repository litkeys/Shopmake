import { createClient } from "@supabase/supabase-js";
import {
	Store,
	StoreData,
	Upload,
	ShopifyAdminToken,
	StoreLocation,
	StoreCollection,
	CollectionMapping,
	CollectionWithMappings,
} from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for anon operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

// Store operations
export async function getStores(userId: string): Promise<Store[]> {
	const { data, error } = await supabaseAdmin
		.from("stores")
		.select("*")
		.eq("created_by", userId)
		.order("created_at", { ascending: false });

	if (error) {
		throw new Error(`Failed to fetch stores: ${error.message}`);
	}

	return data || [];
}

export async function getStore(storeId: string): Promise<Store | null> {
	const { data, error } = await supabaseAdmin
		.from("stores")
		.select("*")
		.eq("id", storeId)
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			return null; // Not found
		}
		throw new Error(`Failed to fetch store: ${error.message}`);
	}

	return data;
}

export async function createStore(
	name: string,
	userId: string
): Promise<Store> {
	const { data, error } = await supabaseAdmin
		.from("stores")
		.insert([
			{
				name,
				created_by: userId,
			},
		])
		.select()
		.single();

	if (error) {
		throw new Error(`Failed to create store: ${error.message}`);
	}

	return data;
}

export async function updateStore(
	storeId: string,
	updates: Partial<Store>
): Promise<Store> {
	console.log("updateStore - Updating store:", storeId, "with:", updates);

	const { data, error } = await supabaseAdmin
		.from("stores")
		.update(updates)
		.eq("id", storeId)
		.select()
		.single();

	if (error) {
		console.error("updateStore - Error:", error);
		console.error("updateStore - Error code:", error.code);
		console.error("updateStore - Error details:", error.details);
		throw new Error(`Failed to update store: ${error.message}`);
	}

	console.log("updateStore - Successfully updated store:", data);
	return data;
}

// Store data operations
export async function getStoreData(storeId: string): Promise<StoreData | null> {
	const { data, error } = await supabaseAdmin
		.from("store_data")
		.select("*")
		.eq("store_id", storeId)
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			return null; // Not found
		}
		throw new Error(`Failed to fetch store data: ${error.message}`);
	}

	return data;
}

export async function upsertStoreData(
	storeId: string,
	storeData: Partial<StoreData>
): Promise<StoreData> {
	const { data, error } = await supabaseAdmin
		.from("store_data")
		.upsert(
			[
				{
					store_id: storeId,
					...storeData,
					updated_at: new Date().toISOString(),
				},
			],
			{
				onConflict: "store_id",
			}
		)
		.select()
		.single();

	if (error) {
		throw new Error(`Failed to upsert store data: ${error.message}`);
	}

	return data;
}

// Shopify Admin Token operations
export async function getShopifyAdminToken(
	storeId: string
): Promise<ShopifyAdminToken | null> {
	const { data, error } = await supabaseAdmin
		.from("shopify_admin_tokens")
		.select("*")
		.eq("store_id", storeId)
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			return null; // Not found
		}
		throw new Error(
			`Failed to fetch Shopify admin token: ${error.message}`
		);
	}

	return data;
}

export async function upsertShopifyAdminToken(
	storeId: string,
	shopifyStoreDomain: string,
	adminApiToken: string,
	tokenName?: string
): Promise<ShopifyAdminToken> {
	const { data, error } = await supabaseAdmin
		.from("shopify_admin_tokens")
		.upsert(
			[
				{
					store_id: storeId,
					shopify_store_domain: shopifyStoreDomain,
					admin_api_token: adminApiToken,
					token_name: tokenName,
					updated_at: new Date().toISOString(),
				},
			],
			{
				onConflict: "store_id",
			}
		)
		.select()
		.single();

	if (error) {
		throw new Error(
			`Failed to upsert Shopify admin token: ${error.message}`
		);
	}

	return data;
}

export async function deleteShopifyAdminToken(storeId: string): Promise<void> {
	const { error } = await supabaseAdmin
		.from("shopify_admin_tokens")
		.delete()
		.eq("store_id", storeId);

	if (error) {
		throw new Error(
			`Failed to delete Shopify admin token: ${error.message}`
		);
	}
}

// File upload operations
export async function uploadFile(
	storeId: string,
	file: File,
	fileType: string
): Promise<{ path: string; url: string }> {
	const fileExt = file.name.split(".").pop();
	const fileName = `${Date.now()}.${fileExt}`;
	const filePath = `${storeId}/${fileType}/${fileName}`;

	const { error: uploadError } = await supabaseAdmin.storage
		.from("store-files")
		.upload(filePath, file);

	if (uploadError) {
		throw new Error(`Failed to upload file: ${uploadError.message}`);
	}

	const { data } = supabaseAdmin.storage
		.from("store-files")
		.getPublicUrl(filePath);

	// Record the upload in the database
	const { error: dbError } = await supabaseAdmin.from("uploads").insert([
		{
			store_id: storeId,
			file_path: filePath,
			file_name: file.name,
			file_type: fileType,
			file_size: file.size,
		},
	]);

	if (dbError) {
		// If DB insert fails, we should probably clean up the uploaded file
		// For now, we'll just log the error
		console.error("Failed to record upload in database:", dbError);
	}

	return {
		path: filePath,
		url: data.publicUrl,
	};
}

export async function getStoreUploads(
	storeId: string,
	fileType?: string
): Promise<Upload[]> {
	let query = supabaseAdmin
		.from("uploads")
		.select("*")
		.eq("store_id", storeId)
		.order("uploaded_at", { ascending: false });

	if (fileType) {
		query = query.eq("file_type", fileType);
	}

	const { data, error } = await query;

	if (error) {
		throw new Error(`Failed to fetch uploads: ${error.message}`);
	}

	return data || [];
}

export async function deleteFile(filePath: string): Promise<void> {
	const { error } = await supabaseAdmin.storage
		.from("store-files")
		.remove([filePath]);

	if (error) {
		throw new Error(`Failed to delete file: ${error.message}`);
	}

	// Also remove from uploads table
	await supabaseAdmin.from("uploads").delete().eq("file_path", filePath);
}

// Store locations operations
export async function getStoreLocations(
	storeId: string
): Promise<StoreLocation[]> {
	const { data, error } = await supabaseAdmin
		.from("store_locations")
		.select("*")
		.eq("store_id", storeId)
		.order("created_at", { ascending: true });

	if (error) {
		throw new Error(`Failed to fetch store locations: ${error.message}`);
	}

	return data || [];
}

export async function createStoreLocation(
	storeId: string,
	locationData: Omit<
		StoreLocation,
		"id" | "store_id" | "created_at" | "updated_at"
	>
): Promise<StoreLocation> {
	const { data, error } = await supabaseAdmin
		.from("store_locations")
		.insert([
			{
				store_id: storeId,
				...locationData,
			},
		])
		.select()
		.single();

	if (error) {
		throw new Error(`Failed to create store location: ${error.message}`);
	}

	return data;
}

export async function updateStoreLocation(
	locationId: string,
	locationData: Partial<
		Omit<StoreLocation, "id" | "store_id" | "created_at" | "updated_at">
	>
): Promise<StoreLocation> {
	const { data, error } = await supabaseAdmin
		.from("store_locations")
		.update({
			...locationData,
			updated_at: new Date().toISOString(),
		})
		.eq("id", locationId)
		.select()
		.single();

	if (error) {
		throw new Error(`Failed to update store location: ${error.message}`);
	}

	return data;
}

export async function deleteStoreLocation(locationId: string): Promise<void> {
	const { error } = await supabaseAdmin
		.from("store_locations")
		.delete()
		.eq("id", locationId);

	if (error) {
		throw new Error(`Failed to delete store location: ${error.message}`);
	}
}

// Collection operations
export async function getStoreCollections(
	storeId: string
): Promise<CollectionWithMappings[]> {
	// First get collections
	const { data: collections, error: collectionsError } = await supabaseAdmin
		.from("store_collections")
		.select("*")
		.eq("store_id", storeId)
		.order("created_at", { ascending: false });

	if (collectionsError) {
		throw new Error(
			`Failed to fetch store collections: ${collectionsError.message}`
		);
	}

	if (!collections || collections.length === 0) {
		return [];
	}

	// Get mappings for all collections
	const collectionIds = collections.map((c) => c.id);
	const { data: mappings, error: mappingsError } = await supabaseAdmin
		.from("collection_mappings")
		.select("*")
		.in("collection_id", collectionIds)
		.order("created_at", { ascending: true });

	if (mappingsError) {
		throw new Error(
			`Failed to fetch collection mappings: ${mappingsError.message}`
		);
	}

	// Combine collections with their mappings
	const collectionsWithMappings: CollectionWithMappings[] = collections.map(
		(collection) => ({
			...collection,
			mappings:
				mappings?.filter((m) => m.collection_id === collection.id) ||
				[],
		})
	);

	return collectionsWithMappings;
}

export async function createStoreCollection(
	storeId: string,
	collectionData: { title: string; description?: string }
): Promise<StoreCollection> {
	const { data, error } = await supabaseAdmin
		.from("store_collections")
		.insert({
			store_id: storeId,
			...collectionData,
		})
		.select()
		.single();

	if (error) {
		throw new Error(`Failed to create store collection: ${error.message}`);
	}

	return data;
}

export async function updateStoreCollection(
	collectionId: string,
	collectionData: Partial<{ title: string; description?: string }>
): Promise<StoreCollection> {
	const { data, error } = await supabaseAdmin
		.from("store_collections")
		.update(collectionData)
		.eq("id", collectionId)
		.select()
		.single();

	if (error) {
		throw new Error(`Failed to update store collection: ${error.message}`);
	}

	return data;
}

export async function deleteStoreCollection(
	collectionId: string
): Promise<void> {
	const { error } = await supabaseAdmin
		.from("store_collections")
		.delete()
		.eq("id", collectionId);

	if (error) {
		throw new Error(`Failed to delete store collection: ${error.message}`);
	}
}

// Collection mapping operations
export async function createCollectionMapping(
	collectionId: string,
	mappingData: { mapping_type: string; mapping_value: string }
): Promise<CollectionMapping> {
	const { data, error } = await supabaseAdmin
		.from("collection_mappings")
		.insert({
			collection_id: collectionId,
			...mappingData,
		})
		.select()
		.single();

	if (error) {
		throw new Error(
			`Failed to create collection mapping: ${error.message}`
		);
	}

	return data;
}

export async function updateCollectionMapping(
	mappingId: string,
	mappingData: Partial<{ mapping_type: string; mapping_value: string }>
): Promise<CollectionMapping> {
	const { data, error } = await supabaseAdmin
		.from("collection_mappings")
		.update(mappingData)
		.eq("id", mappingId)
		.select()
		.single();

	if (error) {
		throw new Error(
			`Failed to update collection mapping: ${error.message}`
		);
	}

	return data;
}

export async function deleteCollectionMapping(
	mappingId: string
): Promise<void> {
	const { error } = await supabaseAdmin
		.from("collection_mappings")
		.delete()
		.eq("id", mappingId);

	if (error) {
		throw new Error(
			`Failed to delete collection mapping: ${error.message}`
		);
	}
}
