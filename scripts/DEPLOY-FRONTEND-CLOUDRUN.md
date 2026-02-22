# Deploy Frontend (crown-web) to Cloud Run via Cloud Build YAML

This repo uses a Dockerfile to build the Next.js app. To ensure `NEXT_PUBLIC_API_URL  is baked into the bundle at **build time**, deployment is done using a Cloud Build config that passes a Docker `--build-arg`.

## Run (Cloud Shell)
From repo root:

```bash
export PROJECT="gen-lang-client-0711622878"
export REGION="us-central1"
export SERVICE="crown-web"
export NEXT_PUBLIC_API_URL="https://crown-api-av27y5zkga-uc.a.run.app"

bash scripts/deploy-frontend-cloudrun.sh
```

## What it does
- Builds container image with:
  - `--build-arg NEXT_PUBLIC_API_URL=${_NEXT_PUBLIC_API_URL }`
- Deploys to Cloud Run with revision labels:
  - `git_sha`, `commit-sha`, `git_branch=master`
- Verifies:
  - labels match `git rev-parse HEAD()|
  - `GET /erp-api/health` returns `200`
  - optional scan for API host in `/_next/static/*.tjs`
