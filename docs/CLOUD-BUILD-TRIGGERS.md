# Cloud Build Triggers Configuration

If Cloud Build triggers fail, ensure each trigger uses the correct config file:

| Service   | Trigger config file          | Build context |
|-----------|-----------------------------|---------------|
| crown-api | `cloudbuild.backend.yaml`   | Builds from `backend/` |
| crown-web | `cloudbuild.frontend.yaml`  | Builds from repo root (Next.js) |

## Update triggers in GCP Console

1. Go to **Cloud Build → Triggers**
2. **crown-api** trigger: Set *Build configuration* → *Cloud Build configuration file* → `cloudbuild.backend.yaml`
3. **crown-web** trigger: Set *Cloud Build configuration file* → `cloudbuild.frontend.yaml`

## Manual deploy (Cloud Shell)

**Use `deploy-backend-cloudbuild.sh` for backend** — the crown-api Cloud Build trigger may be misconfigured (using wrong config). Manual deploy ensures backend gets latest code:

```bash
gcloud config set project gen-lang-client-0711622878
git clone https://github.com/ahmedre3o/Crown-Project-clean.git  # if not already cloned
cd Crown-Project-clean
git fetch origin
git checkout master
git pull --ff-only

# Backend (uses cloudbuild.backend.yaml - builds from backend/, deploys crown-api)
bash scripts/deploy-backend-cloudbuild.sh

# Frontend
bash scripts/deploy-frontend-cloudrun.sh
```

## Verify after deploy

```bash
API_URL="$(gcloud run services describe crown-api --region us-central1 --format='value(status.url)')"
curl -sS "$API_URL/api/health"
curl -i -X POST "$API_URL/api/admin/subscription/reset" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"reason":"testing"}'
```
