---
status: done
feature: Project Management System
---

## Feature: Project Management System

### Requirements Summary

- Users can create and manage multiple **projects** (single-user system for MVP)
- Each project has metadata: name, description, start/end dates, color (from design system palette), and status
- **My Projects** page displays all projects as cards with summary metrics
- **Sidebar** shows 5 most recently accessed projects with expandable Planning submenu
- Events belong directly to projects (events.project_id FK); calendar view filters by active project
- Project colors use the design system: Sky Cyan (#5EC4CD), Blush Pink (#E91E8C), Soft Indigo (#6366F1), Sage Green (#10B981)
- Backend: Spring Boot with PostgreSQL; Frontend: Next.js with styled-components
- Full CRUD API for projects at `/api/projects`
- Design system: Plus Jakarta Sans + DM Sans fonts, 8px grid, 12-column layout, pastel palette

---

### Data Model

**New table: `projects`**

| Field            | Type                                      | Notes                          |
|------------------|-------------------------------------------|--------------------------------|
| `id`             | UUID                                      | PK, auto-generated             |
| `name`           | VARCHAR(255)                              | Required, non-empty            |
| `description`    | TEXT                                      | Optional                       |
| `start_date`     | DATE                                      | Required                       |
| `end_date`       | DATE                                      | Optional, must be after start  |
| `color`          | VARCHAR(50)                               | Required, enum validation      |
| `status`         | ENUM('in progress','completed','on hold','planning') | Required, default 'in progress' |
| `last_accessed_at` | TIMESTAMP                               | Nullable, for recent list      |
| `created_at`     | TIMESTAMP                                 | Auto-set on insert             |
| `updated_at`     | TIMESTAMP                                 | Auto-set on update             |

**Updated table: `events`**

- Add column `project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE`
- Existing columns stay unchanged


---

### API Design

Base URL: `/api/projects`

| Method | Endpoint                    | Description                              |
|--------|-----------------------------|------------------------------------------|
| GET    | `/projects`                 | List all projects (sorted by last accessed) |
| POST   | `/projects`                 | Create a new project                      |
| GET    | `/projects/{id}`            | Get a single project by UUID             |
| PUT    | `/projects/{id}`            | Update an existing project               |
| DELETE | `/projects/{id}`            | Delete a project (cascade to events)      |
| PATCH  | `/projects/{id}/access`     | Update last_accessed_at timestamp        |

**ProjectRequest (POST/PUT body):**
```json
{
  "name": "Japan Trip 2027",
  "description": "Family trip to Tokyo, Kyoto, and Osaka",
  "startDate": "2027-07-01",
  "endDate": "2027-07-15",
  "color": "Sky Cyan",
  "status": "in progress"
}
```

**ProjectResponse:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Japan Trip 2027",
  "description": "Family trip to Tokyo, Kyoto, and Osaka",
  "startDate": "2027-07-01",
  "endDate": "2027-07-15",
  "color": "Sky Cyan",
  "status": "in progress",
  "lastAccessedAt": "2026-06-29T10:00:00Z",
  "createdAt": "2026-06-13T10:00:00Z",
  "updatedAt": "2026-06-13T10:00:00Z"
}
```


---

### Design System Specifications

**Colors (Project Color Options):**
- Sky Cyan: `#5EC4CD` (Primary)
- Blush Pink: `#E91E8C` (Secondary)
- Soft Indigo: `#6366F1` (Tertiary)
- Sage Green: `#10B981` (Quaternary)

**Typography:**
- Headings: Plus Jakarta Sans (22px Bold for "My Projects", 18px Semi-Bold for project names)
- Body text: DM Sans (14px Regular for descriptions, 12px Regular for metadata)

**Spacing (8px grid):**
- Container padding: 24px
- Card padding: 16px
- Gap between cards: 24px
- Element spacing: 8px, 16px, 24px

**Border Radius:**
- Small (inputs, buttons): 4px
- Medium (cards): 8px
- Large (modal): 12px

