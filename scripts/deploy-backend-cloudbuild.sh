#!/bin/bash
# Deploy crown-api using cloudbuild.backend.yaml (for Cloud Build triggers or manual)
# Run from repo root: bash scripts/deploy-backend-cloudbuild.sh

set -euo pipefail

PROJECT="${PROJECT:-gen-lang-client-0711622878}"
REGION="${REGION:-us-central1}"

git fetch origin
git checkout master
git reset --hard origin/master

GIT_SHA="$(git rev-parse HEAD)"
echo "GIT_SHA=$GIT_SHA"

gcloud builds submit \
  --project "$PROJECT" \
  --region "$REGION" \
  --config cloudbuild.backend.yaml \
  .

SERVICE_URL="$(gcloud run services describe crown-api --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
echo "SERVICE_URL=$SERVICE_URL"
echo "Health: $(curl -sS -o /dev/null -w '%{http_code}' "$SERVICE_URL/api/health" || echo 'fail')"
