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
	// Store Fonts
	header_font?: string;
	body_font?: string;
	// Legal Information
	trading_name?: string;
	business_address?: string;
	business_phone?: string;
	business_registration_number?: string;
	vat_number?: string;
	return_address?: string;
	// Shipping Logistics
	order_processing_min_days?: number;
	order_processing_max_days?: number;
	// Store Policies
	return_policy?: string;
	privacy_policy?: string;
	terms_of_service?: string;
	shipping_policy?: string;
	contact_information?: string;
	// Store Layout
	store_layout?: StoreLayout;
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

// Shipping option related types
export interface ShippingOption {
	id: string;
	store_id: string;
	name: string;
	delivery_min_days: number;
	delivery_max_days: number;
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
	// Store Fonts
	header_font: string;
	body_font: string;
	// Legal Information
	trading_name: string;
	business_address: string;
	business_phone: string;
	business_registration_number: string;
	vat_number: string;
	return_address: string;
	// Shipping Logistics
	order_processing_min_days: number;
	order_processing_max_days: number;
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

// Shipping option form data (for frontend state management)
export interface ShippingOptionFormData {
	name: string;
	delivery_min_days: number;
	delivery_max_days: number;
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

// Store Layout types
export interface StorePageLayout {
	include: boolean;
	sections: string[];
}

export interface StoreLayout {
	index: StorePageLayout;
	product: StorePageLayout;
	collection: StorePageLayout;
	"list-collections": StorePageLayout;
	article: StorePageLayout;
	blog: StorePageLayout;
}

export interface AvailableSection {
	id: string;
	displayName: string;
	description?: string;
}

export interface StorePage {
	id: string;
	displayName: string;
	filename: string;
	requiredSections?: string[];
}

// Constants for store layout
export const AVAILABLE_SECTIONS: AvailableSection[] = [
	{ id: "featured-collection", displayName: "Featured collection" },
	{ id: "collection-list", displayName: "Collection list" },
	{ id: "rich-text", displayName: "Rich text" },
	{ id: "image-with-text", displayName: "Image with text" },
	{ id: "image-banner", displayName: "Image banner with text" },
	{ id: "collage", displayName: "Featured product or collection" },
	{ id: "multicolumn", displayName: "Multicolumn text" },
	{ id: "video", displayName: "Video" },
	{ id: "featured-blog", displayName: "Blog posts" },
	{ id: "icon-bar", displayName: "Icon bar with text" },
	{ id: "image-slider", displayName: "Image and video slides" },
	{ id: "results", displayName: "Results table" },
	{ id: "slideshow-hero", displayName: "Hero banner slides with text" },
	{ id: "testimonials", displayName: "Testimonials table" },
];

export const STORE_PAGES: StorePage[] = [
	{
		id: "index",
		displayName: "Home page",
		filename: "index.json",
	},
	{
		id: "product",
		displayName: "Product page",
		filename: "product.json",
		requiredSections: ["main-product", "related-products"],
	},
	{
		id: "collection",
		displayName: "Collection page",
		filename: "collection.json",
		requiredSections: [
			"main-collection-banner",
			"main-collection-product-grid",
		],
	},
	{
		id: "list-collections",
		displayName: "Collections list page",
		filename: "list-collections.json",
		requiredSections: ["main-list-collections"],
	},
	{
		id: "article",
		displayName: "Blog post page",
		filename: "article.json",
		requiredSections: ["main-article"],
	},
	{
		id: "blog",
		displayName: "Blogs page",
		filename: "blog.json",
		requiredSections: ["main-blog"],
	},
];

export const REQUIRED_SECTIONS: AvailableSection[] = [
	{ id: "main-product", displayName: "Product information" },
	{ id: "related-products", displayName: "Related products" },
	{ id: "main-collection-banner", displayName: "Collection banner" },
	{ id: "main-collection-product-grid", displayName: "Product grid" },
	{ id: "main-list-collections", displayName: "Collections list page" },
	{ id: "main-article", displayName: "Blog post" },
	{ id: "main-blog", displayName: "Blog posts" },
];

export const DEFAULT_STORE_LAYOUT: StoreLayout = {
	index: {
		include: true,
		sections: [
			"slideshow-hero",
			"image-with-text",
			"collection-list",
			"featured-collection",
			"icon-bar",
			"multicolumn",
			"testimonials",
			"featured-blog",
		],
	},
	product: {
		include: true,
		sections: ["main-product", "related-products"],
	},
	collection: {
		include: true,
		sections: [
			"main-collection-banner",
			"image-banner",
			"featured-collection",
			"main-collection-product-grid",
		],
	},
	"list-collections": {
		include: true,
		sections: ["image-banner", "collection-list", "main-list-collections"],
	},
	article: {
		include: true,
		sections: ["main-article", "featured-blog", "featured-collection"],
	},
	blog: {
		include: true,
		sections: ["main-blog"],
	},
};
