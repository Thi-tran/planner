#!/usr/bin/env bash
set -euo pipefail

# Required env vars
: "${PROJECT_ID:?PROJECT_ID must be set}"
: "${REGION:?REGION must be set}"

REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/planner-backend"
GIT_SHA=$(git rev-parse --short HEAD)
IMAGE="${REGISTRY}/backend:${GIT_SHA}"

echo "=== Authenticating Docker with Artifact Registry ==="
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

echo "=== Building ${IMAGE} ==="
docker build --platform linux/amd64 -t "${IMAGE}" ./backend

echo "=== Pushing ${IMAGE} ==="
docker push "${IMAGE}"

echo "=== Deploying to Cloud Run ==="
gcloud run services update planner-backend \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}"

echo "=== Deploy complete: ${IMAGE} ==="
