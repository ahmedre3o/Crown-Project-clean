# Crown API – Env Vars Warning

## Critical: Never use `--set-env-vars` for a single var

`gcloud run services update crown-api --set-env-vars FOO=bar` **replaces all env vars** with just `FOO=bar`. This removes DB_HOST, DB_NAME, JWT_SECRET, etc., causing 500 on login.

**Always use `--update-env-vars`** when adding/updating one or more vars:

```bash
gcloud run services update crown-api \
  --region us-central1 \
  --project gen-lang-client-0711622878 \
  --update-env-vars "GCS_PRODUCT_IMAGES_BUCKET=crown-product-images"
```

## Required env vars for crown-api

- **DB_HOST** – `/cloudsql/gen-lang-client-0711622878:us-central1:crown-services-last-project-db`
- **DB_NAME** – `crown_services_dev`
- **DB_MODE** – `socket`
- **INSTANCE_CONNECTION_NAME** – `gen-lang-client-0711622878:us-central1:crown-services-last-project-db`
- **Cloud SQL connector** – `--add-cloudsql-instances=gen-lang-client-0711622878:us-central1:crown-services-last-project-db`

Secrets (from Secret Manager): DB_USER, DB_PASSWORD, JWT_SECRET, GEMINI_API_KEY.
