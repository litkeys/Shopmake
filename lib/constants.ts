export const APP_NAME = "Genesis Project";
export const APP_DESCRIPTION = "Internal SaaS Tool";

export const ROUTES = {
	HOME: "/",
	DASHBOARD: "/dashboard",
	SIGN_IN: "/sign-in",
	SIGN_UP: "/sign-up",
} as const;

export const API_ENDPOINTS = {
	USERS: "/api/users",
	AUTH: "/api/auth",
	SHOPIFY_GENERATE: "/api/shopify/generate",
} as const;

// Shopify configuration for Custom Apps
export const SHOPIFY_CONFIG = {
	GENESIS_THEME_URL:
		process.env.GENESIS_THEME_URL ||
		"https://cdn.example.com/genesis-theme.zip",
} as const;

// Section presets configuration
export const SECTION_PRESETS_CONFIG = {
	DEFAULT_THEME: "genesis",
} as const;

// Required environment variables for Shopify Custom App integration:
// GENESIS_THEME_URL - URL to the Genesis theme ZIP file (in Supabase storage)
