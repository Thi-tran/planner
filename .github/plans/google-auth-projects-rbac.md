---
status: approved
feature: Google Authentication & Project-based Role Authorization
---

## Feature: Google Authentication & Project-based Role Authorization

### Requirements Summary

- **Google sign-in (OAuth 2.0 / OIDC):** Users authenticate with their Google account. The app establishes an authenticated session and propagates an identity to the backend.
- **Projects layer:** Introduce a `Project` entity as an organizational container. Every `Event` and `Category` belongs to exactly one `Project`.
- **Per-project roles (RBAC):** A user has a role *per project* via a `ProjectMembership` join entity. Roles:
  - **OWNER** — full control: manage members/roles, rename/delete project, plus all Editor rights.
  - **EDITOR** — create/edit/delete events and categories within the project.
  - **VIEWER** — read-only access to events and categories.
- **Backend enforcement:** The API rejects unauthenticated requests and enforces role checks (a Viewer cannot mutate; only an Owner can manage members). Enforcement is server-authoritative.
- **Frontend permission-aware UI:** Hide/disable edit/create/delete controls for Viewers; show member-management UI only to Owners; support project selection/switching.
- **Membership management:** Users can be invited/added to a project by email and assigned a role; Owners can change roles and remove members.

---

### Current-State Notes (grounding)

- **No auth exists today.** Backend endpoints (`/api/events`, `/api/categories`, `/api/projects`) are open; Cloud Run allows `allUsers` invoker; frontend proxies requests through `app/api/*/route.ts` with no credentials.
- **A `projects` feature already exists and is now MERGED to `main` (from branch `feat/manage-projects`) — this plan builds ON TOP of it, not duplicating it. Current working branch: `feat/authentication-google`.** That work delivers:
  - **`V4__add_projects.sql`**: creates the `projects` table (`id, name, description, start_date, end_date, color, status, last_accessed_at, created_at, updated_at`, with `chk_*` constraints; `TIMESTAMP` not `TIMESTAMPTZ`). **No owner/user column.** Seeds a default **"General"** project with fixed UUID `00000000-0000-4000-a000-000000000001`. Adds `events.project_id` (FK → `projects`, `ON DELETE CASCADE`), backfills all existing events to "General", sets it `NOT NULL`, and indexes it. **`categories` are NOT linked to a project.**
  - **Backend:** `ProjectEntity` (mutable, `@Setter`, `com.planner.model.entity`), `ProjectRepository` (`findAllByOrderByLastAccessedAtDescNullsLast`), `ProjectService`, `ProjectMapper`, `ProjectController` at **flat** `/api/projects` (`GET` list-all, `GET/{id}`, `POST`, `PUT/{id}`, `DELETE/{id}`, `PATCH/{id}/access`). `EventEntity` gained a **raw `UUID projectId`** column (NOT a `@ManyToOne`).
  - **Event scoping is via a flat query param:** `GET /api/events?from&to&projectId=` (`EventController.list(from,to,projectId)` → `service.findEvents(...)`). No path-nested routes.
  - **Frontend:** `ProjectContextProvider` + `lib/projectContext.ts` (active project persisted in `localStorage`), `app/projects/page.tsx`, `Sidebar`, create/edit/delete project modals, and `app/api/projects/**` proxy routes.
- **Backend:** Spring Boot 3.5.0 / Java 21, Lombok, Flyway (`feat/manage-projects` merged → migrations are now `V1`–`V4`; **next new migration is `V5`**), Spring Data JPA with `validate` DDL. Layered: `controller → service → mapper → model`.
- **Package inconsistency (verified against source, worse than a single-class issue):** Java *logical* packages do not all match their physical directories:
  - `EventEntity` → physical `model/entity/`, but declares `package com.planner.model;` (imports `com.planner.model.entity.CategoryEntity`).
  - `EventRepository` and `CategoryRepository` → physical `model/repository/`, but both declare `package com.planner.model;` (services import them as `com.planner.model.EventRepository` / `com.planner.model.CategoryRepository`).
  - `ProjectEntity` → `com.planner.model.entity`; `ProjectRepository` → `com.planner.model.repository` (the only classes whose package matches the directory).
  - `CategoryEntity` → `com.planner.model.entity`.
  - **Consequence:** the plan's earlier claim that all repositories "live in `com.planner.model.repository`" is **false** — only `ProjectRepository` does. For *new* code, place new entities in `com.planner.model.entity` and new repositories in `com.planner.model.repository` (matching the newest, correct `Project*` convention). Do NOT relocate the mislabeled existing classes as part of this feature (scope creep); just import them from their real logical packages (`com.planner.model.*`).
- **CORS:** existing `CorsConfiguration` (a `WebMvcConfigurer`, `allowCredentials(true)`, origins from `cors.allowed-origins`) and `ProjectController`'s `@CrossOrigin(origins = "${cors.allowed-origins}")` are left **as-is** by this feature. There are no CORS errors today, so CORS changes are **explicitly out of scope** here (see step 18); the only requirement is that the new Spring Security filter chain must not regress existing preflight behavior.
- **Frontend:** Next.js 16.2.9 / React 19 App Router, styled-components, no session library. `lib/api.ts` calls same-origin `/api/*`, which are proxied by route handlers to `API_URL`.
- **Infra:** Terraform on GCP; Secret Manager already used for `db_password` (pattern to mirror for OAuth secrets); backend on Cloud Run; frontend likely on Vercel (CORS var references a Vercel URL).

