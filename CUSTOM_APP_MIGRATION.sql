-- Migration: Update for Custom App Admin API Token Integration
-- Run this in your Supabase SQL Editor

-- 1. Drop the existing shopify_tokens table since we're changing the structure
DROP TABLE IF EXISTS shopify_tokens;

-- 2. Create new shopify_admin_tokens table for Custom App tokens
CREATE TABLE shopify_admin_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
    shopify_store_domain TEXT NOT NULL,
    admin_api_token TEXT NOT NULL,
    token_name TEXT, -- Optional: name/description for the token
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS on shopify_admin_tokens
ALTER TABLE shopify_admin_tokens ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policy for shopify_admin_tokens
CREATE POLICY "Users can access their shopify admin tokens" ON shopify_admin_tokens
    FOR ALL USING (
        store_id IN (
            SELECT id FROM stores WHERE created_by = (auth.jwt() ->> 'sub')::text
        )
    );

-- 5. Add updated_at trigger for shopify_admin_tokens
CREATE TRIGGER update_shopify_admin_tokens_updated_at
    BEFORE UPDATE ON shopify_admin_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Verify the setup
SELECT 'Custom App migration completed successfully! ✅' as status;

-- Check that the new table exists
SELECT 'New table created:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'shopify_admin_tokens'; 