---
status: done
feature: Remove Event Color Override
---

## Feature: Remove Event Color Override

### Requirements Summary

- Remove the `color` column from the `events` table
- Events can only use their category's color (no per-event override)
- Simplify `resolvedColor()` to return only category color or default
- Remove the "Custom color override" toggle from `EventModal`
- Update all DTOs to remove the `color` field
- Migration must handle existing events with custom colors gracefully

---

### Implementation Steps

#### Step 1: Write Flyway migration `V3__remove_event_color.sql`
- **What:** Drop the `color` column from the `events` table
- **Where:** `backend/src/main/resources/db/migration/V3__remove_event_color.sql`
- **How:**
  ```sql
  ALTER TABLE events DROP COLUMN color;
  ```
- **Note:** Existing per-event custom colors will be permanently lost. Events will fall back to their category color (if assigned) or the default blue `#3b82f6`. This is acceptable for early-stage deployment with minimal users.

#### Step 2: Update `EventEntity` — remove `color` field and simplify `resolvedColor()`
- **What:** Remove the `color` field and update `resolvedColor()` to only check category
- **Where:** `backend/src/main/java/com/planner/model/entity/EventEntity.java`
- **How:**
  - Remove the `@Setter @Column(name = "color", length = 7) private String color;` field
  - Update `resolvedColor()`:
    ```java
    public String resolvedColor() {
        if (this.category != null) return this.category.getColor();
        return "#3b82f6";
    }
    ```
  - Search for uses of the 5-parameter constructor `EventEntity(title, description, startTime, endTime, color)` — verify no callers exist or update them to remove the `color` argument
  - Remove the `color` parameter from the constructor signature

#### Step 3: Update `EventRequest` DTO — remove `color` field
- **What:** Remove the `color` field and its validation
- **Where:** `backend/src/main/java/com/planner/domain/EventRequest.java`
- **How:**
  - Remove the `@Pattern` annotated `color` field entirely

#### Step 4: Update `EventResponse` DTO — remove `color` field
- **What:** Remove the `color` field from the response record
- **Where:** `backend/src/main/java/com/planner/domain/EventResponse.java`
- **How:**
  - Remove the `String color` parameter from the record (keep `resolvedColor`)

#### Step 5: Update `EventMapper` — remove `color` from mapping
- **What:** Remove `color` from all mapping methods
- **Where:** `backend/src/main/java/com/planner/mapper/EventMapper.java`
- **How:**
  - In `toResponse()`: remove `entity.getColor()` from the record constructor (8 params → 7 params)
  - In `mapRequestToEntity()`: remove the `entity.setColor(request.getColor());` line

#### Step 6: Update frontend `CalendarEvent` type — remove `color` field
- **What:** Remove the `color` field (keep `resolvedColor`)
- **Where:** `frontend/lib/types.ts`
- **How:**
  - Remove `color?: string;` from `CalendarEvent` interface
  - Keep `resolvedColor?: string;`

#### Step 7: Update frontend `EventRequest` type — remove `color` field
- **What:** Remove the `color` field
- **Where:** `frontend/lib/types.ts`
- **How:**
  - Remove `color?: string;` from `EventRequest` interface

#### Step 8: Update `EventModal` — remove custom color override UI
- **What:** Remove the "Custom color override" toggle and all related state
- **Where:** `frontend/components/calendar/EventModal.tsx`
- **How:**
  - Remove `color` state variable
  - Remove `showCustomColor` state variable
  - Remove the `CustomColorToggle` button and conditional `ColorSwatches` rendering
  - Remove `CustomColorToggle` styled component
  - Remove `ColorSwatches` styled component (no longer used)
  - Remove `Swatch` styled component (no longer used)
  - **Keep** the `EVENT_COLORS` import — it's still used by `CategoryPicker`
  - In `handleSubmit`, remove `color: showCustomColor && color ? color : undefined,` from the request payload
  - In the `useEffect` reset, remove `setColor` and `setShowCustomColor` calls

#### Step 9: Verify the implementation
- **What:** Run diagnostics and manually test the changes
- **Where:** Frontend and backend
- **How:**
  - Run `get_diagnostics` on all modified files
  - Verify the backend compiles
  - Manually test:
    - Events with categories display the category color
    - Events without categories display the default blue `#3b82f6`
    - Creating and editing events works without the `color` field
    - The "Custom color override" UI no longer appears in the modal

---

### Dependencies & Prerequisites

- Migration `V3__remove_event_color.sql` must run before backend restarts
- Backend changes (Steps 2-5) must be completed before frontend changes (Steps 6-8)

---

### Out of Scope

- Migrating existing per-event colors to categories (data is simply dropped — acceptable for early deployment)
- Adding a default category for events that have no category (they fall back to default blue)
- Data migration scripts for preserving custom colors (not needed for current user base)

---

### Notes

- `EventBlock.tsx` and `MonthView.tsx` already use `resolvedColor` exclusively (updated in the previous feature) — no changes needed
- The migration is destructive but acceptable given the early stage of deployment