**Grid Layout:**
- Desktop (≥1024px): 12-column grid
- Tablet (768px-1023px): 6-column grid
- Project cards: span 4 columns (desktop), 6 columns (tablet)

**Project Card Components:**
- Color indicator: 12px diameter colored dot in top-right corner
- Status badge: 12px Regular text with background color
- Date format: "MMM DD, YYYY - MMM DD, YYYY" or "MMM DD, YYYY - Ongoing"
- Hover effect: box-shadow 0px 4px 8px rgba(0,0,0,0.1)


---

### Implementation Steps

#### Step 1: Write Flyway migration `V4__add_projects.sql`
- **What:** Create `projects` table, add a default project, and add `project_id` FK to `events` linking existing events to the default project
- **Where:** `backend/src/main/resources/db/migration/V4__add_projects.sql`
- **How:**
  ```sql
  CREATE TABLE projects (
      id                UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      name              VARCHAR(255) NOT NULL,
      description       TEXT,
      start_date        DATE         NOT NULL,
      end_date          DATE,
      color             VARCHAR(50)  NOT NULL,
      status            VARCHAR(20)  NOT NULL DEFAULT 'in progress',
      last_accessed_at  TIMESTAMP,
      created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_end_after_start CHECK (end_date IS NULL OR end_date > start_date),
      CONSTRAINT chk_color CHECK (color IN ('Sky Cyan', 'Blush Pink', 'Soft Indigo', 'Sage Green')),
      CONSTRAINT chk_status CHECK (status IN ('in progress', 'completed', 'on hold', 'planning'))
  );

  -- Create a default project for existing events
  -- Using deterministic UUID for stable development/testing
  INSERT INTO projects (id, name, description, start_date, color, status, created_at, updated_at) 
  VALUES (
      '00000000-0000-4000-a000-000000000001',
      'General',
      'Default project for existing events',
      CURRENT_DATE,
      'Sky Cyan',
      'in progress',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
  );

  -- Add project_id column (nullable first to allow backfill)
  ALTER TABLE events
      ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE;

  -- Link all existing events to the default project
  UPDATE events 
  SET project_id = '00000000-0000-4000-a000-000000000001' 
  WHERE project_id IS NULL;

  -- Now make project_id NOT NULL
  ALTER TABLE events
      ALTER COLUMN project_id SET NOT NULL;

  CREATE INDEX idx_events_project_id ON events (project_id);
  CREATE INDEX idx_projects_last_accessed ON projects (last_accessed_at DESC NULLS LAST);
  ```


#### Step 2: Create `ProjectEntity` JPA entity
- **What:** JPA entity mapping the `projects` table
- **Where:** `backend/src/main/java/com/planner/model/entity/ProjectEntity.java`
- **How:**
  - Annotate with `@Entity`, `@Table(name = "projects")`
  - Fields: `id` (UUID, `@UuidGenerator`), `name` (VARCHAR 255, NOT NULL), `description` (TEXT, nullable), `startDate` (LocalDate, NOT NULL), `endDate` (LocalDate, nullable), `color` (String, NOT NULL), `status` (String, NOT NULL, default "in progress"), `lastAccessedAt` (Instant, nullable), `createdAt`, `updatedAt`
  - Add `@PrePersist` and `@PreUpdate` lifecycle callbacks for timestamps
  - Use `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder` from Lombok

#### Step 3: Update `EventEntity` to reference `ProjectEntity`
- **What:** Add `project_id` FK relationship
- **Where:** `backend/src/main/java/com/planner/model/entity/EventEntity.java`
- **How:**
  - Add field: `@Column(name = "project_id") @Setter private UUID projectId;`
  - **Note:** Use plain UUID field, not `@ManyToOne` — avoids lazy loading issues and keeps queries simple
  - Existing fields and relationships stay unchanged


#### Step 4: Create `ProjectRepository`
- **What:** Spring Data JPA repository for projects
- **Where:** `backend/src/main/java/com/planner/model/repository/ProjectRepository.java`
- **How:**
  - Extends `JpaRepository<ProjectEntity, UUID>`
  - Add `List<ProjectEntity> findAllByOrderByLastAccessedAtDescNullsLast()` — returns all projects sorted by most recently accessed (nulls at end)

