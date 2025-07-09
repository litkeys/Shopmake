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
    file_type TEXT NOT NULL, -- 'logo', 'csv_products', 'csv_customers', 'csv_orders'
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

### 4. Add updated_at triggers

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
│   └── csv_orders/
│       └── timestamp.csv
```

## Additional Notes

1. **Row Level Security (RLS)**: All tables have RLS enabled to ensure users can only access their own data.

2. **File Uploads**: Files are stored in Supabase Storage with a hierarchical structure based on store ID.

3. **Auto-save**: The application implements auto-save functionality with a 500ms debounce to automatically save form changes.

4. **File Management**: Users can upload, preview, and delete files through the UI.

5. **Database Relationships**: The schema uses foreign key constraints to maintain data integrity.

6. **Clerk Integration**: The system uses Clerk JWTs with Supabase RLS policies that reference the `sub` claim for user identification.

To set up your Supabase instance, copy and paste the SQL commands above into the Supabase SQL editor and execute them in order.
