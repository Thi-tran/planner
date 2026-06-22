---
status: done
feature: Event Categories
---

## Feature: Event Categories

### Requirements Summary

- Users can create custom **event categories** with a name and a hex color
- A default set of categories is seeded on first run (Travel, Meeting, Shopping, Work, Family, Other)
- When creating or editing an event, users can select a category from a dropdown/picker
- The selected category's color drives the event color everywhere it appears (calendar grid, month chips, list view)
- Categories are managed via a dedicated CRUD API (`/api/categories`) — create, list, update (name/color); delete is out of scope for MVP
- The `events` table gains a `category_id` FK; the existing `color` column on `events` is kept as an override slot (nullable — category color is used when `color` is null)
- Category color is resolved at query time: if the event has its own `color`, use that; otherwise use the category's color
- The `CalendarEvent` type on the frontend gains an optional `categoryId` field and a `resolvedColor` field
- The `EventModal` replaces the free-form color swatch picker with a **Category selector** (shows category name + color dot); a separate "Custom color" option keeps the existing swatch picker for override use
- The `CategoryPicker` supports inline creation of new categories and editing (name/color) of existing ones; category deletion is **out of scope** for this version

---

### Data Model Changes

**New table: `categories`**

| Field   | Type         | Notes                        |
|---------|--------------|------------------------------|
| `id`    | UUID         | PK, auto-generated           |
| `name`  | VARCHAR(100) | Required, unique             |
| `color` | VARCHAR(7)   | Required hex color (#rrggbb) |

**Updated table: `events`**

- Add column `category_id UUID REFERENCES categories(id) ON DELETE SET NULL`
- Existing `color VARCHAR(7)` column stays as an optional per-event override
- Resolved color for display = `COALESCE(events.color, categories.color, '#3b82f6')`

**Migration file:** `V2__add_categories.sql`

---

### New API Endpoints

Base URL: `/api/categories`

| Method | Endpoint           | Description                          |
|--------|--------------------|--------------------------------------|
| GET    | `/categories`      | List all categories (sorted by name) |
| POST   | `/categories`      | Create a category                    |
| PUT    | `/categories/{id}` | Update a category (name/color)       |

> **Note:** DELETE endpoint is out of scope for this version.

**CategoryRequest (POST/PUT body):**
```json
{ "name": "Travel", "color": "#3b82f6" }
```

**CategoryResponse:**
```json
{ "id": "...", "name": "Travel", "color": "#3b82f6" }
```

**Updated EventResponse** — add two fields:
```json
{
  ...,
  "categoryId": "uuid-or-null",
  "resolvedColor": "#3b82f6"   // COALESCE(event.color, category.color, default)
}
```

**Updated EventRequest** — add one field:
```json
{ ..., "categoryId": "uuid-or-null" }
```

---

### Implementation Steps

#### Step 1: Write Flyway migration `V2__add_categories.sql`
- **What:** Add the `categories` table, FK on `events`, and seed default categories with deterministic UUIDs
- **Where:** `backend/src/main/resources/db/migration/V2__add_categories.sql`
- **How:**
  ```sql
  CREATE TABLE categories (
      id    UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      name  VARCHAR(100) NOT NULL UNIQUE,
      color VARCHAR(7)   NOT NULL
  );

  ALTER TABLE events
      ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

  CREATE INDEX idx_events_category_id ON events (category_id);

  -- Seed default categories (deterministic UUIDs for stable local dev)
  INSERT INTO categories (id, name, color) VALUES
      ('00000000-0000-4000-a000-000000000001', 'Travel',   '#3b82f6'),
      ('00000000-0000-4000-a000-000000000002', 'Meeting',  '#8b5cf6'),
      ('00000000-0000-4000-a000-000000000003', 'Shopping', '#f59e0b'),
      ('00000000-0000-4000-a000-000000000004', 'Work',     '#ef4444'),
      ('00000000-0000-4000-a000-000000000005', 'Family',   '#10b981'),
      ('00000000-0000-4000-a000-000000000006', 'Other',    '#94a3b8');
  ```
  - **Note:** Deterministic UUID literals ensure that DB drop-and-recreate in local dev produces stable IDs and doesn't orphan event references across runs.

#### Step 2: Create `CategoryEntity` JPA entity
- **What:** JPA entity mapping the `categories` table
- **Where:** `backend/src/main/java/com/planner/model/entity/CategoryEntity.java`
- **How:**
  - Annotate with `@Entity`, `@Table(name = "categories")`
  - Fields: `id` (UUID, `@UuidGenerator`), `name` (VARCHAR 100, `@Column(nullable=false, unique=true)`), `color` (VARCHAR 7, `@Column(nullable=false)`)
  - No timestamp fields — categories are simple reference data
  - Add `@Setter` on `name` and `color` for updates
  - Use `@Getter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder` (same pattern as `EventEntity`)
  - **Do NOT add `@OneToMany` back-reference** — it's unused and would create Hibernate/FK conflict on cascade operations

#### Step 3: Update `EventEntity` to reference `CategoryEntity`
- **What:** Add a `@ManyToOne` relationship on `EventEntity`
- **Where:** `backend/src/main/java/com/planner/model/entity/EventEntity.java`
- **How:**
  - Add field: `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "category_id") @Setter private CategoryEntity category;`
  - Add a computed helper:
    ```java
    public String resolvedColor() {
        if (this.color != null) return this.color;
        if (this.category != null) return this.category.getColor();
        return "#3b82f6";
    }
    ```

#### Step 4: Create `CategoryRepository`
- **What:** Spring Data JPA repository for categories
- **Where:** `backend/src/main/java/com/planner/model/CategoryRepository.java`
- **How:**
  - `public interface CategoryRepository extends JpaRepository<CategoryEntity, UUID>`
  - Add `boolean existsByNameIgnoreCase(String name)` for create-time uniqueness check
  - Add `boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id)` for update-time uniqueness check (excludes the current entity)
  - Add `List<CategoryEntity> findAllByOrderByNameAsc()` for sorted listing

#### Step 5: Update `EventRepository` — add eager fetch for category
- **What:** Prevent N+1 queries when listing events by eagerly loading the `category` association
- **Where:** `backend/src/main/java/com/planner/model/EventRepository.java`
- **How:**
  - Add `@EntityGraph(attributePaths = {"category"})` annotation on the existing `findByStartTimeLessThanAndEndTimeGreaterThan` method
  - Also override `Optional<EventEntity> findById(UUID id)` with `@EntityGraph(attributePaths = {"category"})` so single-event GETs also load the category in one query

#### Step 6: Create Category DTOs
- **What:** `CategoryRequest` (create/update body) and `CategoryResponse` (API response)
- **Where:** `backend/src/main/java/com/planner/domain/`
- **How:**
  - `CategoryRequest`: fields `name` (`@NotBlank`), `color` (`@NotBlank` + `@Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "color must be a valid hex color")`)
  - `CategoryResponse`: Java record with `UUID id`, `String name`, `String color` (no timestamps)
  - Update `EventResponse` record: add `UUID categoryId` and `String resolvedColor` fields at the end

#### Step 7: Update `EventRequest` DTO
- **What:** Add optional `categoryId` to `EventRequest`
- **Where:** `backend/src/main/java/com/planner/domain/EventRequest.java`
- **How:**
  - Add `private UUID categoryId;` — no `@NotNull`, it is optional
  - Keep existing validation annotations unchanged

#### Step 8: Create `CategoryMapper`
- **What:** Maps between `CategoryEntity` and `CategoryResponse`
- **Where:** `backend/src/main/java/com/planner/mapper/CategoryMapper.java`
- **How:**
  - `toResponse(CategoryEntity e)` → `new CategoryResponse(e.getId(), e.getName(), e.getColor())`

#### Step 9: Update `EventMapper`
- **What:** `toResponse` must now populate `categoryId` and `resolvedColor`
- **Where:** `backend/src/main/java/com/planner/mapper/EventMapper.java`
- **How:**
  - Update `toResponse(EventEntity entity)` to pass two additional fields:
    - `categoryId`: `entity.getCategory() != null ? entity.getCategory().getId() : null`
    - `resolvedColor`: `entity.resolvedColor()`
  - **Important:** `mapRequestToEntity` does NOT touch category — category assignment is the responsibility of `EventService` (see Step 11)

#### Step 10: Create `CategoryService`
- **What:** Business logic for CRUD on categories
- **Where:** `backend/src/main/java/com/planner/service/CategoryService.java`
- **How:**
  - `listAll()` → `categoryRepository.findAllByOrderByNameAsc()` → map to `CategoryResponse`
  - `create(CategoryRequest req)`:
    - Check `existsByNameIgnoreCase(req.getName())` → throw `IllegalArgumentException("Category name already exists")` if true (→ 409 in global handler)
    - Build and save entity; return `CategoryResponse`
  - `update(UUID id, CategoryRequest req)`:
    - Find entity or throw `ResourceNotFoundException`
    - Check `existsByNameIgnoreCaseAndIdNot(req.getName(), id)` → throw 409 if a *different* category already has that name
    - Set `name` and `color`, save, return `CategoryResponse`

#### Step 11: Update `EventService` to handle `categoryId`
- **What:** When creating/updating an event, resolve and attach the `CategoryEntity`
- **Where:** `backend/src/main/java/com/planner/service/EventService.java`
- **How:**
  - Inject `CategoryRepository`
  - In the `create` method: after `mapper.toEntity(req)` and before `repository.save(event)`, resolve category:
    ```java
    if (req.getCategoryId() != null) {
        CategoryEntity cat = categoryRepository.findById(req.getCategoryId())
            .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + req.getCategoryId()));
        event.setCategory(cat);
    }
    ```
  - In the `update` method: after `mapper.mapRequestToEntity(req, event)` and before `repository.save(event)`, resolve category:
    ```java
    if (req.getCategoryId() != null) {
        CategoryEntity cat = categoryRepository.findById(req.getCategoryId())
            .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + req.getCategoryId()));
        event.setCategory(cat);
    } else {
        event.setCategory(null);
    }
    ```
  - **Note:** `mapRequestToEntity` does NOT set category — the service layer owns this concern because it requires repository access.

#### Step 12: Create `CategoryController`
- **What:** REST controller for the `/api/categories` endpoints (list, create, update)
- **Where:** `backend/src/main/java/com/planner/controller/CategoryController.java`
- **How:**
  - `@RestController @RequestMapping("/api/categories") @CrossOrigin(origins = "${cors.allowed-origins}")`
  - `@GetMapping` (no path) → `listAll()` → 200 with list
  - `@PostMapping` → `@RequestBody @Valid CategoryRequest` → `create()` → 201 Created
  - `@PutMapping("/{id}")` → `@RequestBody @Valid CategoryRequest` → `update()` → 200
  - Update `GlobalExceptionHandler` to map `IllegalArgumentException` → 409 Conflict with the message body

#### Step 13: Add Route Handlers for categories in Next.js
- **What:** Server-side proxy for `/api/categories` and `/api/categories/[id]`
- **Where:** `frontend/app/api/categories/route.ts`, `frontend/app/api/categories/[id]/route.ts`
- **How:**
  - Same pattern as the existing `app/api/events/` route handlers
  - `route.ts`: `GET` (list), `POST` (create) → forward to `process.env.API_URL/api/categories`
  - `[id]/route.ts`: `PUT` (update) → forward to `process.env.API_URL/api/categories/{id}`

#### Step 14: Add Category types and API client functions
- **What:** TypeScript types for `Category` and updated `CalendarEvent`; API calls for categories
- **Where:** `frontend/lib/types.ts`, `frontend/lib/api.ts`
- **How:**
  - Add to `types.ts`:
    ```ts
    export interface Category {
      id: string;
      name: string;
      color: string;
    }

    export interface CategoryRequest {
      name: string;
      color: string;
    }
    ```
  - Update `CalendarEvent`: add `categoryId?: string` and `resolvedColor?: string`
  - Update `EventRequest`: add `categoryId?: string`
  - Add to `api.ts`:
    ```ts
    export async function getCategories(): Promise<Category[]>
    export async function createCategory(data: CategoryRequest): Promise<Category>
    export async function updateCategory(id: string, data: CategoryRequest): Promise<Category>
    ```

#### Step 15: Update `EventBlock` and `MonthView` to use `resolvedColor`
- **What:** Use `event.resolvedColor` instead of `event.color` for event display color in all calendar views
- **Where:** `frontend/components/calendar/EventBlock.tsx`, `frontend/components/calendar/MonthView.tsx`
- **How:**
  - **EventBlock:** Change `const color = event.color ?? '#3b82f6'` → `const color = event.resolvedColor ?? '#3b82f6'`
  - **MonthView:** Change `<EventChip $color={ev.color ?? '#3b82f6'}>` → `<EventChip $color={ev.resolvedColor ?? '#3b82f6'}>`
  - This ensures category colors are reflected consistently across Day, Week, and Month views

#### Step 16: Build `CategoryPicker` component
- **What:** Reusable component that renders a list of categories as selectable chips/rows (name + color dot); includes inline "Add category" and "Edit category" functionality
- **Where:** `frontend/components/calendar/CategoryPicker.tsx`
- **How:**
  - File must begin with `'use client'`
  - Props: `categories: Category[]`, `selectedId: string | null`, `onSelect: (id: string | null) => void`, `onCreateCategory: (name: string, color: string) => Promise<void>`, `onUpdateCategory: (id: string, name: string, color: string) => Promise<void>`
  - Renders each category as a row: `[●  Travel  ✏️]` — color dot + name + small edit icon; selected row gets a highlighted border/checkmark
  - "None" option at the top to deselect category
  - "＋ New category" button at the bottom opens an inline mini-form (name input + 8 color swatches from `EVENT_COLORS`) — on submit calls `onCreateCategory`, then auto-selects the new category
  - Edit icon on each row toggles an inline edit form for that row (same shape: name + color swatches) — on submit calls `onUpdateCategory`
  - No delete action (out of scope)

#### Step 17: Update `EventModal` to use `CategoryPicker`
- **What:** Replace the standalone color swatch section with the `CategoryPicker`; keep a "Custom color" toggle for per-event color override
- **Where:** `frontend/components/calendar/EventModal.tsx`
- **How:**
  - Add state: `categoryId: string | null` (from `state.initialEvent?.categoryId ?? null`)
  - Replace the `<Field>` block labeled "Color" with:
    1. `<CategoryPicker>` section (category selection)
    2. A collapsible "Custom color" row — a small link/toggle below the picker; when expanded shows the 8 color swatches for per-event override; `color` state is only set when a custom swatch is selected; when category changes, clear the custom color override
  - In the `handleSubmit` payload, include `categoryId` and keep `color` (send `undefined` if no custom color selected)
  - Accept `categories: Category[]`, `onCreateCategory`, and `onUpdateCategory` as new props — pass them down from `CalendarLayout`

#### Step 18: Update `CalendarLayout` to load categories
- **What:** Fetch categories once on mount and pass them down to `EventModal`
- **Where:** `frontend/components/calendar/CalendarLayout.tsx`
- **How:**
  - Add state: `categories: Category[]` — fetched via `getCategories()` in a `useEffect` on mount
  - Pass `categories`, `onCreateCategory`, and `onUpdateCategory` handlers to `EventModal`
  - `onCreateCategory` calls `createCategory(...)`, then re-fetches the category list to stay in sync
  - `onUpdateCategory` calls `updateCategory(...)`, then re-fetches the category list

---

### Dependencies & Prerequisites

- Flyway migration `V2__add_categories.sql` must run before the app starts (handled automatically)
- `CategoryRepository` and `CategoryService` must exist before `EventService` is updated (Steps 4 and 10 before Step 11)
- `EventRepository` must have `@EntityGraph` before `EventService` mapping is called (Step 5 before Step 11)
- Frontend Route Handlers (Step 13) must exist before the API client functions (Step 14) are called
- `CategoryPicker` component (Step 16) must exist before `EventModal` is updated (Step 17)
- `EventModal` must accept new props before `CalendarLayout` passes them (Step 17 before Step 18)

---

### Out of Scope

- Category deletion (backend FK supports `ON DELETE SET NULL` but no UI/API endpoint exposed in this version)
- Category reordering / sorting preferences
- Per-user categories (all categories are shared/global for now, consistent with the current no-auth model)
- Category icons beyond color
- Filtering the calendar view by category (future feature)
- Category usage statistics
- Importing/exporting categories
- Audit timestamps on categories (can be added later if needed)

---

### Open Questions

- Should the `categories` list endpoint support pagination, or is a flat list always acceptable?
  - **Decision:** Flat list is fine for MVP — categories will be small in number.
