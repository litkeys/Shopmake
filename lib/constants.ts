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
	SHOPIFY_CALLBACK: "/api/shopify/callback",
	SHOPIFY_GENERATE: "/api/shopify/generate",
} as const;

// Shopify configuration
export const SHOPIFY_CONFIG = {
	CLIENT_ID: process.env.SHOPIFY_CLIENT_ID || "",
	CLIENT_SECRET: process.env.SHOPIFY_CLIENT_SECRET || "",
	REDIRECT_URI: process.env.SHOPIFY_REDIRECT_URI || "",
	SCOPES:
		process.env.SHOPIFY_SCOPES ||
		"read_products,write_products,read_themes,write_themes",
	GENESIS_THEME_URL:
		process.env.GENESIS_THEME_URL ||
		"https://cdn.example.com/genesis-theme.zip",
} as const;

// Required environment variables for Shopify integration:
// SHOPIFY_CLIENT_ID - Your Shopify app's client ID
// SHOPIFY_CLIENT_SECRET - Your Shopify app's client secret
// SHOPIFY_REDIRECT_URI - OAuth callback URL (should be your-domain.com/api/shopify/callback)
// SHOPIFY_SCOPES - Comma-separated list of required permissions
// GENESIS_THEME_URL - URL to the Genesis theme ZIP file
