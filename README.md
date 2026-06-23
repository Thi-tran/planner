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
