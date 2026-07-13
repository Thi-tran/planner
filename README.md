# Planner

A planner app for managing plans. Built with Next.js (frontend) and Spring Boot (backend), backed by PostgreSQL.

## Tech Stack

- **Frontend**: Next.js, TypeScript, styled-components
- **Backend**: Spring Boot (Java 21), Flyway, JPA
- **Database**: PostgreSQL
- **Infrastructure**: Docker, Docker Compose

## Running Locally

### Prerequisites

- [Docker](https://www.docker.com/get-started) with Docker Compose
- [Node.js](https://nodejs.org/) (v18+)

### 1. Start the backend and database

From the repo root:

```bash
docker compose up -d
```

This starts:
- PostgreSQL on port `5432`
- Spring Boot backend on port `8080`

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## GCP Migration Plan

Steps to migrate infrastructure from one GCP project to another (e.g. `planning-reminder` → `planning-reminder-502317`).

### 1. Update the project ID

In `terraform/terraform.tfvars`, set the new project ID:

```hcl
project_id = "planning-reminder-502317"
```

### 2. Clear the old Terraform state

The existing state references the old project. Delete it so Terraform creates everything fresh in the new project:

```bash
cd terraform
rm terraform.tfstate terraform.tfstate.backup
```

### 3. Apply Terraform

```bash
terraform init
terraform plan   # verify all resources target the new project
terraform apply
```

### 4. Build and push the Docker image

Run from the **repo root**:

```bash
export PROJECT_ID=planning-reminder-502317
export REGION=europe-west1
./backend/deploy.sh
```

This builds the backend image, pushes it to Artifact Registry in the new project, and updates the Cloud Run service.

### 5. Set up auto-deploy on PR merge

Set up automatically deploy to in Cloud Build whenever a PR is merged to `main`:

---

## Troubleshooting

### Backend changes not reflected / API returning 404

Sometimes the backend container runs from a stale image and does not pick up the latest code changes. To force a clean rebuild:

```bash
# Remove the existing backend container and image
docker compose stop backend
docker compose rm -f backend
docker rmi planner-backend

# Rebuild and restart
docker compose up -d --build backend
```
