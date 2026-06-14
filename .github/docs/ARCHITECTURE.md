# Architecture

## Overview

Planner is a Google Calendar-style scheduling app. The frontend is a Next.js app deployed on Vercel. The backend is a Java 21 Spring Boot REST API deployed on Cloud Run. Data is stored in Cloud SQL (PostgreSQL 16) inside a private VPC. The backend URL is never exposed to the browser — all API calls are proxied through Next.js Route Handlers server-side.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│  fetch('/api/events')  ← relative path only, no backend URL    │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Vercel  (Next.js 15, App Router)                               │
│                                                                 │
│  app/api/events/route.ts       ← GET list, POST create          │
│  app/api/events/[id]/route.ts  ← GET, PUT, DELETE               │
│                                                                 │
│  reads: process.env.API_URL    ← server-only, never in bundle   │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS (API_URL = Cloud Run URL)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Cloud Run  (Java 21 Spring Boot)                               │
│  1 vCPU · 512Mi · min 1 instance                               │
│  service account: least-privilege SA                            │
│    roles/cloudsql.client                                        │
│    roles/secretmanager.secretAccessor                           │
│                                                                 │
│  Direct VPC Egress (PRIVATE_RANGES_ONLY)                       │
│  Cloud SQL Auth Proxy sidecar (ipTypes=PRIVATE)                │
└──────────────────────────────┬──────────────────────────────────┘
                               │ private IP (VPC peering)
              ┌────────────────▼────────────────────────┐
              │  private VPC                            │
              │                                         │
              │  ┌──────────────────────────────────┐   │
              │  │  Cloud SQL                       │   │
              │  │  PostgreSQL 16 · db-f1-micro      │   │
              │  │  private IP only (no public IP)   │   │
              │  └──────────────────────────────────┘   │
              └─────────────────────────────────────────┘
                               │
              ┌────────────────▼────────────────────────┐
              │  Secret Manager                         │
              │  db password secret                     │
              │  (mounted as env var at runtime)        │
              └─────────────────────────────────────────┘
```

---

## Components

### Frontend — Next.js (Vercel)

| Path | Purpose |
|------|---------|
| `app/api/events/route.ts` | Route Handler — proxies GET (list) and POST to backend |
| `app/api/events/[id]/route.ts` | Route Handler — proxies GET, PUT, DELETE for a single event |
| `components/calendar/CalendarLayout.tsx` | Top-level state owner (view, date, modal) |
| `components/calendar/CalendarHeader.tsx` | Navigation, view switcher |
| `components/calendar/TimeGrid.tsx` | Scrollable hour grid shared by Day and Week views |
| `components/calendar/EventBlock.tsx` | Absolutely-positioned event card with overlap layout |
| `components/calendar/EventModal.tsx` | Create/edit/delete dialog (@radix-ui/react-dialog) |
| `components/calendar/DayView.tsx` | Single-column TimeGrid wrapper |
| `components/calendar/WeekView.tsx` | 7-column TimeGrid wrapper (Mon–Sun) |
| `components/calendar/MonthView.tsx` | Monthly grid with compact event chips |
| `hooks/useCalendarEvents.ts` | Fetch + CRUD hook, re-fetches after mutations |
| `lib/api.ts` | HTTP client — relative `/api/events/…` paths only |
| `lib/types.ts` | `CalendarEvent`, `EventRequest`, `CalendarView` |
| `lib/constants.ts` | `GRID_START_HOUR=7`, `GRID_END_HOUR=22`, 8 color swatches |
| `app/registry.tsx` | styled-components SSR registry for App Router |

**Environment variables (Vercel):**

| Variable | Scope | Value |
|----------|-------|-------|
| `API_URL` | Server-only | Cloud Run service URL |

---

### Backend — Spring Boot (Cloud Run)

```
EventController  (/api/events)
  └── EventService
        └── EventRepository  (JpaRepository<Event, UUID>)
              └── Event  (@Entity → events table)