---

### Architecture Decision: Token Strategy

**Chosen approach: NextAuth (Auth.js) on the frontend for the Google OAuth dance + a refresh-token-backed session cookie + a backend-verified Google ID token (OIDC JWT) as the bearer credential.**

- The frontend (NextAuth) performs the Google OAuth/OIDC login with **offline access** (`access_type=offline`, `prompt=consent`) so Google returns an **id_token**, **access_token**, and a long-lived **refresh_token**.
- **Where the session lives:** Auth.js stores these tokens in its own **encrypted, HTTP-only session cookie** (JWT session strategy) on the Next.js side. The cookie is encrypted/signed with `AUTH_SECRET` and is only readable server-side — the browser never sees the raw tokens, and no server-side session table is needed. The **backend stays fully stateless** (it stores no session).
- **Silent refresh:** In the Auth.js `jwt` callback, when the Google `id_token` is near expiry (~1h), the persisted `refresh_token` is exchanged at Google's token endpoint for a fresh `id_token` (Google's refresh grant returns a new `id_token` alongside the `access_token`). This makes the login session *feel* durable (cookie `maxAge` e.g. 30 days sliding) while the underlying Google credential rotates hourly. The refresh token never leaves the server-side cookie. **Caveats:** Google returns a `refresh_token` **only on the first consent** with `access_type=offline` **and** `prompt=consent`; subsequent logins usually omit it, so the callback must **persist the original `refresh_token`** and not overwrite it with `undefined`. If refresh fails (revoked/expired/absent), flag the token with an `error` and force re-login on the next request rather than forwarding a stale/blank `id_token`.
- The Next.js API proxy routes read the server-side session, obtain a currently-valid `id_token`, and attach `Authorization: Bearer <id_token>` when forwarding to the backend.
- The backend runs as an **OAuth2 Resource Server** validating the Google-issued **ID token** (an OIDC JWT) via Google's JWKS — no custom token signing needed for v1. Validation specifics:
  - **Audience:** for an ID token obtained through the Auth.js authorization-code flow, the `aud` claim **is** the OAuth **client_id** that requested it. Therefore validating `aud == GOOGLE_CLIENT_ID` is correct. (This is exactly why the *ID token*, not the access token, is forwarded: Google **access tokens are opaque** — not JWKS-verifiable — so a stateless JWT resource server cannot validate them. Semantically ID tokens are meant for the client, but validating issuer+audience+signature makes them a safe bearer for v1; a proper access-token-with-API-audience design is deferred — see Out of Scope.)
  - **Issuer:** Google ID tokens carry `iss` of either `https://accounts.google.com` or the bare `accounts.google.com`. Configure `issuer-uri: https://accounts.google.com` (Google's OIDC discovery issuer). If the bare-host variant is ever observed, use a `DelegatingOAuth2TokenValidator` accepting both; otherwise the discovery-derived validator is sufficient.
  - **Clock skew:** rely on Spring's default `JwtTimestampValidator` (60s skew) for `exp`/`iat`/`nbf`; do not tighten to zero.
  - **JWKS caching:** `NimbusJwtDecoder` (auto-configured from `issuer-uri`) caches Google's JWKS and refreshes on key rotation — no manual cache needed.
- On each authenticated request the backend resolves/creates a local `User` row keyed by the Google `sub` claim (just-in-time provisioning).

Rationale: minimal custom crypto, Google remains the identity source of truth, backend stays stateless, and the user enjoys a persistent session without hourly re-login. Note on revocation: because the backend authorizes via a per-request DB lookup (`ProjectAccessService`), removing/demoting a member takes effect on their **next request** regardless of their still-valid login cookie — the cookie preserves *identity*, not *permissions*. (Alternative — backend-minted app JWTs / opaque server sessions — is recorded in *Open Questions* as a future option if instant session-level revocation is later required.)

---

### Data Model Changes

> **Already exists (from `feat/manage-projects`), reused as-is:** the **`projects`** table (no owner column) and **`events.project_id`** (NOT NULL FK, backfilled to the seeded "General" project). This plan does **not** recreate them. Ownership is introduced purely via the new `project_memberships` table below (the membership rows ARE the source of ownership); no `created_by` column is added to `projects` for v1.

**New table: `users`**

| Field         | Type         | Notes                                   |
|---------------|--------------|-----------------------------------------|
| `id`          | UUID         | PK                                      |
| `google_sub`  | VARCHAR(255) | Unique — Google `sub` claim (stable ID) |
| `email`       | VARCHAR(320) | Unique, from ID token                   |
| `display_name`| VARCHAR(255) | From `name` claim (nullable)            |
| `picture_url` | TEXT         | From `picture` claim (nullable)         |
| `created_at`  | TIMESTAMP    | Not null (match existing `projects` col type) |
| `updated_at`  | TIMESTAMP    | Not null                                |

**New table: `project_memberships`**

| Field         | Type         | Notes                                                    |
|---------------|--------------|----------------------------------------------------------|
| `id`          | UUID         | PK                                                       |
| `project_id`  | UUID         | FK → `projects(id)` ON DELETE CASCADE (existing table)   |
| `user_id`     | UUID         | FK → `users(id)` ON DELETE CASCADE (nullable for pending invite) |
| `invited_email`| VARCHAR(320)| For invites to users who haven't signed in yet          |
| `role`        | VARCHAR(20)  | `OWNER` \| `EDITOR` \| `VIEWER` (`CHECK`, not null)      |
| `status`      | VARCHAR(20)  | `ACTIVE` \| `PENDING` (invite accepted on first login)  |
| `created_at`  | TIMESTAMP    | Not null                                                 |

- Unique constraint: `(project_id, user_id)` where `user_id` is not null; `(project_id, invited_email)` where pending.
- Index `idx__project_memberships__user_id` and `idx__project_memberships__project_id` for the per-request role lookup.

**Updated table: `categories` (events already linked)**

- `events.project_id` **already exists** — no change to `events` schema (may later upgrade the raw `UUID projectId` to a `@ManyToOne`, but keep the existing raw-UUID style for v1 to avoid churn).
- Add `project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE` to **`categories`** (backfill existing rows to the seeded "General" project, then `SET NOT NULL`).
- **Drop the global unique constraint and replace with a per-project one.** The `V2` constraint is an **inline column `UNIQUE`**, so Postgres auto-named it **`categories_name_key`**. The migration must `ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;` then add `CONSTRAINT uq__categories__project_name UNIQUE (project_id, name)`.
- Add index `idx__categories__project_id`.
- **Entity + service impact (do not forget):**
  - `CategoryEntity`: remove `unique = true` from the `name` `@Column`, add a raw `@Column(name = "project_id", nullable = false) UUID projectId` (mirroring `EventEntity`'s raw-UUID style), and declare `@Table(name = "categories", uniqueConstraints = @UniqueConstraint(name = "uq__categories__project_name", columnNames = {"project_id", "name"}))`. (`ddl-auto: validate` does **not** verify unique constraints/indexes, so a stale mapping won't fail startup — but keep metadata honest.)
  - `CategoryService` currently uses **global** `existsByNameIgnoreCase` / `existsByNameIgnoreCaseAndIdNot`. These MUST become **project-scoped**: `existsByProjectIdAndNameIgnoreCase(projectId, name)` and `existsByProjectIdAndNameIgnoreCaseAndIdNot(projectId, name, id)`. Otherwise creating "Work" in project B is wrongly rejected (409) because it exists in project A. Note the DB `UNIQUE(project_id, name)` is **case-sensitive** while the app check is case-insensitive — keep the case-insensitive app check as the real guard (pre-existing behavior preserved).

---

### Implementation Steps

#### A. Backend — Migrations & Backfill

> Migration numbering: `feat/manage-projects` (which owns **`V4__add_projects.sql`**) is **merged**, so the current migrations are `V1`–`V4` and the new ones start at **`V5`** (confirmed against `backend/src/main/resources/db/migration/`).

1. **`V5__auth_users_memberships.sql` — create auth tables**
   - What: Create `users` and `project_memberships` (the `projects` table already exists from `V4`).
   - Where: `backend/src/main/resources/db/migration/V5__auth_users_memberships.sql`.
   - How: Match the **existing** `V4` style (`gen_random_uuid()` PK default, `TIMESTAMP` — not `TIMESTAMPTZ` — to stay consistent with `projects`; explicit indexes). `role`/`status` as `VARCHAR` + `CHECK (...)`; map to Java enum via `@Enumerated(STRING)`. `project_memberships.project_id` FKs the existing `projects(id)` `ON DELETE CASCADE`. Add the two membership indexes.

2. **`V6__link_categories_to_project.sql` — add project_id to categories + backfill**
   - What: Add `project_id` to **`categories`** only (events were already linked in `V4`), backfill into the existing seeded **"General"** project (`00000000-0000-4000-a000-000000000001`), enforce `NOT NULL`, and swap the category unique constraint.
   - Where: `backend/src/main/resources/db/migration/V6__link_categories_to_project.sql`.
   - How (ordered, single migration so `ddl-auto: validate` stays consistent):
     1. Add nullable `project_id UUID REFERENCES projects(id) ON DELETE CASCADE` to `categories`.
     2. `UPDATE categories SET project_id = '00000000-0000-4000-a000-000000000001'` for all existing rows.
     3. `ALTER TABLE categories ALTER COLUMN project_id SET NOT NULL`.
     4. Drop the global unique constraint on `categories.name` — it is the inline-`UNIQUE` auto-named **`categories_name_key`**: `ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;` then `ALTER TABLE categories ADD CONSTRAINT uq__categories__project_name UNIQUE (project_id, name)`.
     5. Create `idx__categories__project_id`.
   - Legacy-data note: existing events/categories already live in the seeded "General" project. A real human gains access to "General" only after sign-in + a membership grant — see the bootstrap decision in Open Questions #2.

#### B. Backend — Security, Entities, Enforcement

3. **Add dependencies**
   - What: Add `spring-boot-starter-security` and `spring-boot-starter-oauth2-resource-server` to `pom.xml`.
   - Where: `backend/pom.xml`.
   - How: Managed by the Spring Boot parent (no explicit versions).

4. **New JPA entities + repositories**
   - What: `UserEntity`, `ProjectMembershipEntity`, and `Role`/`MembershipStatus` enums; repositories for each. (`ProjectEntity`/`ProjectRepository` already exist — reuse; do not recreate.)
   - Where: new entities in `com.planner.model.entity`; new repositories in `com.planner.model.repository` (matching the correctly-packaged `ProjectRepository`). **Note:** the existing `EventEntity`/`EventRepository`/`CategoryRepository` are logically in `com.planner.model` (see Current-State Notes) — import them from there when wiring authorization; do not assume they are under `com.planner.model.repository`.
   - How: Mirror `CategoryEntity`/`ProjectEntity` conventions (Lombok, `@UuidGenerator`, `@PrePersist`/`@PreUpdate`). Timestamps as `Instant` mapped to `TIMESTAMP` columns — both existing tables (`projects` = `TIMESTAMP`, `events` = `TIMESTAMPTZ`) map `Instant` and pass `validate`, so `TIMESTAMP` is safe here. `Role`/`MembershipStatus` as `@Enumerated(STRING)` with `@Column(length = 20)` (≥ longest enum value). For `categories`, add the `project_id` mapping as a **raw `UUID projectId` column** (matching `EventEntity`), not a `@ManyToOne`.
   - Repository queries needed: `UserRepository.findByGoogleSub`, `findByEmailIgnoreCase`; `ProjectMembershipRepository.findByProjectIdAndUserId`, `findByUserId`, `findByProjectId`, `findByInvitedEmailIgnoreCase`, and `existsByProjectIdAndRole` (last-owner guard). For the membership-scoped project list, add a join query returning `(ProjectEntity, role)` in one query (see step 9) to avoid an N+1 role lookup per project.

5. **SecurityFilterChain (resource server)**
   - What: New `SecurityConfiguration` in `com.planner.configuration`.
   - Where: `backend/src/main/java/com/planner/configuration/SecurityConfiguration.java` + `application.yml`.
   - How:
     - `application.yml`: `spring.security.oauth2.resourceserver.jwt.issuer-uri: https://accounts.google.com` and configure expected audience (`GOOGLE_CLIENT_ID`).
     - Add a `JwtDecoder` bean with an **audience validator** (`aud` contains `GOOGLE_CLIENT_ID`) composed via `DelegatingOAuth2TokenValidator` with the default issuer + timestamp (60s skew) validators.
     - `SecurityFilterChain`: `csrf().disable()` (justified — the backend is a stateless bearer API with **no cookie-based auth**, so there is no CSRF surface), `sessionManagement(STATELESS)`, `permitAll` on `/actuator/health` and `OPTIONS` preflight, `authenticated()` on `/api/**`, `oauth2ResourceServer(jwt)`.
     - **CORS: leave existing configuration unchanged (out of scope — no CORS errors today).** To avoid the new security filter chain regressing current behavior, add `http.cors(Customizer.withDefaults())` and `permitAll` on `OPTIONS` preflight so preflight requests are not rejected. Do **not** change origins, `allowCredentials`, the `WebMvcConfigurer` CORS config, or the `@CrossOrigin` annotations.
     - Configure `AuthenticationEntryPoint` → **401** (missing/invalid token) and `AccessDeniedHandler` → **403**, returning the same JSON error shape as `GlobalExceptionHandler`.

6. **Current-user resolution / JIT provisioning**
   - What: A component that, given the validated `Jwt`, resolves-or-creates the local `UserEntity` (by `google_sub`), updates email/name/picture, and activates any `PENDING` memberships matching the email.
   - Where: `com.planner.security.CurrentUserService` (new `security` package) + a helper to fetch the current `UserEntity` in services/controllers (e.g. via `@AuthenticationPrincipal Jwt` or a custom argument resolver).
   - How: Called at the start of request handling (filter or service boundary), inside a `@Transactional` method.
     - **Concurrent JIT race:** two parallel first requests for the same `google_sub` will both attempt an insert → one hits the `users.google_sub` unique constraint. Wrap the insert in a try/catch on `DataIntegrityViolationException` and **re-query `findByGoogleSub` once** (find-or-create-or-refetch). Do not let the raw exception surface as 500.
     - **Email normalization:** store `email` lower-cased; match pending invites case-insensitively (`findByInvitedEmailIgnoreCase`). Google emails are effectively case-insensitive but claim casing can vary.
     - **Pending-invite activation (same transaction):** `UPDATE project_memberships SET user_id = ?, status = 'ACTIVE', invited_email = NULL WHERE invited_email = ? (ci) AND user_id IS NULL`. Guard against creating a duplicate `(project_id, user_id)` if the user is already an active member of that project (skip/merge).
     - **Auto-create a personal default project (new users only):** when a `UserEntity` is **first inserted** (registration), create a personal default project in the **same transaction** and add an `OWNER` `project_memberships` row for the new user, so every registered user immediately has their own project and a non-empty calendar. Only do this on the newly-inserted path (guard with the find-or-create result) so it never runs on subsequent logins. The default project must satisfy the existing `projects` NOT NULL/`CHECK` columns: `name` (e.g. `"My Calendar"` or `"<display_name>'s Project"`), `start_date = CURRENT_DATE`, a valid `color` (one of `'Sky Cyan' | 'Blush Pink' | 'Soft Indigo' | 'Sage Green'`), and `status = 'in progress'`.
     - **Legacy "General" project (one-time adoption):** the seeded "General" project (`00000000-0000-4000-a000-000000000001`) holds pre-existing events/categories and has no owner. **Keep it** and grant `OWNER` on "General" to the **first** registered user (idempotent one-time bootstrap: if "General" has no `OWNER` membership yet, add one) so legacy data isn't orphaned. This is separate from that user's newly-created personal project.
     - Add a handler mapping for `DataIntegrityViolationException` → **409** in `GlobalExceptionHandler` (currently unmapped → 500) so genuine conflicts (e.g. duplicate invite) are reported cleanly.

7. **Authorization enforcement (per-project role checks)**
   - What: Enforce that the current user has an appropriate role on the target project for every event/category/project/membership operation.
   - Where: `com.planner.security.ProjectAccessService` (central authority) invoked by `EventService`, `CategoryService`, `ProjectService`.
   - How (chosen: **service-layer checks via a central authority**, not just annotations, because ownership must be resolved from the data — the project is derived from the path/body, not the URL role):
     - `requireRole(projectId, userId, minRole)` → throws `ForbiddenException` (403) if the membership is missing or below the required role. Role ordering: `VIEWER < EDITOR < OWNER`.
     - Reads (`list`, `get`) require `VIEWER`; mutations (`create/update/delete` events & categories) require `EDITOR`; membership/role/project-delete operations require `OWNER`.
     - Optionally layer `@PreAuthorize`/method security later, but the data-driven check is the source of truth for v1.
   - **Existence-leak policy (pin this):** For operations that fetch a specific resource by id (`GET/PUT/DELETE /api/events/{id}`, `/api/categories/{id}`) or reference a project the caller is not a member of (`?projectId=` list, `GET /api/projects/{id}`), return **404** (not 403) when the caller has *no* membership on the owning project — do not reveal that the id exists. Reserve **403** for the case where the caller *is* a member but lacks the required role (e.g. a Viewer attempting a mutation). This means the id-based handlers must: load the entity → resolve its `projectId` → if no membership → 404 → else `requireRole` (403 on insufficient role).
   - Add `ForbiddenException` → **403** in `GlobalExceptionHandler`; wire the Security `AuthenticationEntryPoint` → **401** and `AccessDeniedHandler` → **403** (step 5).

8. **Scope existing Event/Category APIs by project + authorize**
   - What: Every events/categories request must be bound to a `projectId` and role-checked; a Viewer of project A must never mutate, and no user may touch a project they aren't a member of.
   - Where: `EventController`, `CategoryController`, `EventService`, `CategoryService`, `EventSpecification`, DTOs.
   - How (align to the **existing flat route + `projectId` query/body param** convention already shipped for events — do NOT introduce path-nested routes):
     - **Events:** `GET /api/events?from&to&projectId=` already exists; make `projectId` **required** (`@RequestParam(required = true)`, currently `required = false`) and call `ProjectAccessService.requireRole(projectId, currentUser, VIEWER)` before listing (non-member → 404 per the existence-leak policy). Note `EventRequest.projectId` is **already `@NotNull`** — the create body already carries a required project. **Closing the mutation hole:** `projectId` in the body is client-controlled, so on **create** require `EDITOR` on the body's `projectId`; on **update** require `EDITOR` on the event's **current** project, and **project reassignment via event update is FORBIDDEN in v1** — if the body's `projectId` differs from the loaded event's current `projectId`, **reject with 400** (do not move the event, do not check the target project). On `GET/{id}`, `PUT/{id}`, `DELETE/{id}` resolve the event's `projectId` from the loaded entity and role-check it.
     - **Categories:** add `projectId` (query param for `list`, request body for `create`; resolved from the loaded entity for `update`/`delete`). Add `CategoryRepository.findByProjectIdOrderByNameAsc(...)`; update `CategoryService` uniqueness checks to the project-scoped variants (see Data Model). Require `VIEWER` to read, `EDITOR` to mutate. When an event references a `categoryId`, `EventService.resolveCategory` must verify the category's `projectId` equals the event's `projectId` (else 400) — prevents cross-project category references.
     - Return **404** for a resource id whose owning project the caller can't access (never leak existence); **403** only when the caller is a member but under-privileged.

9. **Extend existing Project APIs + add Membership APIs**
   - What: Add ownership/role enforcement to the **existing** `ProjectController`/`ProjectService` and add membership management. Do NOT recreate the project CRUD — modify it.
   - Where: existing `ProjectController`, `ProjectService`, `ProjectMapper`; new `ProjectMembershipService` + membership endpoints; `com.planner.domain` DTOs.
   - How — changes to existing endpoints:
     - `GET /api/projects` — **change `listAll()`** from "all projects" to "projects the current user is a member of", and include the caller's `role` in `ProjectResponse`. Implementation notes: `ProjectResponse` is a **record with no `role` field** and `ProjectMapper.toResponse(ProjectEntity)` cannot supply a role from the entity alone — (a) add `Role role` to the record, and (b) either overload the mapper as `toResponse(ProjectEntity, Role)` or map in the service. To avoid an **N+1 role lookup** (one membership query per project), use a single join query, e.g. `SELECT p, m.role FROM ProjectMembershipEntity m JOIN ProjectEntity p ON p.id = m.projectId WHERE m.userId = :userId AND m.status = 'ACTIVE' ORDER BY p.lastAccessedAt DESC NULLS LAST`. Preserve the existing `last_accessed_at` ordering.
     - `GET /api/projects/{id}` — require membership (non-member → 404); include the caller's `role`.
     - `POST /api/projects` — after `projectService.create(...)`, **also create an `OWNER` `project_memberships` row** for the current user (single transaction).
     - `PUT /api/projects/{id}` — require `OWNER` before update (project rename/metadata edits are an owner capability per the Requirements Summary; `EDITOR` is scoped to events/categories, not the project entity itself).
     - `DELETE /api/projects/{id}` — require `OWNER`; existing cascade removes events; ensure memberships cascade too (FK `ON DELETE CASCADE`).
     - `PATCH /api/projects/{id}/access` — require `VIEWER` (any member) before touching `last_accessed_at`.
   - How — new membership endpoints:
     - `GET /api/projects/{id}/members` — list members + roles (any member).
     - `POST /api/projects/{id}/members` — invite by email + role (OWNER); creates a `PENDING` membership if the invitee hasn't signed in yet.
     - `PATCH /api/projects/{id}/members/{membershipId}` — change role (OWNER; guard against demoting the last OWNER).
     - `DELETE /api/projects/{id}/members/{membershipId}` — remove member (OWNER; cannot remove the last OWNER).
   - How — membership DTOs (`com.planner.domain`, records mirroring existing `*Request`/`*Response` style):
     - `InviteMemberRequest` — `{ @Email @NotNull String email; @NotNull Role role }` (body for `POST .../members`). Reject inviting `OWNER`? No — allow any of the three roles; last-owner guard only applies to demote/remove.
     - `UpdateMemberRoleRequest` — `{ @NotNull Role role }` (body for `PATCH .../members/{membershipId}`).
     - `MembershipResponse` — `{ UUID id; UUID userId (nullable for PENDING); String email; String displayName (nullable); Role role; MembershipStatus status }` (returned by `GET .../members` and after invite/role-change). Resolve `email`/`displayName` from the linked `UserEntity` when `ACTIVE`, else fall back to `invited_email` for `PENDING` rows.
     - New `ProjectMembershipMapper` (or map inline in `ProjectMembershipService`) converts `ProjectMembershipEntity` (+ optional joined `UserEntity`) → `MembershipResponse`.

#### C. Frontend — Auth, Session, Project Context

10. **Install & configure NextAuth (Auth.js) with Google provider**
    - What: Add `next-auth` (v5/Auth.js, App-Router compatible), Google provider, session strategy, and expose the Google ID token to server code.
    - Where: `frontend/package.json`; `frontend/auth.ts` (Auth.js config); `frontend/app/api/auth/[...nextauth]/route.ts`; `frontend/middleware.ts`.
    - How:
      - Request `openid email profile` scopes with **offline access** (`access_type=offline`, `prompt=consent`) so Google returns a `refresh_token`.
      - In the `jwt` callback, persist `id_token`, `access_token`, `refresh_token`, and `expires_at`; when the `id_token` is near/after expiry, exchange the `refresh_token` at Google's token endpoint for a fresh `id_token` and update the token object (handle refresh failure by flagging the session for re-login). In the `session` callback, expose only what the client UI needs (name/email/picture/role) — **never** leak the raw `id_token`/`refresh_token` to the browser; keep them in the server-side session for the proxy.
      - Set session `maxAge` (e.g. 30 days) so the login session persists across visits.
      - **Verify Next.js 16 specifics before coding** (per `frontend/AGENTS.md`): `next-auth` is **not yet a dependency** and must be added at **v5 (Auth.js beta)** for App-Router/Next-16 support (v4 will not work). Note the AGENTS.md rule to read `node_modules/next/dist/docs/` applies to **Next's own APIs**, not Auth.js (a third-party lib — no auth guide ships in those docs); consult Auth.js v5 docs for the library itself. Concrete Next 16 gotchas that affect this work: route-handler `params` is a **`Promise`** (already the case in existing `app/api/**/[id]/route.ts`), and `cookies()`/`headers()` are **async** — the Auth.js `auth()` session read in proxy routes/middleware must be `await`ed. Auth.js v5 config exports `{ handlers, auth, signIn, signOut }` from a single `auth.ts`; the route handler is `export const { GET, POST } = handlers`.
      - Env: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `AUTH_URL` (Auth.js v5 name; `NEXTAUTH_URL` is the v4 name — use `AUTH_URL`).

11. **Attach bearer token in the API proxy layer**
    - What: All `app/api/**/route.ts` handlers read the server-side session, extract the Google ID token, and forward `Authorization: Bearer <id_token>` to the backend. Reject with 401 if no session.
    - Where: `frontend/app/api/events/route.ts`, `app/api/events/[id]/route.ts`, `app/api/categories/route.ts`, `app/api/categories/[id]/route.ts`, and the **existing** `app/api/projects/**` proxy routes (from `feat/manage-projects` — update, don't recreate).
    - How: Factor a shared helper (e.g. `lib/proxy.ts`) that builds the authenticated `fetch` to `API_URL`, centralizing token attachment and error passthrough. The helper must: (1) `await auth()` and **return 401 immediately if there is no session / no valid `id_token`** (do not call the backend); (2) attach `Authorization: Bearer <id_token>`; (3) **not assume the backend response is JSON** — the current `app/api/events/route.ts` does `await res.json()` unconditionally, which breaks on `204`/empty bodies and on `401/403` error responses that may have no body. Forward the backend status and body faithfully (pass through `204` as empty, stream/`text()`-then-parse otherwise). Retrofit **all** existing proxy routes (`events`, `events/[id]`, `categories`, `categories/[id]`, and the `projects/**` routes) onto this helper so behavior is uniform. Keep routes flat (`/api/events?projectId=`, `/api/categories?projectId=`) to match the backend contract.

12. **Route protection**
    - What: Unauthenticated users are redirected to sign-in; `/calendar` and project pages require a session.
    - Where: `frontend/middleware.ts` (Auth.js middleware) and/or server-component session checks in `app/calendar/page.tsx`.
    - How: Add a sign-in page/entry (`app/(auth)/signin` or use Auth.js default) with a "Sign in with Google" button; redirect `/` → sign-in when logged out, else `/calendar`.

13. **Extend the existing project context with role + user scoping**
    - What: Project selection/switching **already exists** (`ProjectContextProvider`, `lib/projectContext.ts` with a `localStorage` active project, projects page, sidebar). Build on it — don't rebuild it. Add the caller's `role` per project and ensure the project list is now user-scoped (it already calls `GET /api/projects`, which becomes membership-scoped server-side).
    - Where: `frontend/lib/types.ts` (add `Role`, `Membership`; extend the existing `Project`/`ProjectResponse` type with `role`); `frontend/lib/projectContext.ts` / `components/ProjectContextProvider.tsx` (carry `role` alongside the active project); `frontend/lib/api.ts` (keep event/category calls flat with `?projectId=` to match the backend); `frontend/hooks/useCalendarEvents.ts` (already takes `projectId` — verify).
    - How: Continue persisting the active project in `localStorage`. Because a personal default project is auto-created at registration (step 6), a signed-in user **always has at least one project** — after login, select the most-recently-accessed project as active. The empty-state "create or join a project" screen only appears in the edge case where a user has left/lost all memberships. Event/category `lib/api.ts` calls stay flat (`/api/events?projectId=...`), matching the existing backend contract. Expose `role` from context so step 14 can gate UI.

14. **Role-aware UI**
    - What: Hide/disable create/edit/delete for Viewers; show "Manage members" only to Owners; gate project-management controls on the projects page.
    - Where: **Calendar surface** — `CalendarLayout.tsx`, `CalendarHeader.tsx`, `EventModal.tsx`, `ManageCategoriesModal.tsx`, `EventBlock.tsx`, `TimeGrid.tsx`/`DayView.tsx`/`WeekView.tsx`/`MonthView.tsx` slot-click handlers. **Projects page** — `app/projects/page.tsx`, `components/projects/ProjectCard.tsx` (the ✏️ `EditButton`), `EditProjectModal.tsx` (its delete action), and `StatusDropdown.tsx`.
    - How: Derive `role` for the relevant project from the membership-scoped `GET /api/projects` (each `Project` now carries `role`). **Calendar (active project):** gate slot-click/event create/edit/delete and category-management controls on `role === 'EDITOR' || 'OWNER'`; Viewers see a read-only calendar. **Projects page (per-card role):** only show the edit (✏️) button, the delete action, and status changes when that project's `role === 'OWNER'` (project rename/delete/status are owner-only, matching step 9's `PUT`/`DELETE /api/projects/{id}` = OWNER). `CreateProjectCard` (create a brand-new project) stays available to any signed-in user. Treat all UI gating as UX only — the backend is authoritative.

15. **Member management UI (Owner)**
    - What: A modal/page to list members, invite by email with a role, change roles, and remove members.
    - Where: New `frontend/components/project/ManageMembersModal.tsx` (+ trigger in header) and `frontend/app/api/projects/[id]/members/**` proxy routes; `lib/api.ts` member functions.
    - How: Reuse the existing Radix dialog pattern (`@radix-ui/react-dialog`) already used by `ManageCategoriesModal`/`EventModal`. Prevent removing/demoting the last Owner (mirror backend guard).

#### D. Infra & Config

16. **Google OAuth client (GCP)**
    - What: Create an OAuth 2.0 Client ID (Web application) in the Google Cloud Console / OAuth consent screen.
    - How: Configure **Authorized JavaScript origins** (frontend URLs: `http://localhost:3000`, prod Vercel URL) and **Authorized redirect URIs** (`http://localhost:3000/api/auth/callback/google` and the prod equivalent). Note the OAuth consent screen scopes (`openid email profile`). Record `client_id` (public, also used as backend audience) and `client_secret` (frontend only).

17. **Secrets management**
    - What: Store `AUTH_GOOGLE_SECRET` and `AUTH_SECRET` for the frontend; expose `GOOGLE_CLIENT_ID` to the backend as the JWT audience.
    - Where: Local `.env.local` (frontend) + backend env in `docker-compose.yml`; production in Vercel env vars (frontend) and GCP Secret Manager / Cloud Run env (backend).
    - How:
      - **Backend (Terraform):** add `GOOGLE_CLIENT_ID` as a plain env var on the Cloud Run service (it's public/non-secret) via a new `google_client_id` variable in `terraform/variables.tf` and an `env` block in `terraform/cloud_run.tf`. No new secret needed backend-side (audience is not secret; JWKS is public).
      - **Frontend (Vercel):** `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `AUTH_URL` as Vercel env vars (not Terraform-managed).
      - **Local:** add `GOOGLE_CLIENT_ID` to backend service env in `docker-compose.yml`; document frontend `.env.local` keys in `frontend/README.md`.

18. **CORS — no change (explicitly out of scope)**
    - What: This feature does **not** modify CORS. There are no CORS errors today, so the existing `CorsConfiguration`, the `@CrossOrigin` annotation on `ProjectController`, and the `terraform` `cors_allowed_origins` value are all left **as-is**.
    - Only CORS-adjacent action: ensure the new Spring Security filter chain permits `OPTIONS` preflight and calls `http.cors(Customizer.withDefaults())` (step 5) so it does not regress current behavior. Revisit CORS only if enabling auth surfaces a real preflight failure.

19. **Cloud Run invoker consideration (Open Question)**
    - What: Backend currently allows `allUsers`. With JWT auth enforced in-app, public invoker is acceptable (every request needs a valid Google JWT), but consider whether to keep it. Flagged in Open Questions.

#### E. Tests

20. **Backend tests**
    - What: Security + authorization tests.
    - Where: `backend/src/test/java/com/planner/...`.
    - How: `@SpringBootTest` / `@WebMvcTest` with mocked JWT (`spring-security-test` `jwt()` post-processor). Cover: unauthenticated → 401; Viewer mutating → 403; Editor mutating → 200/201; **non-member accessing a resource by id → 404 (not 403, no existence leak)**; **event update attempting to change `projectId` → 400 (reassignment forbidden)**; **event referencing a category from another project → 400**; **Editor/Viewer attempting `PUT`/`DELETE /api/projects/{id}` → 403 (project edit/delete is OWNER-only)**; Owner-only member ops; **last-owner demote/remove guard**; JIT provisioning (including the concurrent duplicate-`google_sub` race → no 500); **new user registration auto-creates a personal default project with an `OWNER` membership (and only on first insert, not on re-login)**; pending-invite activation (case-insensitive email); first-user General-project OWNER adoption.

21. **Frontend checks**
    - What: Manual/e2e verification of sign-in, token propagation, route protection, role-gated UI, project switching. Add lint pass (`npm run lint`).

---

### Dependencies & Prerequisites

- **Backend:** `spring-boot-starter-security`, `spring-boot-starter-oauth2-resource-server`, `spring-security-test` (test scope). Java 21 / Spring Boot 3.5.0 already support these.
- **Frontend:** `next-auth` (Auth.js v5) compatible with Next.js 16 / React 19 — **verify compatibility and App-Router API against local Next docs before coding.**
- **External:** A Google Cloud OAuth 2.0 Web Client (consent screen configured) must exist before end-to-end testing.
- **Ordering:** `feat/manage-projects` is **already merged** (owns `V4` + the projects/event scaffolding this plan extends). Sequence: migrations (A: `V5`/`V6`) and security wiring (B5–B7) before scoping APIs (B8/B9); backend authorization before frontend role-gating (C13/C14); OAuth client (D16) before any live sign-in test.

### Out of Scope

- Non-Google identity providers (email/password, GitHub, etc.).
- Backend-minted custom JWTs / opaque server-side session store / instant server-side session revocation (v1 relies on Google ID tokens refreshed via Auth.js; revisit if instant kill-switch on active sessions is required).
- Email delivery for invitations (invites are in-app/pending-membership only; no outbound email).
- Fine-grained/custom permissions beyond the three fixed roles; per-resource ACLs.
- Audit logging, rate limiting, and org/team hierarchies above Project.
- Sharing a project publicly / anonymous read links.
- Data-residency, GDPR export/delete flows.

### Open Questions

1. **Token lifetime — RESOLVED:** Use a **refresh-token-backed Auth.js session**. Google ID tokens expire in ~1h; the Auth.js `jwt` callback silently exchanges the stored `refresh_token` for a fresh `id_token`, so the proxy always forwards a valid token and the login session persists (cookie `maxAge` ~30 days). Session lives in Auth.js's encrypted HTTP-only cookie; backend stays stateless. (Follow-up if needed later: instant server-side session revocation would require backend-minted sessions — deferred.)
2. **Bootstrap ownership of the seeded "General" project — RESOLVED:** **Keep the legacy "General" project** (it holds pre-existing events/categories). The **first** registered user adopts it as `OWNER` via an **idempotent one-time bootstrap** in `CurrentUserService` (if "General" has no `OWNER` membership, create one for this user; safe under the JIT race via the `(project_id, user_id)` unique constraint + catch/skip). This is independent of that user's own auto-created default project (see #4).
3. **Route shape — RESOLVED:** Use **flat routes with a `projectId` query/body param**, matching the already-shipped `GET /api/events?projectId=` contract from `feat/manage-projects`. (Path-nested routes rejected to avoid reworking existing controllers/proxy routes.)
4. **New-user onboarding — RESOLVED (v1):** On first registration (JIT provisioning in `CurrentUserService`), **auto-create a personal default project owned by the new user** (`OWNER`) in the same transaction, so the calendar is never empty and the user has their own space immediately. This supersedes the earlier "empty-state, no auto-create" decision. The empty-state "create or join a project" screen is retained only as a fallback for the rare case of a user with zero memberships.
5. **Cloud Run invoker — RESOLVED (v1):** Keep `allUsers` invoker. Every request is authenticated in-app by the JWT resource server, so the public invoker is acceptable and keeps the public frontend proxy simple. Platform-level restriction (e.g. IAM/ID-token between Vercel and Cloud Run) is deferred as defense-in-depth.
6. **Category uniqueness migration risk — RESOLVED:** Pre-migration category names are globally `UNIQUE` (V2), so backfilling all rows to "General" cannot create a `(project_id, name)` collision. The swap is safe with no dedup step. (If future data ever violated this, the `ADD CONSTRAINT` would fail loudly at migration time — acceptable.)