#### Step 5: Create Project DTOs
- **What:** `ProjectRequest` (create/update body) and `ProjectResponse` (API response)
- **Where:** `backend/src/main/java/com/planner/domain/ProjectRequest.java`, `ProjectResponse.java`
- **How:**
  - `ProjectRequest`:
    - Fields: `name` (`@NotBlank`, `@Size(max=255)`), `description` (optional, `@Size(max=2000)`), `startDate` (`@NotNull`), `endDate` (optional), `color` (`@NotBlank`, `@Pattern` for enum validation), `status` (optional, defaults to "in progress")
    - Add custom `@AssertTrue` validation method: `isEndDateValid()` returns `endDate == null || endDate.isAfter(startDate)`
  - `ProjectResponse`: Java record with fields: `id`, `name`, `description`, `startDate`, `endDate`, `color`, `status`, `lastAccessedAt`, `createdAt`, `updatedAt`

#### Step 6: Create `ProjectMapper`
- **What:** Maps between `ProjectEntity` and DTOs
- **Where:** `backend/src/main/java/com/planner/mapper/ProjectMapper.java`
- **How:**
  - `toResponse(ProjectEntity entity)` → `new ProjectResponse(...)`
  - `toEntity(ProjectRequest req)` → creates new `ProjectEntity` with all fields from request
  - `mapRequestToEntity(ProjectRequest req, ProjectEntity entity)` → updates existing entity fields (except id, timestamps)


#### Step 7: Create `ProjectService`
- **What:** Business logic for project CRUD operations
- **Where:** `backend/src/main/java/com/planner/service/ProjectService.java`
- **How:**
  - Inject `ProjectRepository`, `ProjectMapper`
  - **Methods:**
    - `listAll()`: Fetch all projects sorted by last accessed, map to `ProjectResponse`
    - `findById(UUID id)`: Find project or throw `ResourceNotFoundException`, return response
    - `create(ProjectRequest req)`:
      - Validate request
      - Create and save `ProjectEntity` with status defaulting to "in progress"
      - Return `ProjectResponse`
    - `update(UUID id, ProjectRequest req)`:
      - Find project or throw 404
      - Validate request
      - Update fields via mapper
      - Save and return response
    - `delete(UUID id)`:
      - Find project or throw 404
      - Delete project (cascade deletes events automatically via FK; @Transactional ensures rollback on failure)
    - `updateAccess(UUID id)`:
      - Find project or throw 404
      - Set `lastAccessedAt` to `Instant.now()`
      - Save and return response
  - All methods annotated with `@Transactional` for data consistency

#### Step 8: Create `ProjectController`
- **What:** REST controller for `/api/projects` endpoints
- **Where:** `backend/src/main/java/com/planner/controller/ProjectController.java`
- **How:**
  - `@RestController @RequestMapping("/api/projects") @CrossOrigin(origins = "${cors.allowed-origins}")`
  - Inject `ProjectService`
  - **Endpoints:**
    - `@GetMapping` (no path) → `listAll()` → 200 with list
    - `@GetMapping("/{id}")` → `findById(id)` → 200 or 404
    - `@PostMapping` → `@RequestBody @Valid ProjectRequest` → `create()` → 201 Created with response body and Location header
    - `@PutMapping("/{id}")` → `@RequestBody @Valid ProjectRequest` → `update()` → 200 or 404
    - `@DeleteMapping("/{id}")` → `delete()` → 204 No Content or 404
    - `@PatchMapping("/{id}/access")` → `updateAccess()` → 200 or 404
  - Update `GlobalExceptionHandler` to handle validation errors and return consistent error format


