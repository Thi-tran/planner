---
status: current
feature: Calendar View
---

## Feature: Calendar View

### Requirements Summary

- Google Calendar-style calendar UI with **Day**, **Week**, and **Month** views
- Users can **click any time slot** to open a form and add a new event/item
- Events are persisted via a **Java 21 REST API** and displayed in the correct time slots on load
- Backend runs locally via **Docker** (app + database containers)
- Frontend is built in **Next.js** (App Router)
- Styling via **styled-components** (CSS-in-JS)
- Full-stack integration: Browser → **Next.js Route Handlers** (server) → Java API → PostgreSQL
- Java backend URL is **never exposed to the browser** — all API calls are proxied through Next.js server-side Route Handlers
- Cloud infrastructure managed with **Terraform**: **Cloud Run** (Java backend) + **Cloud SQL** (PostgreSQL) on **GCP**

---

### Workspace Status

> **Greenfield project.** No existing source files were found. Both the `frontend/` (Next.js) and `backend/` (Java 21 Spring Boot) directories must be created from scratch.

---

### Project Structure (Target)

```
planner/
├── frontend/                   # Next.js app
│   ├── app/
│   │   ├── api/
│   │   │   └── events/
│   │   │       ├── route.ts        # GET (list), POST (create) — server-side proxy
│   │   │       └── [id]/
│   │   │           └── route.ts    # GET, PUT, DELETE — server-side proxy
│   │   ├── calendar/
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── registry.tsx            # styled-components SSR registry
│   ├── components/
│   │   └── calendar/
│   │       ├── CalendarLayout.tsx
│   │       ├── CalendarHeader.tsx
│   │       ├── DayView.tsx
│   │       ├── WeekView.tsx
│   │       ├── MonthView.tsx
│   │       ├── TimeGrid.tsx
│   │       ├── EventBlock.tsx
│   │       └── EventModal.tsx
│   ├── lib/
│   │   ├── api.ts              # HTTP client — calls relative /api/events paths
│   │   ├── constants.ts        # Grid hours, color swatches
│   │   └── types.ts            # Shared TypeScript types
│   ├── hooks/
│   │   └── useCalendarEvents.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.ts
│
├── backend/                    # Java 21 Spring Boot app
│   ├── src/main/java/com/planner/
│   │   ├── PlannerApplication.java
│   │   ├── controller/
│   │   │   └── EventController.java
│   │   ├── service/
│   │   │   └── EventService.java
│   │   ├── repository/
│   │   │   └── EventRepository.java
│   │   ├── model/
│   │   │   └── Event.java
│   │   └── dto/
│   │       ├── EventRequest.java
│   │       └── EventResponse.java
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/
│   │       └── migration/
│   │           └── V1__init.sql    # Flyway baseline migration
│   ├── pom.xml
│   └── Dockerfile
│
├── docker-compose.yml          # Postgres + backend services (local dev)
├── terraform/                  # GCP infrastructure
│   ├── main.tf                 # Provider + project config
│   ├── variables.tf
│   ├── outputs.tf
│   ├── cloud_run.tf            # Cloud Run service
│   ├── cloud_sql.tf            # Cloud SQL (PostgreSQL) instance
│   ├── iam.tf                  # Service accounts & IAM bindings
│   ├── artifact_registry.tf    # Docker image registry
│   └── terraform.tfvars.example
└── README.md
```

---

### Data Model

**Event** (stored in PostgreSQL):

