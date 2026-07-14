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
- A Google OAuth2 client — create one at [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)

### 1. Set up environment variables

> **All credentials** (`GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`) are stored in **GCP Secret Manager** under the project. Retrieve them from the [GCP Console → Secret Manager](https://console.cloud.google.com/security/secret-manager):

**Repo root** — used by Docker Compose to pass credentials to the backend. Create a `.env` file at the repo root (gitignored):

```bash
# .env  (gitignored — retrieve values from GCP Secret Manager)
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
```

**Frontend** — used by Next.js / Auth.js at runtime:

```bash
cd frontend
cp .env.local.example .env.local
# then fill in AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
```

Generate `AUTH_SECRET` with:

```bash
openssl rand -base64 32
```

Add `http://localhost:3000/api/auth/callback/google` as an **Authorized redirect URI** on your Google OAuth client.

### 2. Start the backend and database

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