#### Step 9: Add Route Handlers for projects in Next.js
- **What:** Server-side proxy for `/api/projects` and `/api/projects/[id]`
- **Where:** `frontend/app/api/projects/route.ts`, `frontend/app/api/projects/[id]/route.ts`, `frontend/app/api/projects/[id]/access/route.ts`
- **How:**
  - Same pattern as existing `app/api/events/` and `app/api/categories/` route handlers
  - `route.ts`: `GET` (list all), `POST` (create) → forward to `process.env.API_URL/api/projects`
  - `[id]/route.ts`: `GET` (single), `PUT` (update), `DELETE` (delete) → forward to `process.env.API_URL/api/projects/{id}`
  - `[id]/access/route.ts`: `PATCH` (update last accessed) → forward to `process.env.API_URL/api/projects/{id}/access`
  - All handlers read `API_URL` from server-side environment (defaults to `http://localhost:8080`)
  - **Error handling:** Wrap fetch calls in try-catch, return NextResponse with appropriate status codes (400, 404, 500)

#### Step 10: Add Project types and API client functions
- **What:** TypeScript types for `Project` and API calls
- **Where:** `frontend/lib/types.ts`, `frontend/lib/api.ts`
- **How:**
  - Add to `types.ts`:
    ```ts
    export interface Project {
      id: string;
      name: string;
      description?: string;
      startDate: string; // ISO date string
      endDate?: string;
      color: 'Sky Cyan' | 'Blush Pink' | 'Soft Indigo' | 'Sage Green';
      status: 'in progress' | 'completed' | 'on hold' | 'planning';
      lastAccessedAt?: string;
      createdAt: string;
      updatedAt: string;
    }

    export interface ProjectRequest {
      name: string;
      description?: string;
      startDate: string;
      endDate?: string;
      color: string;
      status?: string;
    }
    ```
  - Add to `api.ts`:
    ```ts
    export async function getProjects(): Promise<Project[]>
    export async function getProject(id: string): Promise<Project>
    export async function createProject(data: ProjectRequest): Promise<Project>
    export async function updateProject(id: string, data: ProjectRequest): Promise<Project>
    export async function deleteProject(id: string): Promise<void>
    export async function updateProjectAccess(id: string): Promise<Project>
    ```


#### Step 11: Create `PROJECT_COLORS` constant
- **What:** Define the 4 project color options from design system
- **Where:** `frontend/lib/constants.ts`
- **How:**
  - Add constant:
    ```ts
    export const PROJECT_COLORS = [
      { name: 'Sky Cyan', hex: '#5EC4CD' },
      { name: 'Blush Pink', hex: '#E91E8C' },
      { name: 'Soft Indigo', hex: '#6366F1' },
      { name: 'Sage Green', hex: '#10B981' },
    ] as const;
    ```

#### Step 12: Build the `ProjectCard` component
- **What:** Reusable card component displaying project summary
- **Where:** `frontend/components/projects/ProjectCard.tsx`
- **How:**
  - File must begin with `'use client'`
  - **Props:** `project: Project`, `onClick: () => void`
  - **Layout:**
    - Container: 8px border radius, white background, 16px padding
    - Top-right: 12px colored dot using project.color
    - Title: project.name (18px Semi-Bold, Plus Jakarta Sans)
    - Date range: formatted as "MMM DD, YYYY - MMM DD, YYYY" or "MMM DD, YYYY - Ongoing" (12px Regular, DM Sans) using `date-fns` format() with pattern "MMM dd, yyyy"
    - Description: project.description truncated to 2 lines with ellipsis (14px Regular, DM Sans)
    - Status badge: small rounded badge with status text (12px Regular) with color mapping: "in progress" → #6366F1 (Soft Indigo), "completed" → #10B981 (Sage Green), "on hold" → #94A3B8 (Mist), "planning" → #C4B5FD (Buntle)
  - **Hover Effect:** Apply box-shadow: `0px 4px 8px rgba(0,0,0,0.1)`
  - **Styled Components:**
    - Use styled-components with design system values
    - Color dot uses hex value from PROJECT_COLORS lookup
    - Status badge background color varies by status (use semantic colors from design system)
  - **Click Handler:** Calls `onClick` when card is clicked (entire card is clickable)