| Field         | Type            | Notes                          |
|---------------|-----------------|--------------------------------|
| `id`          | UUID            | Primary key, auto-generated    |
| `title`       | VARCHAR(255)    | Required                       |
| `description` | TEXT            | Optional                       |
| `start_time`  | TIMESTAMPTZ     | Required — ISO 8601 UTC        |
| `end_time`    | TIMESTAMPTZ     | Required — must be after start |
| `color`       | VARCHAR(7)      | Optional hex color (#3b82f6)   |
| `created_at`  | TIMESTAMPTZ     | Auto-set on insert             |
| `updated_at`  | TIMESTAMPTZ     | Auto-set on update             |

---

### Backend API Design

Base URL: `http://localhost:8080/api`

| Method | Endpoint               | Description                              |
|--------|------------------------|------------------------------------------|
| GET    | `/events`              | List events; accepts `?from=&to=` (ISO)  |
| POST   | `/events`              | Create a new event                       |
| GET    | `/events/{id}`         | Get a single event by UUID               |
| PUT    | `/events/{id}`         | Update an existing event                 |
| DELETE | `/events/{id}`         | Delete an event                          |

**EventRequest (POST/PUT body):**
```json
{
  "title": "Team standup",
  "description": "Daily sync",
  "startTime": "2026-06-16T09:00:00Z",
  "endTime": "2026-06-16T09:30:00Z",
  "color": "#3b82f6"
}
```

**EventResponse:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Team standup",
  "description": "Daily sync",
  "startTime": "2026-06-16T09:00:00Z",
  "endTime": "2026-06-16T09:30:00Z",
  "color": "#3b82f6",
  "createdAt": "2026-06-13T10:00:00Z",
  "updatedAt": "2026-06-13T10:00:00Z"
}
```

---

### Request Flow

```
Browser (client components)
  └── fetch('/api/events')          # relative path, no backend URL in bundle
        │
        ▼
Next.js Route Handlers             # app/api/events/route.ts  (server-side)
  └── fetch(process.env.API_URL)    # API_URL is a server-only env var
        │
        ▼
Java Spring Boot backend           # localhost:8080 (local) or Cloud Run (prod)
        │
        ▼
PostgreSQL (Cloud SQL / Docker)
```

`API_URL` is never included in the browser bundle. Set it as:
- **Local dev:** `API_URL=http://localhost:8080` in `frontend/.env.local`
- **Vercel:** server-side environment variable (not `NEXT_PUBLIC_*`) in project settings

---

### Frontend Component Architecture

```
CalendarLayout (state: currentView, currentDate)
├── CalendarHeader
│   ├── Today button
│   ├── Prev / Next navigation arrows
│   ├── Current date label
│   └── View toggle (Day | Week | Month)
│
├── DayView  (when view = "day")
│   └── TimeGrid
│       └── EventBlock (per event)
│
├── WeekView (when view = "week")  [default]
│   └── TimeGrid
│       └── EventBlock (per event)
│
└── MonthView (when view = "month")
    └── MonthCell (per day)
        └── EventChip (compact event label)

TimeGrid (shared by Day + Week views)
  - Renders 24-hour rows (or configurable range, e.g. 07:00–22:00)
  - Each cell is clickable → opens EventModal with pre-filled startTime
  - Positions EventBlocks absolutely based on startTime/endTime offsets

EventModal (dialog/sheet)
  - Fields: title (required), description, start datetime, end datetime, color
  - Edit mode: pre-populate from existing event data
  - Calls POST /api/events (create) or PUT /api/events/{id} (edit)
  - Delete button in edit mode: calls DELETE /api/events/{id}
```

---

### Implementation Steps

#### Step 1: Scaffold the Next.js frontend
- **What:** Bootstrap a new Next.js 14+ app with TypeScript, styled-components, and App Router
- **Where:** `frontend/`
- **How:**
  - Run `npx create-next-app@latest frontend --typescript --app --eslint --src-dir=false`
  - Install additional dependencies: `styled-components@5`, `@types/styled-components`, `date-fns` (date math), `@radix-ui/react-dialog` (modal) — **pin to v5** (`npm install styled-components@5 @types/styled-components`) because the Next.js SWC compiler's `styledComponents: true` option is only compatible with v5; v6 removed support for this transform
  - Add `styledComponents: true` to `next.config.ts` compiler options to enable SSR support for styled-components
  - Create `app/registry.tsx` (styled-components `ServerStyleSheet` registry) and wrap `app/layout.tsx` with it to avoid flash of unstyled content during SSR
  - **No `rewrites()` needed** — Next.js Route Handlers (Step 2b) handle all `/api/*` routing in every environment
  - Create a root-level `.gitignore` with entries for `node_modules/`, `.next/`, `.env*.local`, `terraform.tfvars`, `terraform.tfstate`, `terraform.tfstate.backup`, `.terraform/`
  - **Note:** Every component that uses `useState`, `useEffect`, or browser event handlers (`CalendarLayout`, `CalendarHeader`, `TimeGrid`, `EventBlock`, `EventModal`, `DayView`, `WeekView`, `MonthView`) and every custom hook must include `'use client'` as the very first line — Next.js App Router defaults to Server Components

