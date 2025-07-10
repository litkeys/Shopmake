# Shopify Integration Setup Guide

## Prerequisites ✅

-   [x] Shopify Partners account created
-   [x] Shopify app configured
-   [x] Environment variables set
-   [ ] Genesis theme uploaded to Supabase
-   [ ] Database migrations run

## Step-by-Step Setup

### 1. 🗄️ **Run Complete Database Migration**

Copy and paste the **ENTIRE** content of `COMPLETE_SUPABASE_MIGRATION.sql` into your **Supabase SQL Editor** (Dashboard → SQL Editor → New query).

This migration includes:

-   ✅ All base tables (`stores`, `store_data`, `uploads`)
-   ✅ New `shopify_tokens` table
-   ✅ Storage buckets (`store-files`, `genesis-themes`)
-   ✅ Row Level Security policies
-   ✅ Triggers and functions

### 2. 📦 **Upload Genesis Theme Manually**

#### Step-by-step manual upload:

1. **Go to your Supabase Dashboard**

    - Navigate to **Storage** in the sidebar
    - You should see a `genesis-themes` bucket (created by the migration)

2. **Upload your theme file:**

    - Click on the `genesis-themes` bucket
    - Click **Upload file**
    - Select your `genesis-theme.zip` file
    - Make sure the filename is exactly `genesis-theme.zip`

3. **Get the public URL:**

    - After upload, click on your uploaded file
    - Click **Get URL** or **Copy URL**
    - The URL should look like:
        ```
        https://your-project.supabase.co/storage/v1/object/public/genesis-themes/genesis-theme.zip
        ```

4. **Add to environment variables:**
    ```env
    GENESIS_THEME_URL=https://your-project.supabase.co/storage/v1/object/public/genesis-themes/genesis-theme.zip
    ```

### 3. 🔧 **Environment Variables**

Make sure your `.env.local` file contains:

```env
# Existing Supabase vars
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Shopify Integration (from your Shopify Partners app)
SHOPIFY_CLIENT_ID=your-shopify-app-client-id
SHOPIFY_CLIENT_SECRET=your-shopify-app-client-secret
SHOPIFY_REDIRECT_URI=https://your-domain.com/api/shopify/callback
SHOPIFY_SCOPES=read_products,write_products,read_themes,write_themes
GENESIS_THEME_URL=https://your-project.supabase.co/storage/v1/object/public/genesis-themes/genesis-theme.zip
```

### 4. 🚀 **Test the Integration**

1. **Start your development server:**

    ```bash
    npm run dev
    ```

2. **Create a test store:**

    - Go to `/dashboard/clients/new`
    - Fill in the store information
    - Save the store

3. **Test Shopify connection:**
    - Click "Connect Shopify & Generate Store"
    - Enter your Shopify development store domain
    - Complete the OAuth flow
    - Verify the store generation works

## Troubleshooting 🔧

### Common Issues:

#### ❌ "Failed to download theme from Supabase"

-   **Solution:**
    1. Check that your `GENESIS_THEME_URL` is correct
    2. Verify the file exists in the `genesis-themes` bucket
    3. Ensure the bucket is public
    4. Test the URL in your browser - it should download the file

#### ❌ "Invalid OAuth signature"

-   **Solution:** Verify your `SHOPIFY_CLIENT_SECRET` is correct in your environment variables

#### ❌ "Insufficient Shopify permissions"

-   **Solution:** Make sure your Shopify app has the required scopes: `read_products,write_products,read_themes,write_themes`

#### ❌ "Store not found"

-   **Solution:** Ensure you're using a valid Shopify development store domain

### Testing with Development Store:

1. Create a development store in your Shopify Partners account
2. Use the store's domain (without `.myshopify.com`) when testing
3. Make sure the development store is not password protected

## File Structure After Setup:

```
Genesis-Project/
├── COMPLETE_SUPABASE_MIGRATION.sql
├── SHOPIFY_SETUP.md
├── lib/
│   └── shopify.ts (updated)
├── app/api/shopify/
│   ├── oauth/route.ts
│   ├── callback/route.ts
│   └── generate/route.ts
└── genesis-theme.zip (upload this to Supabase manually)
```

## Verification Checklist:

After running the migration, verify in your Supabase dashboard:

-   [ ] **Tables exist:** `stores`, `store_data`, `uploads`, `shopify_tokens`
-   [ ] **Storage buckets exist:** `store-files`, `genesis-themes`
-   [ ] **Genesis theme uploaded:** `genesis-themes/genesis-theme.zip`
-   [ ] **Environment variables set:** All Shopify variables configured
-   [ ] **Development server starts:** `npm run dev` works without errors

---

**Need help?** Check the console logs for detailed error messages, and ensure all environment variables are set correctly.
