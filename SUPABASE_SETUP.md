# Supabase Setup for Genesis Project

This document outlines the database schema and storage setup required for the client management system.

## Database Tables

### 1. stores

```sql
CREATE TABLE stores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_by TEXT NOT NULL, -- Clerk user ID
    shopify_store_domain TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Users can only see their own stores
CREATE POLICY "Users can view their own stores" ON stores
    FOR SELECT USING (created_by = (auth.jwt() ->> 'sub')::text);

-- Users can only insert their own stores
CREATE POLICY "Users can insert their own stores" ON stores
    FOR INSERT WITH CHECK (created_by = (auth.jwt() ->> 'sub')::text);

-- Users can only update their own stores
CREATE POLICY "Users can update their own stores" ON stores
    FOR UPDATE USING (created_by = (auth.jwt() ->> 'sub')::text);

-- Users can only delete their own stores
CREATE POLICY "Users can delete their own stores" ON stores
    FOR DELETE USING (created_by = (auth.jwt() ->> 'sub')::text);
```

### 2. store_data

```sql
CREATE TABLE store_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
    brand_name TEXT,
    description TEXT,
    main_product_category TEXT,
    contact_email TEXT,
    logo_url TEXT,
    -- Store Colors
    text_color TEXT DEFAULT '#000000',
    accent_color TEXT DEFAULT '#3B82F6',
    background_color TEXT DEFAULT '#FFFFFF',
    -- Store Fonts
    header_font TEXT DEFAULT 'quicksand_n6',
    body_font TEXT DEFAULT 'quicksand_n4',
    -- Store Policies
    return_policy TEXT,
    privacy_policy TEXT,
    terms_of_service TEXT,
    shipping_policy TEXT,
    contact_information TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE store_data ENABLE ROW LEVEL SECURITY;

-- Users can only access store_data for their own stores
CREATE POLICY "Users can access their store data" ON store_data
    FOR ALL USING (
        store_id IN (
            SELECT id FROM stores WHERE created_by = (auth.jwt() ->> 'sub')::text
        )
    );
```

### 3. uploads

```sql
CREATE TABLE uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'logo', 'csv_products', 'csv_customers', 'csv_inventory'
    file_size BIGINT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

-- Users can only access uploads for their own stores
CREATE POLICY "Users can access their uploads" ON uploads
    FOR ALL USING (
        store_id IN (
            SELECT id FROM stores WHERE created_by = (auth.jwt() ->> 'sub')::text
        )
    );
```

### 4. shopify_tokens

```sql
CREATE TABLE shopify_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
    shopify_store_domain TEXT NOT NULL,
    access_token TEXT NOT NULL,
    scopes TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE shopify_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access shopify_tokens for their own stores
CREATE POLICY "Users can access their shopify tokens" ON shopify_tokens
    FOR ALL USING (
        store_id IN (
            SELECT id FROM stores WHERE created_by = (auth.jwt() ->> 'sub')::text
        )
    );
```

### 5. store_locations

```sql
CREATE TABLE store_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    country TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE store_locations ENABLE ROW LEVEL SECURITY;

-- Users can only access store_locations for their own stores
CREATE POLICY "Users can access their store locations" ON store_locations
    FOR ALL USING (
        store_id IN (
            SELECT id FROM stores WHERE created_by = (auth.jwt() ->> 'sub')::text
        )
    );
```

### 6. store_collections

```sql
CREATE TABLE store_collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    shopify_collection_id BIGINT, -- Shopify collection ID when created
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE store_collections ENABLE ROW LEVEL SECURITY;

-- Users can only access store_collections for their own stores
CREATE POLICY "Users can access their store collections" ON store_collections
    FOR ALL USING (
        store_id IN (
            SELECT id FROM stores WHERE created_by = (auth.jwt() ->> 'sub')::text
        )
    );
```

### 7. collection_mappings

```sql
CREATE TABLE collection_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    collection_id UUID REFERENCES store_collections(id) ON DELETE CASCADE,
    mapping_type TEXT NOT NULL CHECK (mapping_type IN ('product_tag', 'product_type', 'product_category')),
    mapping_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(collection_id, mapping_type, mapping_value)
);

-- Add RLS policies
ALTER TABLE collection_mappings ENABLE ROW LEVEL SECURITY;

-- Users can only access collection_mappings for their own collections
CREATE POLICY "Users can access their collection mappings" ON collection_mappings
    FOR ALL USING (
        collection_id IN (
            SELECT id FROM store_collections WHERE store_id IN (
                SELECT id FROM stores WHERE created_by = (auth.jwt() ->> 'sub')::text
            )
        )
    );
```

