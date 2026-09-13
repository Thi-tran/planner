# GCP Migration Guide

This note captures the exact steps used to move Planner to a new GCP account and deploy it cleanly.

## Goal

Deploy the app to a fresh GCP account without carrying over the old Cloud SQL data or old project state.

## What is a Google Client ID?

A Google Client ID is the public identifier for your OAuth app in Google Cloud Console. It looks like:

```text
1234567890-abcdefg...apps.googleusercontent.com
```

This is used for:
- frontend Auth.js: `AUTH_GOOGLE_ID`
- backend: `GOOGLE_CLIENT_ID`

The matching `AUTH_GOOGLE_SECRET` is the private secret.

## Create the OAuth client in the new account

1. Open Google Cloud Console.
2. Select the new project.
3. Go to `APIs & Services` → `Credentials`.
4. Click `Create Credentials` → `OAuth 2.0 Client ID`.
5. If prompted, configure the OAuth consent screen first.
6. Choose `Web application`.
7. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<cloud-run-url>/api/auth/callback/google`
8. Save and copy:
   - Client ID
   - Client secret

## Deploy to a new GCP project

Run these commands from the repo root.

```bash
# 1) Sign in to the new account
gcloud auth login
gcloud config set account <NEW_GCP_ACCOUNT_EMAIL>

# 2) Create/select the project
gcloud projects create <NEW_PROJECT_ID> --name "Planner" --quiet

gcloud beta billing projects link <NEW_PROJECT_ID> \
  --billing-account <BILLING_ACCOUNT_ID>

gcloud config set project <NEW_PROJECT_ID>
```

## Set Terraform values

```bash
cd terraform
cat > terraform.tfvars <<EOF
project_id = "<NEW_PROJECT_ID>"
region = "europe-west1"
db_password = "<STRONG_DB_PASSWORD>"
google_client_id = "<NEW_GOOGLE_CLIENT_ID>"
cors_allowed_origins = "https://your-frontend.example.com"
EOF
```

Generate a strong DB password if needed:

```bash
openssl rand -base64 24 | tr -d '\n' | tr '+/' '-_'
```

## Fix Terraform permission issues

If `terraform apply` fails with IAM permission errors like `iam.serviceAccounts.create` or `serviceusage.services.list`, your current account is not the project owner/editor.

Check the identity being used:

```bash
gcloud auth list
gcloud config list
gcloud config set account <NEW_GCP_ACCOUNT_EMAIL>
```

If you are using Application Default Credentials, refresh them:

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project <NEW_PROJECT_ID>
```

If the project owner is different, grant the needed role:

```bash
gcloud projects add-iam-policy-binding <NEW_PROJECT_ID> \
  --member="user:<YOUR_EMAIL>" \
  --role="roles/owner"
```

## Build and push the backend image

```bash
cd ..
export PROJECT_ID=<NEW_PROJECT_ID>
export REGION=europe-west1

gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

docker build --platform linux/amd64 \
  -t "${REGION}-docker.pkg.dev/${PROJECT_ID}/planner-backend/backend:latest" \
  ./backend

docker push "${REGION}-docker.pkg.dev/${PROJECT_ID}/planner-backend/backend:latest"
```

## Apply Terraform

```bash
cd terraform
terraform init -reconfigure
terraform apply -auto-approve
```

## Deploy the backend to Cloud Run

```bash
cd ..
PROJECT_ID=<NEW_PROJECT_ID> REGION=europe-west1 ./backend/deploy.sh
```

## Check the new Cloud Run URL

```bash
gcloud run services describe planner-backend \
  --project <NEW_PROJECT_ID> \
  --region europe-west1 \
  --format='value(status.url)'
```

The redirect URI to add in Google OAuth is:

```text
https://<cloud-run-url>/api/auth/callback/google
```

## Vercel environment variables to update

After deployment, update the frontend env vars in Vercel so they match the new deployment:

```text
API_URL=https://<new-cloud-run-url>
AUTH_GOOGLE_ID=<new-google-client-id>
AUTH_GOOGLE_SECRET=<new-google-client-secret>
AUTH_SECRET=<new-random-secret>
```

Generate a new auth secret:

```bash
openssl rand -base64 32
```

## Notes

- This is a fresh deployment; no old Cloud SQL data is migrated.
- The local Terraform state may still refer to old project IDs; if needed, reset it with:

```bash
rm -f terraform.tfstate terraform.tfstate.backup
terraform init -reconfigure
```

- If Cloud Run says the image is not found, build and push the image before running Terraform again.
- If Terraform fails on service listing or service account creation, the active GCP identity is wrong or the project owner role is missing.
