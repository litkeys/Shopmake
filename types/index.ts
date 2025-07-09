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
	shopify_store_domain?: string;
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
	updated_at: string;
}

export interface Upload {
	id: string;
	store_id: string;
	file_path: string;
	file_name: string;
	file_type: string; // 'csv_products', 'csv_customers', 'csv_orders', 'logo'
	file_size: number;
	uploaded_at: string;
}

// Form data interface for the client form
export interface StoreFormData {
	brand_name: string;
	description: string;
	main_product_category: string;
	contact_email: string;
	logo_file?: File;
	csv_files?: {
		products?: File;
		customers?: File;
		orders?: File;
	};
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