### 8. Add updated_at triggers

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers
CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_data_updated_at
    BEFORE UPDATE ON store_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopify_tokens_updated_at
    BEFORE UPDATE ON shopify_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_locations_updated_at
    BEFORE UPDATE ON store_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_collections_updated_at
    BEFORE UPDATE ON store_collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collection_mappings_updated_at
    BEFORE UPDATE ON collection_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Storage Buckets

### 1. Create storage bucket

```sql
-- Create bucket for store files
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-files', 'store-files', true);
```

### 2. Storage policies

```sql
-- Allow authenticated users to upload files to their own store folders
CREATE POLICY "Users can upload to their store folders" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'store-files' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM stores WHERE created_by = (auth.jwt() ->> 'sub')::text
        )
    );

-- Allow users to view files from their own store folders
CREATE POLICY "Users can view their store files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'store-files' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM stores WHERE created_by = (auth.jwt() ->> 'sub')::text
        )
    );

-- Allow users to delete files from their own store folders
CREATE POLICY "Users can delete their store files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'store-files' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM stores WHERE created_by = (auth.jwt() ->> 'sub')::text
        )
    );
```

## Authentication Setup

### 1. Clerk Integration

Since we're using Clerk for authentication, you'll need to configure Supabase to work with Clerk JWTs:

1. In your Supabase dashboard, go to Settings > JWT Keys
2. Use the Legacy JWT secret as the signing key in your Clerk JWT template
3. Configure the JWT template in Clerk with these claims:

```json
{
  "aud": "authenticated",
  "exp": {{exp}},
  "iat": {{iat}},
  "iss": "{{iss}}",
  "role": "authenticated",
  "email": "{{user.primary_email_address.email_address}}",
  "app_metadata": {},
  "user_metadata": {}
}
```

Note: The `sub` claim is automatically provided by Clerk and contains the user ID.

### 2. Environment Variables

Make sure these environment variables are set:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Shopify Integration (NEW)
SHOPIFY_CLIENT_ID=your-shopify-app-client-id
SHOPIFY_CLIENT_SECRET=your-shopify-app-client-secret
SHOPIFY_REDIRECT_URI=https://your-domain.com/api/shopify/callback
SHOPIFY_SCOPES=read_products,write_products,read_themes,write_themes,read_script_tags,write_script_tags
GENESIS_THEME_URL=https://your-cdn.com/genesis-theme.zip
```

## File Storage Structure

Files will be organized as follows:

```
store-files/
├── {store_id}/
│   ├── logo/
│   │   └── timestamp.jpg
│   ├── csv_products/
│   │   └── timestamp.csv
│   ├── csv_customers/
│   │   └── timestamp.csv
│   └── csv_inventory/
│       └── timestamp.csv
```

## Additional Notes

1. **Row Level Security (RLS)**: All tables have RLS enabled to ensure users can only access their own data.

2. **File Uploads**: Files are stored in Supabase Storage with a hierarchical structure based on store ID.

3. **Auto-save**: The application implements auto-save functionality with a 500ms debounce to automatically save form changes.

4. **File Management**: Users can upload, preview, and delete files through the UI.

5. **Database Relationships**: The schema uses foreign key constraints to maintain data integrity.

6. **Clerk Integration**: The system uses Clerk JWTs with Supabase RLS policies that reference the `sub` claim for user identification.

7. **Shopify Integration**: Shopify access tokens are stored securely in the `shopify_tokens` table and never exposed to the client.

8. **Store Policies**: The system supports comprehensive store policies including return policy, privacy policy, terms of service, shipping policy, and additional contact information stored as text/HTML content.

## Shopify App Setup

To integrate with Shopify, you need to create a Shopify app:

1. Go to [Shopify Partners](https://partners.shopify.com/) and create a partner account
2. Create a new app in your partner dashboard
3. Configure the following settings:
    - **App URL**: `https://your-domain.com/dashboard`
    - **Allowed redirection URL(s)**: `https://your-domain.com/api/shopify/callback`
    - **Scopes**: `read_products,write_products,read_themes,write_themes,read_script_tags,write_script_tags`
4. Note down your Client ID and Client Secret for the environment variables

To set up your Supabase instance, copy and paste the SQL commands above into the Supabase SQL editor and execute them in order.
