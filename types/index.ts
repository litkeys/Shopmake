export interface User {
	id: string;
	firstName: string | null;
	lastName: string | null;
	email: string;
	createdAt: Date;
	updatedAt: Date;
}

// Store/Client related types
export interface Store {
	id: string;
	name: string;
	created_by: string; // Clerk user ID
	shopify_store_domain?: string | null;
	created_at: string;
	updated_at: string;
}

export interface StoreData {
	id: string;
	store_id: string;
	brand_name?: string;
	description?: string;
	main_product_category?: string;
	contact_email?: string;
	logo_url?: string;
	// Store Colors
	text_color?: string;
	accent_color?: string;
	background_color?: string;
	// Store Typography
	font_handle?: string;
	// Store Policies
	return_policy?: string;
	privacy_policy?: string;
	terms_of_service?: string;
	shipping_policy?: string;
	contact_information?: string;
	updated_at: string;
}

export interface Upload {
	id: string;
	store_id: string;
	file_path: string;
	file_name: string;
	file_type: string; // 'csv_products', 'csv_customers', 'csv_inventory', 'logo'
	file_size: number;
	uploaded_at: string;
}

export interface StoreLocation {
	id: string;
	store_id: string;
	name: string;
	address?: string;
	city?: string;
	country?: string;
	phone?: string;
	created_at: string;
	updated_at: string;
}

// Shopify-related types
export interface ShopifyAdminToken {
	id: string;
	store_id: string;
	shopify_store_domain: string;
	admin_api_token: string;
	token_name?: string;
	created_at: string;
	updated_at: string;
}

export interface ShopifyCustomAppConnection {
	store_domain: string;
	admin_api_token: string;
	token_name?: string;
}

export interface ShopifyStoreGenerationRequest {
	store_id: string;
	force_regenerate?: boolean;
}

// Form data interface for the client form
export interface StoreFormData {
	brand_name: string;
	description: string;
	main_product_category: string;
	contact_email: string;
	// Store Colors
	text_color: string;
	accent_color: string;
	background_color: string;
	// Store Typography
	font_handle: string;
	// Store Policies
	return_policy: string;
	privacy_policy: string;
	terms_of_service: string;
	shipping_policy: string;
	contact_information: string;
	logo_file?: File;
	csv_files?: {
		products?: File;
		customers?: File;
		inventory?: File;
	};
}

// Location form data (for frontend state management)
export interface LocationFormData {
	name: string;
	address: string;
	city: string;
	country: string;
	phone: string;
}

// Collection related types
export interface StoreCollection {
	id: string;
	store_id: string;
	title: string;
	description?: string;
	shopify_collection_id?: number;
	created_at: string;
	updated_at: string;
}

export interface CollectionMapping {
	id: string;
	collection_id: string;
	mapping_type: "product_tag" | "product_type" | "product_category";
	mapping_value: string;
	created_at: string;
	updated_at: string;
}

export interface CollectionWithMappings extends StoreCollection {
	mappings: CollectionMapping[];
}

export interface CollectionFormData {
	title: string;
	description: string;
}

export interface MappingFormData {
	mapping_type: "product_tag" | "product_type" | "product_category";
	mapping_value: string;
}

export interface ApiResponse<T = any> {
	data: T;
	success: boolean;
	message?: string;
}

export interface PaginatedResponse<T = any> {
	data: T[];
	total: number;
	page: number;
	limit: number;
	hasNext: boolean;
	hasPrev: boolean;
}
