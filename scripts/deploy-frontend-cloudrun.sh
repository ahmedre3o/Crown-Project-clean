#!/bin/bash
set -euo pipefail

PROJECT="${PROJECT:-gen-lang-client-0711622878}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-crown-web}"
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.crowncs.org}"

git fetch origin
git checkout master
git reset --hard origin/master

GIT_SHA="$(git rev-parse HEAD)"
echo "GIT_SHA=$GIT_SHA"

gcloud builds submit \
  --project "$PROJECT" \
  --region "$REGION" \
  --config cloudbuild.frontend.yaml \
  --substitutions="_PROJECT=$PROJECT,_REGION=$REGION,_SERVICE=$SERVICE,_NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL,_GIT_SHA=$GIT_SHA" \
  .

REV="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format="value(status.latestReadyRevisionName)")"
echo "LATEST_READY_REV=$REV"

L1="$(gcloud run revisions describe "$REV" --project "$PROJECT" --region "$REGION" --format="value(metadata.labels.git_sha)")"
L2="$(gcloud run revisions describe "$REV" --project "$PROJECT" --region "$REGION" --format="value(metadata.labels.commit-sha)")"

echo "rev.labels.git_sha=$L1"
echo "rev.labels.commit-sha=$L2"

test "$L1" = "$GIT_SHA" && test "$L2" = "$GIT_SHA" || { echo "ERROR: SHA labels mismatch"; exit 2; }

SERVICE_URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format="value(status.url)")"
echo "SERVICE_URL=$SERVICE_URL"

curl -sS -o /dev/null -w '%{http_code}\n' "$SERVICE_URL/" || true