#### Step 2: Define shared TypeScript types, API client, and Route Handlers
- **What:** Create `lib/types.ts`, `lib/constants.ts`, `lib/api.ts`, and the Next.js Route Handler files that proxy to the Java backend
- **Where:** `frontend/lib/`, `frontend/app/api/`
- **How:**
  - `types.ts` exports `CalendarEvent` matching the EventResponse JSON shape, plus `CalendarView = 'day' | 'week' | 'month'`
  - `constants.ts` exports `GRID_START_HOUR = 7`, `GRID_END_HOUR = 22`, and the 8 preset event color swatches array
  - `api.ts` uses plain relative paths (`fetch('/api/events/...')`) — **no `NEXT_PUBLIC_API_URL`**; calls are always routed through the Next.js server
  - `app/api/events/route.ts`: `GET` (forwards `?from=&to=` params), `POST` (forwards body) — reads `process.env.API_URL` server-side
  - `app/api/events/[id]/route.ts`: `GET`, `PUT` (forwards body), `DELETE` (returns 204) — reads `process.env.API_URL` server-side
  - `API_URL` defaults to `http://localhost:8080`; set in `frontend/.env.local` for local dev and as a server-side env var on Vercel for production

#### Step 3: Build the `useCalendarEvents` custom hook
- **What:** React hook that fetches events for the visible date range and exposes CRUD actions
- **Where:** `frontend/hooks/useCalendarEvents.ts`
- **How:**
  - Accepts `{ from: Date, to: Date }` as parameters
  - Uses `useState` for the event list and `useEffect` to call `getEvents` on mount / when date range changes
  - Exposes `events`, `createEvent`, `updateEvent`, `deleteEvent`, `isLoading`, `error`
  - After create/update/delete, re-fetches to keep state in sync

#### Step 4: Build the `CalendarHeader` component
- **What:** Top navigation bar with date label, prev/next buttons, Today button, and view switcher
- **Where:** `frontend/components/calendar/CalendarHeader.tsx`
- **How:**
  - Receives `currentDate`, `currentView`, `onDateChange`, `onViewChange` as props
  - Prev/Next advances by 1 day (Day view), 7 days (Week view), or 1 month (Month view) using `date-fns` `addDays`/`addWeeks`/`addMonths`
  - View switcher renders three `<button>` elements styled with a `styled-components` `NavButton` that accepts an `$active` transient prop for active state styling

#### Step 5: Build the `TimeGrid` component (core of Day/Week views)
- **What:** Scrollable 24-hour vertical grid; the foundational layout for Day and Week views
- **Where:** `frontend/components/calendar/TimeGrid.tsx`
- **How:**
  - File must begin with `'use client'`
  - Renders a left column of hour labels for the configured work-hours range only (default **07:00–22:00**, driven by `GRID_START_HOUR`/`GRID_END_HOUR` constants from `lib/constants.ts`)
  - Each hour row is 60px tall (1px per minute); total grid height = `(GRID_END_HOUR - GRID_START_HOUR) * 60` px (default 900px)
  - Each empty cell is a `<div>` with an `onClick` handler; clicked minute = `Math.floor((e.clientY - containerRef.current.getBoundingClientRect().top + containerRef.current.scrollTop) / PX_PER_MINUTE) + GRID_START_HOUR * 60` — `scrollTop` must be included or times will be wrong after scrolling
  - `EventBlock` components are positioned absolutely using `top = (startMinutes * px/min)` and `height = (durationMinutes * px/min)`
  - Accepts `columns: Date[]` so the same component handles both Day view (1 column) and Week view (7 columns)

