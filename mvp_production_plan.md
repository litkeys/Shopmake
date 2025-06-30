# MVP Production Plan: AI-Powered Shopify Store Generator

## Overview
This SaaS product allows a solo agency operator to generate fully SEO-optimized Shopify stores from scratch or from existing Shopify-compatible data (e.g., CSVs). The MVP supports multiple clients, uses a prebuilt in-house theme called "Genesis," and is deployed via Vercel with a PostgreSQL backend and Supabase Storage. Authentication is handled via Clerk.

---

## Key Features
- **Multi-client support**: Add and manage multiple clients from a dashboard.
- **Form-based data entry**: Upload Shopify-compatible data and fill in missing fields.
- **AI content generation**: Fill in missing data such as product descriptions, SEO metadata, and pages.
- **Genesis theme deployment**: Push a fully-featured, SEO-optimized theme to Shopify.
- **One-click store generation**: Automatically generate and deploy a Shopify store.

---

## Stack
| Layer       | Tech                          |
|------------|-------------------------------|
| Frontend    | Next.js (App Router) + Tailwind |
| Auth        | Clerk                         |
| Database    | Supabase (Postgres + Storage) |
| Hosting     | Vercel                        |
| Shopify     | OAuth + Admin API             |
| Theme       | Genesis (in-house theme)      |

---

## Workflow Summary
1. Log in via Clerk.
2. View or add clients on the dashboard.
3. Select a client to fill out their store data.
4. Upload files (e.g., product CSV) to Supabase Storage.
5. AI generates missing content (optional).
6. Click to generate and deploy the store via Shopify Admin API.
7. Store is ready for preview in Shopify.

---

## Client Store Data Form Fields (MVP)
1. **What is your store or brand name?**
   - Used in header, footer, email popup, and meta tags.
2. **Do you have existing CSVs for products, customers and orders?** *(optional)*
3. **Briefly describe what you sell in 1–2 sentences**
   - Example: "We sell luxury soy candles for women who want to elevate their home vibe."
4. **Main product category or featured product**
   - Example: "Nappies", "Candles", "Whey Protein"
   - Used for generating collections.
5. **Upload your logo** *(optional)*
   - Used in header and footer.
6. **Contact email for the footer**
   - Example: hello@brand.com

---

## Database Schema (Supabase)
### `clients`
- `id`: UUID (PK)
- `name`: TEXT
- `created_by`: TEXT (Clerk user ID)
- `shopify_store_domain`: TEXT
- `created_at`: TIMESTAMP

### `client_data`
- `id`: UUID (PK)
- `client_id`: UUID (FK to clients)
- `field_key`: TEXT
- `field_value`: TEXT (JSON or plain text)
- `last_updated`: TIMESTAMP

### `shopify_tokens`
- `id`: UUID (PK)
- `client_id`: UUID (FK to clients)
- `access_token`: TEXT (encrypted)
- `store_domain`: TEXT
- `created_at`: TIMESTAMP

### `uploads`
- `id`: UUID (PK)
- `client_id`: UUID (FK to clients)
- `file_path`: TEXT (Supabase storage path)
- `type`: TEXT (e.g., product_csv)
- `uploaded_at`: TIMESTAMP

---

## File Storage Structure (Supabase Buckets)
- `uploads/{client_id}/` → Store data files (CSV, JSON, etc.)
- `images/{client_id}/` → Uploaded assets (optional)

---

## Route Structure (Next.js App Router)
- `/dashboard` → View/add clients
- `/client/[id]` → Client form & data entry
- `/api/shopify/oauth` → OAuth callback
- `/api/shopify/deploy` → Genesis theme & store push
- `/api/upload` → File upload to Supabase

---

## DevOps
- **Repository**: Private GitHub repo
- **CI/CD**: Vercel integration with GitHub
- **Secrets**: Set in Vercel dashboard (Clerk, Supabase, Shopify keys)

---

## Timeline
| Week | Tasks |
|------|-------|
| 1 | Setup: Next.js + Clerk + Supabase + GitHub + Vercel |
| 2 | Shopify OAuth + Client dashboard + database models |
| 3 | Form UI + file upload + data saving to Supabase |
| 4 | Genesis theme deployment + Shopify API integration |
| 5 | Optional: AI content generation + final polish |

---

## Notes
- No theme generator is required (Genesis will be used).
- No user role system is included (solo operator for now).
- Clients do not access the app directly; stores are previewed in Shopify.
- Supabase Storage is used for uploaded files for familiarity and ease of use.