#### Step 13: Build the `CreateProjectModal` component
- **What:** Modal dialog for creating new projects
- **Where:** `frontend/components/projects/CreateProjectModal.tsx`
- **How:**
  - File must begin with `'use client'`
  - Use `@radix-ui/react-dialog` for accessible modal
  - **Props Interface:**
    ```tsx
    interface CreateProjectModalProps {
      open: boolean;
      onClose: () => void;
      onCreateProject: (data: ProjectRequest) => Promise<void>;
    }
    ```
  - **Form Fields:**
    - Project name: text input (required, max 255 chars, character counter "X/255")
    - Description: textarea (optional, max 2000 chars, character counter "X/2000")
    - Start date: date picker (required)
    - End date: date picker (optional)
    - Project color: 4 color swatches (20px circles showing PROJECT_COLORS, one must be selected)
  - **Validation:**
    - Name: required, trim whitespace, 1-255 characters
    - Description: max 2000 characters
    - End date: if provided, must be after start date (show error message below field)
    - Color: required (one swatch must be selected)
  - **Visual Indicators:**
    - Required fields marked with asterisk (*)
    - Disable "Create project" button while any required field is invalid
    - Show inline error messages below fields on blur or submit attempt
  - **Actions:**
    - "Cancel" button: closes modal without creating
    - "+ Create project" button: submits form, calls `onCreateProject`, closes modal on success
  - **Styling:**
    - Modal container: 12px border radius, max-width 600px
    - 8px grid spacing throughout
    - Plus Jakarta Sans for labels, DM Sans for inputs
    - Primary button color: Sky Cyan (#5EC4CD)


#### Step 14: Build the `MyProjectsPage` component
- **What:** Main dashboard page displaying all projects with summary metrics
- **Where:** `frontend/app/projects/page.tsx`
- **How:**
  - File must begin with `'use client'`
  - **State Management:**
    - `projects: Project[]` — fetched from `getProjects()` on mount
    - `isLoading: boolean` — loading state during fetch
    - `error: string | null` — error message if fetch fails
    - `showCreateModal: boolean` — controls create modal visibility
  - **Layout Structure:**
    - Page container: 24px padding, centered, max-width 1400px
    - **Header Section:**
      - Title: "My projects" (22px Bold, Plus Jakarta Sans)
      - "Create new project" button (top-right, uses Sky Cyan primary color)
    - **Summary Metrics Section:**
      - Horizontal row at top showing:
        - Total projects count (large number + "Total projects" label)
        - Projects by status: count + status name for each status (in progress, completed, on hold, planning)
      - Each metric in a small card with 8px border radius
    - **Projects Grid:**
      - 12-column grid on desktop (≥1024px), 6-column grid on tablet (768-1023px)
      - Each ProjectCard spans 4 columns (desktop) or 6 columns (tablet)
      - 24px gap between cards
      - Sorted by lastAccessedAt descending (most recent first)
    - **Empty State:** If no projects exist, show centered message: "No projects yet. Create your first project to get started." with a "+ Create project" button that opens the CreateProjectModal
    - **Error State:** If fetch fails, show error banner with "Retry" button
    - **Loading State:** Show centered spinner while fetching
  - **Interactions:**
    - Click "Create new project" → opens CreateProjectModal
    - Click project card → calls `updateProjectAccess(id)`, then navigates to `/calendar?projectId={id}` (sets active project)
  - **Styling:**
    - Use styled-components
    - Follow 8px grid system throughout
    - Summary metrics use background color #f8fafc (Snow from design system)


#### Step 15: Update sidebar to show recent projects with Planning submenu
- **What:** Add "My Projects" section to sidebar showing 5 most recent projects
- **Where:** Create `frontend/components/layout/Sidebar.tsx` if it doesn't exist, or update existing sidebar/navigation component
- **How:**
  - **Locate or Create Sidebar:**
    - Check for existing sidebar component (search for navigation/layout components)
    - If none exists, create new `Sidebar.tsx` component and integrate into main layout
  - **Add State:**
    - `recentProjects: Project[]` — fetch top 5 from `getProjects()` on mount (already sorted by last accessed)
    - `activeProjectId: string | null` — currently selected project (read from URL params or localStorage)
  - **Sidebar Structure:**
    - **"My Projects" Menu Item** (always visible)
      - Shows list of 5 most recent projects below it
      - Each project row: colored dot (8px) + name (truncated to 30 chars with ellipsis)
      - Selected project has background highlight (#f0f9ff)
    - **"Planning" Submenu Item** (only visible when a project is selected)
      - Indented under the selected project
      - Clicking navigates to `/calendar?projectId={activeProjectId}`
  - **Interactions:**
    - Click project → sets as active, shows Planning submenu, calls `updateProjectAccess(id)` (debounced to prevent double-calls), updates URL
    - Click Planning → navigates to calendar view filtered by that project
    - Click "My Projects" header → navigates to `/projects` page
  - **Styling:**
    - Colored dot: 8px diameter, matches project color from PROJECT_COLORS
    - Active project: background color #f0f9ff (light blue highlight)
    - Font: 14px Regular DM Sans
    - Spacing: 8px padding per item, 4px gap between items

#### Step 16: Update `CalendarLayout` to filter events by active project
- **What:** Scope calendar events to the active project
- **Where:** `frontend/components/calendar/CalendarLayout.tsx`
- **How:**
  - **Add Active Project Context:**
    - Read `projectId` from URL query params (`useSearchParams()`)
    - Store `activeProjectId` in state
  - **Update useCalendarEvents Hook:**
    - Pass `projectId` as filter parameter
    - Modify `getEvents()` API call to include `?projectId={activeProjectId}` query param
  - **No Active Project Redirect:**
    - If no `projectId` in URL, redirect to `/projects` (My Projects page)

#### Step 17: Update `EventService` and `EventController` to scope by project
- **What:** Add project ID filtering to event queries and require project ID for create/update
- **Where:** `backend/src/main/java/com/planner/service/EventService.java`, `backend/src/main/java/com/planner/controller/EventController.java`, `backend/src/main/java/com/planner/model/repository/EventRepository.java`
- **How:**
  - **EventRepository Update:**
    - Add method: `List<EventEntity> findByProjectIdAndStartTimeLessThanAndEndTimeGreaterThan(UUID projectId, Instant to, Instant from)`
  - **EventController Update:**
    - `GET /events`: Add optional `@RequestParam UUID projectId`
    - If `projectId` provided, filter events by project; otherwise return all events (backward compatibility)
  - **EventService Update:**
    - `findEvents(from, to, projectId)`: Use project-scoped query if projectId is not null; otherwise use existing unscoped query
    - `create(request, projectId)`: **Require projectId parameter** (not optional), validate project exists, set on entity before save
    - `update(id, request)`: Validate that event's project_id is not null (data integrity check)
  - **Validation:**
    - When creating event: verify projectId exists in database (query ProjectRepository), throw 404 if not found
    - Return 400 if projectId is null on create

#### Step 18: Update `EventModal` to pass project context
- **What:** Modify event creation/editing to include active project ID
- **Where:** `frontend/components/calendar/EventModal.tsx` and `CalendarLayout.tsx`
- **How:**
  - **EventModal Props:** Add `activeProjectId: string` prop
  - **On Create:** Pass `projectId` to `createEvent(data, activeProjectId)`
  - **API Client Update:** Modify `createEvent()` in `api.ts` to accept projectId and include in request body as a field in EventRequest
  - **Backend Update:** Add `projectId` field to EventRequest DTO (not validated with @NotNull since it's passed separately)
  - **Error Handling:** If create fails with "project not found", show user-friendly message
  - **On Edit:** Display project name as read-only field (events cannot be moved between projects in MVP)

#### Step 19: Update root page to redirect to My Projects
- **What:** Make `/projects` the new home page
- **Where:** `frontend/app/page.tsx`
- **How:**
  - Replace existing content with redirect to `/projects`
  - Use Next.js `redirect()` from `next/navigation`:
    ```tsx
    import { redirect } from 'next/navigation';
    export default function Home() {
      redirect('/projects');
    }
    ```


#### Step 20: Add localStorage persistence for active project
- **What:** Persist active project context across page refreshes
- **Where:** `frontend/lib/projectContext.ts` (new utility file) and sidebar/layout components
- **How:**
  - Create utility functions:
    ```ts
    export function getActiveProject(): string | null {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem('activeProjectId');
    }

    export function setActiveProject(projectId: string): void {
      if (typeof window === 'undefined') return;
      localStorage.setItem('activeProjectId', projectId);
    }

    export function clearActiveProject(): void {
      if (typeof window === 'undefined') return;
      localStorage.removeItem('activeProjectId');
    }
    ```
  - **In Sidebar:** When user clicks a project, call `setActiveProject(id)`
  - **In CalendarLayout:** On mount, if no `projectId` in URL but localStorage has active project, redirect to that project's calendar
  - **In MyProjectsPage:** When user clicks a project card, call `setActiveProject()` before navigating

---

### Dependencies & Prerequisites

**Execution Order:**
- Steps 1-4 (database and entities) must complete before Steps 5-8 (repositories, DTOs, services, controllers)
- Step 9 (Route Handlers) must exist before Step 10 (API client) is implemented
- Step 10 (API client) must exist before Steps 12-14 (React components) are built
- Step 11 (constants) must exist before Steps 12-13 (components that use PROJECT_COLORS)
- Steps 12-14 (UI components) must exist before Step 15 (sidebar integration)
- Steps 16-17 (event filtering) must complete before Step 18 (EventModal update)
- Step 19 (routing) and Step 20 (persistence) can be done in parallel at the end

**Recommended Order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20


---

### Acceptance Criteria

✅ **Requirement 1 (Project Creation):**
- User can open create project modal from My Projects page
- Form validates name (required, max 255), description (max 2000), dates (end > start), color (one of 4 options)
- Validation errors display inline below fields
- On submit, project is created
- New project appears in My Projects list immediately
- Success confirmation displayed to user

✅ **Requirement 2 (Project Listing and Display):**
- My Projects page displays as default landing page (redirects from `/`)
- All projects shown as cards with name, dates, description, status, color dot
- Summary metrics show total count and breakdown by status
- Date format: "MMM DD, YYYY - MMM DD, YYYY" or "MMM DD, YYYY - Ongoing"
- Projects sorted by lastAccessedAt descending
- Empty state message when no projects exist
- Error state with retry button if fetch fails
- Click project card → updates last accessed → navigates to calendar

✅ **Requirement 3 (Sidebar Navigation):**
- "My Projects" menu item visible in sidebar
- Shows 5 most recently accessed projects
- Each project row: 8px colored dot + name (truncated at 30 chars)
- Selected project highlighted with background color
- "Planning" submenu appears indented under selected project
- Click project → sets active context → updates lastAccessedAt
- Click Planning → navigates to calendar filtered by that project
- If <5 projects exist, all are displayed


✅ **Requirement 4 (Project-to-Planning Relationship):**
- Each project links directly to its events (events.project_id FK)
- Events can only be created when active project context is set
- Events belong to exactly one project (project_id FK)
- Calendar view displays only events from active project
- Deleting project cascades to all its events
- Attempting to create event without project context returns error

✅ **Requirement 9 (Database Schema):**
- `projects` table exists with all specified columns and constraints
- `events` table has project_id FK (NOT NULL)
- FK constraint: events.project_id → projects.id (CASCADE)
- Indexes on: events.project_id, projects.last_accessed_at
- CHECK constraints validate: end_date > start_date, color enum, status enum

✅ **Requirement 10 (API Endpoints):**
- GET /api/projects returns all projects sorted by last accessed
- GET /api/projects/{id} returns single project
- POST /api/projects creates project, returns 201 with Location header
- PUT /api/projects/{id} updates project, returns 200
- DELETE /api/projects/{id} deletes project + cascades to events, returns 204
- PATCH /api/projects/{id}/access updates last_accessed_at, returns 200
- All endpoints return 404 for invalid IDs
- POST/PUT return 400 for validation errors with field details
- Response format matches ProjectResponse schema


✅ **Requirement 11 (Frontend Project Dashboard):**
- Plus Jakarta Sans font used for project names (18px Semi-Bold) and page title (22px Bold)
- DM Sans font used for body text (descriptions 14px, dates/status 12px)
- 12-column grid layout on desktop (≥1024px)
- 6-column grid layout on tablet (768-1023px)
- Project cards span 4 columns (desktop) or 6 columns (tablet)
- All spacing uses 8px multiples (8px, 16px, 24px)
- Project cards have 8px border radius
- 12px colored dot in top-right of each card matches project color
- Summary metrics in horizontal row at top of page
- "Create new project" button uses Sky Cyan (#5EC4CD) background
- Hover on project card adds box-shadow: 0px 4px 8px rgba(0,0,0,0.1)
- Empty state centered message when no projects
- Page responsive across desktop and tablet breakpoints

✅ **Requirement 12 (Project Creation Modal UI):**
- Modal opens when "Create new project" button clicked
- Name input with character counter "X/255"
- Description textarea with character counter "X/2000"
- Date pickers for start and end dates
- Color selector shows 4 swatches (Sky Cyan, Blush Pink, Soft Indigo, Sage Green)
- Required fields marked with asterisk: name, start date, color
- Name and description fields prevent input beyond max length
- Field validation on blur and submit
- Inline error message below field when invalid
- End date validation: must be after start date (shows error if not)
- "Create project" button disabled while required fields empty/invalid
- "Cancel" button closes modal without creating
- On success: modal closes, project list refreshes
- On failure: error message displayed, modal stays open with input preserved
- Modal container uses 12px border radius
- Follows pastel color palette throughout


---

### Out of Scope

- **Requirements 5-8, 13:** Project metadata management (edit/update UI), project deletion UI, project color editing, project status updates, active project context management — these are part of the full requirements but NOT implemented in this initial plan (MVP focuses on create, list, view, and basic navigation)
- User authentication / multi-user support (single-user system for MVP)
- Project templates or duplication
- Project archiving (soft delete)
- Project search or advanced filtering
- Project tags or custom fields
- Bulk project operations
- Project export/import
- Activity history or audit logs
- Project sharing or collaboration features
- Mobile-specific responsive optimizations (focus on desktop + tablet)
- Automated tests (unit, integration, e2e)

---

### Design Decisions

**Q: Should we use bidirectional JPA relationships between Project and Event entities?**  
**A:** No, use simple UUID foreign key field (`projectId`) on EventEntity instead of `@ManyToOne` to avoid lazy loading complexity and N+1 query issues. Simpler to manage and test.

**Q: Should project deletion happen in a modal or be a simple API call?**  
**A:** Not implemented in MVP (Requirements 5-8 are out of scope). When added, should use confirmation dialog similar to event deletion.

**Q: What happens to existing events when adding project_id constraint?**  
**A:** The migration creates a default "General" project (UUID: `00000000-0000-4000-a000-000000000001`) and automatically links all existing events to it. This preserves all existing data while enabling the new project structure. Users can later move events to specific projects or delete the default project if unused.pler to manage and test.

**Q: Should the project color selector allow custom hex colors or only predefined options?**  
**A:** Only the 4 predefined colors from the design system (Sky Cyan, Blush Pink, Soft Indigo, Sage Green) to maintain visual consistency.

**Q: Should the sidebar always show 5 projects even if the user has fewer?**  
**A:** No, display all existing projects if count < 5. Empty slots would look broken.

**Q: What happens if a user tries to access `/calendar` without a project context?**  
**A:** Redirect to `/projects` (My Projects page) with a message prompting them to select a project first.

**Q: Should project creation happen in a modal or a dedicated page?**  
**A:** Modal (like EventModal and ManageCategoriesModal patterns) to keep context visible and reduce navigation friction.