#### Step 6: Build the `EventBlock` component
- **What:** Absolutely-positioned event card inside `TimeGrid`
- **Where:** `frontend/components/calendar/EventBlock.tsx`
- **How:**
  - File must begin with `'use client'`
  - Receives `event: CalendarEvent`, `columnIndex`, `totalColumns` (for overlap stacking)
  - Displays title and time range (e.g. "09:00 – 09:30")
  - Background color injected via a styled-components prop (e.g. `styled.div<{ $color: string }>`) defaulting to `#3b82f6`
  - `onClick` → calls `onEventClick(event)` to open `EventModal` in edit mode
  - **Overlap detection (run in parent before rendering):** sort events by `startTime`; sweep through to group overlapping intervals — two events overlap if `a.startTime < b.endTime && b.startTime < a.endTime`; within each group assign each event a 0-based `columnIndex` and set `totalColumns` to the group size; `EventBlock` width = `100% / totalColumns`, left offset = `columnIndex / totalColumns * 100%`

#### Step 7: Build the `DayView` and `WeekView` components
- **What:** Wrappers that compose `TimeGrid` for single-day and 7-day views
- **Where:** `frontend/components/calendar/DayView.tsx`, `WeekView.tsx`
- **How:**
  - `DayView`: passes `columns={[currentDate]}` to `TimeGrid`, filters events to that day
  - `WeekView`: derives the Monday–Sunday array for `currentDate` using `date-fns` `startOfWeek({ weekStartsOn: 1 })`/`eachDayOfInterval`, passes all 7 dates as columns, filters events to that week range; passes `todayDate` so `TimeGrid` can mark the current day column
  - Both pass `onSlotClick` and `onEventClick` up to `CalendarLayout`

#### Step 8: Build the `MonthView` component
- **What:** Traditional monthly grid showing all days, with compact event chips
- **Where:** `frontend/components/calendar/MonthView.tsx`
- **How:**
  - Uses `date-fns` `startOfMonth`, `endOfMonth`, `eachDayOfInterval` to get all days
  - Pads the grid to always start on Monday (or Sunday depending on locale)
  - Each day cell shows up to 3 events as compact chips; overflow shows "+N more"
  - Clicking a day cell switches to Day view for that date
  - Clicking an empty area in a day cell calls `onSlotClick` with 09:00 as the default time

#### Step 9: Build the `EventModal` component
- **What:** Dialog for creating and editing events
- **Where:** `frontend/components/calendar/EventModal.tsx`
- **How:**
  - Uses `@radix-ui/react-dialog` for accessible dialog
  - Form fields: title (text, required), description (textarea), start datetime-local input, end datetime-local input, color picker (8 preset swatches rendered as clickable color circles)
  - When `initialEvent` prop is provided → edit mode (pre-populated, DELETE button visible)
  - When `initialSlot: { date, time }` provided → create mode with pre-filled start time and `end = start + 1 hour`
  - On submit: calls `createEvent` or `updateEvent` from the hook; closes modal on success
  - Input validation: title required, endTime > startTime

#### Step 10: Build the `CalendarLayout` and wire everything together
- **What:** Top-level container that owns view state, date state, and modal state
- **Where:** `frontend/components/calendar/CalendarLayout.tsx`, `frontend/app/calendar/page.tsx`
- **How:**
  - File must begin with `'use client'`
  - State: `currentView` (defaults to `'week'`), `currentDate` (defaults to `new Date()` — today), `modalState: { open, initialSlot?, initialEvent? }`
  - On first render, `WeekView` is active and today's column receives a `$isToday` prop that highlights it with a distinct background/border via styled-components
  - Derives `rangeFrom`/`rangeTo` from `currentDate` + `currentView` and passes to `useCalendarEvents`
  - While `isLoading` is true, render a centered `<LoadingSpinner>` styled component in place of the calendar grid; while `error` is non-null, render an inline `<ErrorBanner>` styled component above the grid with the error message and a Retry button that re-calls the fetch
  - Renders `<CalendarHeader>` + the active view component
  - `onSlotClick(date, time)` → sets `modalState` to open create mode
  - `onEventClick(event)` → sets `modalState` to open edit mode
  - `app/calendar/page.tsx` simply renders `<CalendarLayout />`; `app/page.tsx` redirects to `/calendar`

