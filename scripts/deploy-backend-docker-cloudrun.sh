#!/bin/bash
# Deploy crown-api from backend/Dockerfile to Cloud Run (no buildpacks).
# Run on Cloud Shell from repo root. Project: gen-lang-client-0711622878 / region: us-central1.
# Fix for 404 on /api/admin/shops and /api/notifications/unread-count when using buildpacks.

set -e

PROJECT="${PROJECT:-gen-lang-client-0711622878}"
REGION="${REGION:-us-central1}"
REPO="${REPO:-crown-api-repo}"
IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPO/crown-api:manual-$(date +%Y%m%d-%H%M%S)"

echo "==> PROJECT=$PROJECT REGION=$REGION"
echo "==> IMAGE=$IMAGE"
echo

gcloud config set project "$PROJECT"
gcloud config set run/region "$REGION"

echo "==> 1) Ensure Artifact Registry repo exists"
gcloud artifacts repositories create "$REPO" \
  --repository-format=docker \
  --location="$REGION" \
  --project="$PROJECT" 2>/dev/null || true

echo "==> 2) Build + Push from backend/Dockerfile"
gcloud builds submit ./backend \
  --project "$PROJECT" \
  --tag "$IMAGE"

echo "==> 3) Deploy crown-api with this image"
gcloud run deploy crown-api \
  --project "$PROJECT" \
  --region "$REGION" \
  --image "$IMAGE" \
  --allow-unauthenticated

echo "==> 4) Test endpoints"
API_URL="$(gcloud run services describe crown-api --region "$REGION" --project "$PROJECT" --format='value(status.url)')"
echo "API_URL=$API_URL"
echo

echo "--- GET /api/health (first 25 lines) ---"
curl -sS -i "$API_URL/api/health" | sed -n '1,25p'
echo

echo "--- GET /api/admin/shops (first 80 lines; expect 401 without token) ---"
curl -sS -i "$API_URL/api/admin/shops" | sed -n '1,80p'
echo

echo "--- GET /api/notifications/unread-count (first 80 lines; expect 401 without token) ---"
curl -sS -i "$API_URL/api/notifications/unread-count" | sed -n '1,80p'
echo

echo "==> Done. If you see 401/403 instead of 404, routes are live."
