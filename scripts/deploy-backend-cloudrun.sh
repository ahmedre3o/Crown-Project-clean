#!/bin/bash
# Deploy latest master to Google Cloud Run (crown-api)
# Run in Cloud Shell from repo root: bash scripts/deploy-backend-cloudrun.sh

set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/workspace/Crown-Project-clean}"
PROJECT="${PROJECT:-gen-lang-client-0711622878}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-crown-api}"

echo "==> Repo: $REPO_DIR"
echo "==> Project: $PROJECT | Region: $REGION | Service: $SERVICE"
echo

cd "$REPO_DIR"

echo "==> Fetch + reset to origin/master (no local drift)"
git fetch origin
git checkout -f master
git reset --hard origin/master

SHA="$(git rev-parse HEAD)"
echo "==> HEAD SHA: $SHA"
echo

echo "==> Ensure backend/.env is not committed and reset it to repo state"
if [ -f backend/.env ]; then
  git checkout -- backend/.env || true
fi

echo "==> Deploy backend to Cloud Run from ./backend with labels git_sha, git_branch=master"
gcloud config set project "$PROJECT" >/dev/null
gcloud config set run/region "$REGION" >/dev/null

pushd backend >/dev/null
gcloud run deploy "$SERVICE" \
  --source . \
  --allow-unauthenticated \
  --labels "git_sha=$SHA,git_branch=master" \
  --quiet
popd >/dev/null

echo
echo "==> Verify latestReadyRevisionName + git_sha label"
LATEST_REV="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.latestReadyRevisionName)')"
REV_SHA="$(gcloud run revisions describe "$LATEST_REV" --region "$REGION" --format='value(metadata.labels.git_sha)')"
SERVICE_URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"

echo "Service URL: $SERVICE_URL"
echo "Latest Ready Revision: $LATEST_REV"
echo "Revision label git_sha: $REV_SHA"
echo "Expected git_sha:      $SHA"
echo

if [ "$REV_SHA" != "$SHA" ]; then
  echo "❌ MISMATCH: revision git_sha label != repo HEAD SHA"
  exit 1
fi

echo "==> Health check: GET /api/health"
HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' "$SERVICE_URL/api/health" || true)"
echo "HTTP status: $HTTP_CODE"

if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Health check failed (expected 200)"
  exit 1
fi

echo
echo "✅ SUCCESS: Deployed master SHA and verified same git_sha label + health 200"