#### Step 11: Scaffold the Spring Boot backend
- **What:** Initialize a new Spring Boot 3.x project with Java 21 virtual threads, JPA, PostgreSQL, and Flyway
- **Where:** `backend/`
- **How:**
  - **Maven wrapper:** Download the project ZIP from [start.spring.io](https://start.spring.io) (which includes `mvnw` and `.mvn/wrapper/`) or run `mvn wrapper:wrapper -Dmaven=3.9.6` inside `backend/` after scaffold — the `mvnw` script is required by the Dockerfile
  - Dependencies in `pom.xml`: `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `postgresql` driver, `spring-boot-starter-validation`, `lombok`, `flyway-core`, `spring-boot-starter-actuator`, `com.google.cloud.sql:postgres-socket-factory`
  - Create a `backend/.gitignore` with entries for `target/`, `.mvn/wrapper/maven-wrapper.jar`, `*.class`
  - Enable virtual threads in `application.yml`: `spring.threads.virtual.enabled=true`
  - Set `spring.jpa.hibernate.ddl-auto=validate` in **all** profiles — Flyway manages the schema, Hibernate only validates it
  - Set `spring.flyway.enabled=true`; create `src/main/resources/db/migration/V1__init.sql` with the full `CREATE TABLE events (...)` DDL matching the data model
  - `application.yml` reads DB connection from environment variables: `${DB_HOST}`, `${DB_PORT}`, `${DB_NAME}`, `${DB_USER}`, `${DB_PASSWORD}`; Cloud Run overrides with `SPRING_DATASOURCE_URL` (see Step 19)
  - Add `cors.allowed-origins=${CORS_ALLOWED_ORIGINS:http://localhost:3000}` property (used by Step 14)

#### Step 12: Define the `Event` JPA entity and repository
- **What:** `Event.java` mapped to the `events` table; `EventRepository` for DB access
- **Where:** `backend/src/main/java/com/planner/model/`, `backend/src/main/java/com/planner/repository/`
- **How:**
  - `Event` annotated with `@Entity`, `@Table(name = "events")`, uses `@UuidGenerator` for the UUID primary key
  - Fields map to the data model table above; `@Column(nullable=false)` on required fields
  - `@PrePersist`/`@PreUpdate` hooks set `createdAt`/`updatedAt`
  - `EventRepository` extends `JpaRepository<Event, UUID>` and adds a custom query method: `findByStartTimeLessThanAndEndTimeGreaterThan(Instant to, Instant from)` — returns all events where `startTime < to AND endTime > from`, which correctly captures events that span the range boundary (e.g. a multi-hour event starting before `from`)

#### Step 13: Define DTOs and implement `EventService`
- **What:** Request/Response DTOs with Bean Validation; service with business logic
- **Where:** `backend/src/main/java/com/planner/dto/`, `backend/src/main/java/com/planner/service/`
- **How:**
  - `EventRequest`: fields annotated with `@NotBlank` (title), `@NotNull` (startTime, endTime), custom `@AssertTrue` validating `endTime.isAfter(startTime)`; `color` is optional but if present must match `@Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "color must be a valid hex color")`
  - `EventResponse`: a Java record for immutable projection from `Event`
  - `EventService` wraps repository calls; throws `ResourceNotFoundException` (→ 404) when ID not found on GET/PUT/DELETE

#### Step 14: Implement the `EventController`
- **What:** REST controller exposing all five endpoints; handles CORS for local frontend dev
- **Where:** `backend/src/main/java/com/planner/controller/EventController.java`
- **How:**
  - `@RestController @RequestMapping("/api/events") @CrossOrigin(origins = "${cors.allowed-origins}")`  — reads from `application.yml` property which defaults to `http://localhost:3000`; inject the production frontend URL via `CORS_ALLOWED_ORIGINS` env var on Cloud Run
  - `GET /events`: accepts `@RequestParam(required=false) Instant from, Instant to`; if omitted, defaults to current week
  - `POST /events`: `@RequestBody @Valid EventRequest`; returns 201 Created with response body
  - `GET /{id}`: returns 200 or 404
  - `PUT /{id}`: `@RequestBody @Valid EventRequest`; returns 200
  - `DELETE /{id}`: returns 204 No Content
  - Add a `@RestControllerAdvice` global handler to map `MethodArgumentNotValidException` → 400 with field errors and `ResourceNotFoundException` → 404

#### Step 15: Write the `Dockerfile` for the backend
- **What:** Multi-stage Dockerfile for the Java 21 backend
- **Where:** `backend/Dockerfile`
- **How:**
  ```dockerfile
  # Stage 1 — build
  FROM eclipse-temurin:21-jdk-alpine AS builder
  WORKDIR /app
  COPY . .
  RUN ./mvnw package -DskipTests --no-transfer-progress

  # Stage 2 — runtime
  FROM eclipse-temurin:21-jre-alpine
  WORKDIR /app
  COPY --from=builder /app/target/*.jar app.jar
  EXPOSE 8080
  ENTRYPOINT ["java", "-jar", "app.jar"]
  ```

#### Step 16: Write `docker-compose.yml`
- **What:** Compose file that starts PostgreSQL and the Spring Boot backend together
- **Where:** `docker-compose.yml` (project root)
- **How:**
  ```yaml
  services:
    db:
      image: postgres:16-alpine
      environment:
        POSTGRES_DB: planner
        POSTGRES_USER: planner
        POSTGRES_PASSWORD: planner
      ports:
        - "5432:5432"
      volumes:
        - pgdata:/var/lib/postgresql/data
      healthcheck:
        test: ["CMD", "pg_isready", "-U", "planner"]
        interval: 5s
        timeout: 3s
        retries: 5

    backend:
      build: ./backend
      ports:
        - "8080:8080"
      environment:
        DB_HOST: db
        DB_PORT: 5432
        DB_NAME: planner
        DB_USER: planner
        DB_PASSWORD: planner
        SPRING_PROFILES_ACTIVE: dev
        # Flyway runs V1__init.sql on first start; DDL is always 'validate'
        # DB_PASSWORD here is for local dev only — not a production secret
      depends_on:
        db:
          condition: service_healthy

  volumes:
    pgdata:
  ```

#### Step 17: Configure the Next.js API proxy
- **What:** Proxy `/api/*` in Next.js dev server to the backend at `localhost:8080`
- **Where:** `frontend/next.config.ts`
- **How:**
  - Use Next.js `rewrites()` to forward `/api/:path*` to `http://localhost:8080/api/:path*`
  - ~~This proxy only works in the **Next.js dev server** (`npm run dev`); it does not apply to deployed builds~~ **Superseded** — `rewrites()` has been removed from `next.config.ts`; Next.js Route Handlers at `app/api/events/` handle all environments uniformly
  - **Production (Vercel):** Deploy the `frontend/` directory to Vercel. Set `API_URL` (server-side, **not** `NEXT_PUBLIC_*`) to the Cloud Run service URL in Vercel project settings. The backend URL is never sent to the browser. Set `CORS_ALLOWED_ORIGINS` in Cloud Run to the Vercel deployment URL for any direct server-to-server calls

#### Step 18: Write Terraform configuration — Artifact Registry & Cloud SQL
- **What:** Provision a Docker image registry and a managed PostgreSQL instance on GCP
- **Where:** `terraform/`
- **How:**
  - `main.tf`: configure `google` provider, set `project`, `region` (e.g. `europe-west1`) from variables; enable required APIs (`run.googleapis.com`, `sqladmin.googleapis.com`, `artifactregistry.googleapis.com`, `secretmanager.googleapis.com`)
  - `variables.tf`: declare `project_id`, `region`, `db_password` (marked `sensitive = true`)
  - `artifact_registry.tf`: create `google_artifact_registry_repository` (`planner-backend`, format `DOCKER`)
  - `cloud_sql.tf`:
    - `google_sql_database_instance`: Postgres 16, tier `db-f1-micro`, `deletion_protection = false` (set to `true` before promoting to production); **do not enable private IP** — connectivity is handled by the Cloud SQL Auth Proxy sidecar on Cloud Run, which does not require a VPC or VPC Access Connector
    - `google_sql_database`: database named `planner`
    - `google_sql_user`: user `planner`, password sourced from `var.db_password`
  - Store `db_password` in **Secret Manager** (`google_secret_manager_secret` + `google_secret_manager_secret_version`) so it is never in state plaintext
  - `outputs.tf`: export `sql_instance_connection_name`, `artifact_registry_url`

#### Step 19: Write Terraform configuration — Cloud Run service
- **What:** Deploy the Java backend container to Cloud Run with Cloud SQL connectivity
- **Where:** `terraform/cloud_run.tf`, `terraform/iam.tf`
- **How:**
  - `iam.tf`: create a dedicated `google_service_account` (`planner-cloudrun-sa`); bind roles `roles/cloudsql.client`, `roles/secretmanager.secretAccessor`
  - `cloud_run.tf`: `google_cloud_run_v2_service`
    - Image: `${var.region}-docker.pkg.dev/${var.project_id}/planner-backend/backend:latest`
    - Env vars injected:
      - `DB_NAME`, `DB_USER` as plain values
      - `DB_PASSWORD` sourced from Secret Manager via `env[].value_source.secret_key_ref`
      - `SPRING_DATASOURCE_URL` = `jdbc:postgresql:///<db_name>?cloudSqlInstance=<connection_name>&socketFactory=com.google.cloud.sql.postgres.SocketFactory&ipTypes=PUBLIC` — this replaces the `DB_HOST`/`DB_PORT` model for Cloud Run; requires `com.google.cloud.sql:postgres-socket-factory` in `pom.xml`
      - `CORS_ALLOWED_ORIGINS` = frontend URL
    - `annotations`: `run.googleapis.com/cloudsql-instances = <connection_name>` (injects the Cloud SQL Auth Proxy sidecar — no Unix socket volume mount needed with the socket factory approach)
  - Configure `liveness_probe` and `startup_probe` on the container to hit `GET /actuator/health` (provided by `spring-boot-starter-actuator`); this prevents Cloud Run from routing traffic before the app is ready and avoids health check 404s
  - `service_account`: `planner-cloudrun-sa`
  - `google_cloud_run_v2_service_iam_member`: allow `allUsers` → `roles/run.invoker` (public API; restrict to authenticated if needed)
  - `outputs.tf`: add `cloud_run_url`

#### Step 20: Add CI/CD build-and-deploy script
- **What:** Shell script (or GitHub Actions workflow stub) to build the Docker image, push to Artifact Registry, and re-deploy Cloud Run
- **Where:** `backend/deploy.sh` (or `.github/workflows/deploy.yml`)
- **How:**
  - Authenticate: `gcloud auth configure-docker ${REGION}-docker.pkg.dev`
  - Set image tag: `GIT_SHA=$(git rev-parse --short HEAD)`
  - Build: `docker build -t ${REGISTRY}/backend:${GIT_SHA} ./backend`
  - Push: `docker push ${REGISTRY}/backend:${GIT_SHA}`
  - Deploy: `gcloud run services update planner-backend --image ${REGISTRY}/backend:${GIT_SHA} --region ${REGION}`
  - Script reads `PROJECT_ID`, `REGION` from environment variables — no hardcoded values

#### Step 21: End-to-end integration smoke test
- **What:** Manual verification checklist to confirm the full stack works (local and cloud)
- **Where:** No code changes; developer executes
- **How:**
  **Local:**
  1. Run `docker compose up --build` from project root → Postgres + backend start
  2. Run `cd frontend && npm run dev` → Next.js starts on port 3000
  3. Open `http://localhost:3000/calendar` → Week view renders with current week, today highlighted
  4. Click a time slot → EventModal opens with pre-filled time
  5. Fill in title and submit → event appears in the grid; verify `GET /api/events` returns it
  6. Click the event → edit modal opens; change title and save → verify update persists
  7. Delete the event from edit modal → event disappears from grid
  8. Switch to Month view → event chips appear on correct day
  9. Switch to Day view → event appears at correct time slot

  **GCP:**
  10. Run `terraform init && terraform apply` in `terraform/` → Cloud SQL instance + Cloud Run service provisioned
  11. Run `backend/deploy.sh` → image pushed to Artifact Registry, Cloud Run updated
  12. Hit the Cloud Run URL (`terraform output cloud_run_url`) → `GET /api/events` returns `[]`
  13. Point frontend `NEXT_PUBLIC_API_URL` at the Cloud Run URL and repeat steps 5–9

  **Vercel:**
  14. Push `frontend/` to a GitHub repo connected to Vercel (or run `vercel deploy` from `frontend/`)
  15. In Vercel project settings, add environment variable `NEXT_PUBLIC_API_URL = <Cloud Run URL>`
  16. In Cloud Run env vars, update `CORS_ALLOWED_ORIGINS` to the Vercel deployment URL
  17. Open the Vercel URL → calendar loads, events CRUD works end-to-end

---

### Dependencies & Prerequisites

**Frontend:**
- Node.js 20+
- `next` 14+, `react` 18+, `typescript`
- `styled-components@5`, `@types/styled-components` — CSS-in-JS styling with SSR support (pinned to v5 for Next.js SWC compiler compatibility)
- `date-fns` — date arithmetic (week/month ranges, formatting)
- `@radix-ui/react-dialog` — accessible modal primitive

**Backend:**
- Java 21 (JDK, provided by Docker image)
- Spring Boot 3.3+
- `spring-boot-starter-web`
- `spring-boot-starter-data-jpa`
- `org.postgresql:postgresql`
- `spring-boot-starter-validation`
- `org.projectlombok:lombok`
- `org.flywaydb:flyway-core` — database schema migrations
- `spring-boot-starter-actuator` — `/actuator/health` endpoint for Cloud Run health probes
- `com.google.cloud.sql:postgres-socket-factory` — Cloud SQL Auth Proxy socket factory for Cloud Run connectivity

**Infrastructure (local):**
- Docker Desktop (or Docker Engine + Compose plugin) installed locally
- PostgreSQL 16 (run via Docker; no local install required)

**Infrastructure (GCP / Terraform):**
- Terraform 1.7+
- `gcloud` CLI authenticated (`gcloud auth application-default login`)
- GCP project with billing enabled
- APIs enabled: Cloud Run, Cloud SQL Admin, Artifact Registry, Secret Manager
- Permissions: `roles/editor` or fine-grained roles for Cloud Run, Cloud SQL, Artifact Registry, Secret Manager

---

### Out of Scope

- User authentication / multi-tenancy (all events are global for now)
- Recurring events (repeat weekly, monthly, etc.)
- Event reminders or notifications
- Calendar sharing or export (iCal, Google import)
- Drag-and-drop event resizing
- Timezone management beyond UTC storage + local display
- Mobile-responsive optimizations beyond basic layout
- Automated tests (unit, integration, e2e)
- ~~Deployment to any cloud environment~~ *(now in scope via Terraform/GCP)*

---

### Open Questions

1. **Work hours only vs. full 24h?** ✅ **Work hours only.** Time grid shows a configurable range (default **07:00–22:00**); hours outside this range are hidden. Constants `GRID_START_HOUR = 7` and `GRID_END_HOUR = 22` are defined in `lib/constants.ts` so the range is easy to adjust.

2. **Week start day** ✅ **Full 7-day week, Monday start.** WeekView shows Monday–Sunday using `date-fns` `startOfWeek` with `{ weekStartsOn: 1 }`.

3. **Color picker** ✅ **8 preset swatches** (simple, no free-text hex input).

4. **First-time data** ✅ **No seed data.** App starts empty and opens in **Week view centered on the current week**, with today's column visually highlighted.

5. **Gradle vs. Maven?** ✅ **Maven** (`pom.xml`). Steps 11 and 15 use Maven accordingly.
