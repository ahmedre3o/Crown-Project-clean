# Deploy Crown (crown-api + crown-web) from GitHub to Cloud Run

Repo: `https://github.com/ahmedre3o/Crown-Project-clean.git`  
Branch: **master**

Cloud Run services: **crown-api** (backend), **crown-web** (frontend), region **us-central1**.

---

## 1. Backend (crown-api)

### 1.1 Build and deploy from repo root

From Cloud Shell or local (with `gcloud` and Docker):

```bash
git clone https://github.com/ahmedre3o/Crown-Project-clean.git
cd Crown-Project-clean
git checkout master
```

Set your GCP project (replace with your project ID if different):

```bash
export PROJECT="756273570281"   # or your project ID, e.g. gen-lang-client-0711622878
export REGION="us-central1"
```

Build and push image from `backend/Dockerfile`:

```bash
export REPO="crown-api-repo"
export IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPO/crown-api:$(git rev-parse --short HEAD)"

gcloud config set project $PROJECT
gcloud config set run/region $REGION

gcloud artifacts repositories create $REPO --repository-format=docker --location=$REGION --project=$PROJECT 2>/dev/null || true

gcloud builds submit ./backend --project $PROJECT --tag $IMAGE
```

Deploy to Cloud Run:

```bash
gcloud run deploy crown-api \
  --project $PROJECT \
  --region $REGION \
  --image $IMAGE \
  --allow-unauthenticated
```

### 1.2 Set CORS and DB env vars on crown-api

CORS must include the frontend origins so login works. Set env vars (Cloud Run → crown-api → Edit & deploy new revision → Variables):

- **CORS_ORIGIN**: `https://crowncs.org,https://www.crowncs.org,https://crown-web-756273570281.us-central1.run.app`  
  (Replace the last URL with your actual crown-web Cloud Run URL if different.)
- **CORS_FRONTEND_URL** (optional): Your crown-web URL if not already in CORS_ORIGIN.
- DB and other vars as in `backend/cloudrun.env.yaml`.

Or via gcloud:

```bash
gcloud run services update crown-api \
  --project $PROJECT \
  --region $REGION \
  --set-env-vars "CORS_ORIGIN=https://crowncs.org,https://www.crowncs.org,https://crown-web-756273570281.us-central1.run.app"
```

---

## 2. Frontend (crown-web)

Build with backend API URL and deploy:

```bash
export NEXT_PUBLIC_API_URL="https://crown-api-756273570281.us-central1.run.app"
# If using cloudbuild.frontend.yaml with substitutions:
gcloud builds submit \
  --project $PROJECT \
  --region $REGION \
  --config cloudbuild.frontend.yaml \
  --substitutions="_PROJECT=$PROJECT,_REGION=$REGION,_SERVICE=crown-web,_NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL,_GIT_SHA=$(git rev-parse HEAD)" \
  .
```

Or use root `cloudbuild.yaml` (default already uses the same API URL):

```bash
gcloud builds submit --config=cloudbuild.yaml --project $PROJECT .
```

---

## 3. Acceptance

### CORS on OPTIONS

```bash
API_URL="https://crown-api-756273570281.us-central1.run.app"
curl -sS -i -X OPTIONS "$API_URL/api/auth/login" \
  -H "Origin: https://crowncs.org" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization"
```

Expected: **204** and headers including:

- `access-control-allow-origin: https://crowncs.org`
- `access-control-allow-credentials: true`
- `access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS`
- `access-control-allow-headers: Content-Type, Authorization`

### Login and data

- Open **https://crowncs.org** (or your crown-web URL), log in → no CORS errors, data (customers/orders) loads.
- Network tab: `POST .../api/auth/login` returns 200 and subsequent requests use `Authorization: Bearer <token>`.

---

## 4. Allowed origins (summary)

| Origin | Purpose |
|--------|--------|
| `https://crowncs.org` | Production custom domain |
| `https://www.crowncs.org` | WWW |
| `https://crown-web-756273570281.us-central1.run.app` | Crown-web Cloud Run URL (adjust if yours differs) |
| `http://localhost:3000` | Local dev |

These are set in backend code defaults and/or via **CORS_ORIGIN** and **CORS_FRONTEND_URL** on crown-api.
