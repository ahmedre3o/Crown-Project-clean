# DB Fix Checklist (Cloud SQL – production)

Use this when you see errors like:
- `Table crown_services.sale_items doesn't exist`
- `Unknown column 'p.is_deleted' in where clause`

## Backend schema tool

- **No ORM migrations:** Backend uses **mysql2** and **db.ts** `initializeDatabase()` at startup.
- Schema is defined in code; production-safe SQL is in `backend/sql/production-safe-migrations.sql`.

## Commands to apply schema on Cloud SQL

1. **Connect to Cloud SQL** (from Cloud Shell or machine with Cloud SQL Proxy):
   ```bash
   # Option A: Cloud SQL Proxy
   cloud-sql-proxy gen-lang-client-0711622878:us-central1:INSTANCE &
   mysql -h 127.0.0.1 -u YOUR_USER -p crown_services < backend/sql/production-safe-migrations.sql

   # Option B: gcloud connect (if enabled)
   gcloud sql connect INSTANCE --user=root --database=crown_services
   # Then paste or source the SQL file.
   ```

2. **Or run the script in Cloud Console:**  
   SQL Studio → select database `crown_services` → paste contents of `backend/sql/production-safe-migrations.sql` → Run.

## What the script does (idempotent)

- **§15:** Adds `products.is_deleted` if missing (fixes `Unknown column 'p.is_deleted'`).
- **§16:** Creates `sale_items` if not exists (fixes `Table sale_items doesn't exist`).
- Other sections: users columns/indexes, shops, user_invites, license_codes, etc.

## Required tables for dashboard / POS

- `users`, `shops`, `products`, `categories`, `sales`, `sale_items`, `vault_transactions`, `audit_logs`, `licenses` (and any others referenced in api.ts).

## After running

1. Restart the backend (Cloud Run will pick up DB on next request).
2. Retry the failing request; errors should be resolved.