```

| Layer | Responsibility |
|-------|---------------|
| `EventController` | REST endpoints, CORS, input validation, error mapping (400/404) |
| `EventService` | Business logic, default date range, `ResourceNotFoundException` |
| `EventRepository` | `findByStartTimeLessThanAndEndTimeGreaterThan(to, from)` — correct overlap query |
| `Event` | JPA entity, `@UuidGenerator` PK, `@PrePersist`/`@PreUpdate` timestamps |
| `EventRequest` | DTO with Bean Validation (`@NotBlank`, `@NotNull`, `@AssertTrue`, `@Pattern`) |
| `EventResponse` | Immutable Java record — outbound projection |

**Key config (`application.yml`):**
- `spring.threads.virtual.enabled=true` — virtual threads for all request handling
- `spring.jpa.hibernate.ddl-auto=validate` — Flyway owns the schema, Hibernate only validates
- `spring.flyway.enabled=true` — `V1__init.sql` runs on first boot
- DB connection from env vars: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- On Cloud Run, `SPRING_DATASOURCE_URL` overrides host/port (Cloud SQL socket factory)

---

### Infrastructure — Terraform (GCP)

| File | Resources |
|------|-----------|
| `main.tf` | Google provider, enables 6 GCP APIs |
| `vpc.tf` | VPC network, subnet, Private Service Access peering |
| `artifact_registry.tf` | Docker registry `planner-backend` |
| `cloud_sql.tf` | Cloud SQL instance (private IP only), database, user, Secret Manager secret |
| `iam.tf` | Dedicated service account + IAM bindings (least-privilege) |
| `cloud_run.tf` | Cloud Run v2 service, VPC egress, probes, scaling |
| `variables.tf` | `project_id`, `region`, `db_password` (sensitive), `cors_allowed_origins` |
| `outputs.tf` | `cloud_run_url`, `sql_instance_connection_name`, `artifact_registry_url` |

---

## Request Flow

```
1. Browser calls fetch('/api/events?from=…&to=…')
2. Next.js Route Handler receives the request (server-side)
3. Route Handler calls process.env.API_URL + '/api/events?from=…&to=…'
4. Cloud Run receives the request
5. EventController → EventService → EventRepository
6. Repository queries Cloud SQL via Cloud SQL Auth Proxy over private VPC
7. Response flows back: Cloud SQL → Repository → Service → Controller → Route Handler → Browser
```

---

## Local Development

```bash
# Start PostgreSQL + backend
docker compose up --build

# Start frontend
cd frontend && npm run dev
```

**`frontend/.env.local`:**
```
API_URL=http://localhost:8080
```

Open http://localhost:3000/calendar

---

## Deployment

```bash
# 1. Provision GCP infrastructure (first time only)
cd terraform
cp terraform.tfvars.example terraform.tfvars  # fill in values
terraform init && terraform apply

# 2. Build and deploy backend image
PROJECT_ID=<your-project-id> REGION=<region> ./backend/deploy.sh

# 3. Set environment variable on Vercel
#    API_URL = <terraform output cloud_run_url>
```

The `deploy.sh` script builds with `--platform linux/amd64`, tags by git SHA, pushes to Artifact Registry, and updates the Cloud Run service in place.

---

## Security

| Concern | Mitigation |
|---------|-----------|
| Backend URL in browser bundle | Route Handlers proxy all API calls; `API_URL` is server-only |
| Cloud SQL public exposure | `ipv4_enabled = false` — no public IP; reachable only from within the VPC |
| DB password in Terraform state | Stored in Secret Manager; Cloud Run mounts it at runtime via `secretKeyRef` |
| Service account over-privilege | Least-privilege: only `cloudsql.client` + `secretmanager.secretAccessor` |
| Cross-origin requests | `CORS_ALLOWED_ORIGINS` env var restricts allowed origins to the Vercel URL |
| Input validation | Bean Validation on all request DTOs; `@AssertTrue` enforces endTime > startTime |
