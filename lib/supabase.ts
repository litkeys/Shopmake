import { createClient } from "@supabase/supabase-js";
import { Store, StoreData, Upload } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Store operations
export async function getStores(userId: string): Promise<Store[]> {
	const { data, error } = await supabase
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
	const { data, error } = await supabase
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
	const { data, error } = await supabase
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
	const { data, error } = await supabase
		.from("stores")
		.update(updates)
		.eq("id", storeId)
		.select()
		.single();

	if (error) {
		throw new Error(`Failed to update store: ${error.message}`);
	}

	return data;
}

// Store data operations
export async function getStoreData(storeId: string): Promise<StoreData | null> {
	const { data, error } = await supabase
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
	const { data, error } = await supabase
		.from("store_data")
		.upsert([
			{
				store_id: storeId,
				...storeData,
				updated_at: new Date().toISOString(),
			},
		])
		.select()
		.single();

	if (error) {
		throw new Error(`Failed to upsert store data: ${error.message}`);
	}

	return data;
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

	const { error: uploadError } = await supabase.storage
		.from("store-files")
		.upload(filePath, file);

	if (uploadError) {
		throw new Error(`Failed to upload file: ${uploadError.message}`);
	}

	const { data } = supabase.storage
		.from("store-files")
		.getPublicUrl(filePath);

	// Record the upload in the database
	const { error: dbError } = await supabase.from("uploads").insert([
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
	let query = supabase
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
	const { error } = await supabase.storage
		.from("store-files")
		.remove([filePath]);

	if (error) {
		throw new Error(`Failed to delete file: ${error.message}`);
	}

	// Also remove from uploads table
	await supabase.from("uploads").delete().eq("file_path", filePath);
}
