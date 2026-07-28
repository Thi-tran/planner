# Plan: Simplify Task Status to Two States

**Date**: July 26, 2026  
**Goal**: Change task status from 3 states (unchecked, in-progress, done) to 2 states (todo, done)  
**UI Change**: Replace status icons with color-matched checkboxes

---

## Current State

### Database
- `status VARCHAR(20)` with CHECK constraint: `('unchecked', 'in-progress', 'done')`

### Backend
- `TaskStatus` enum: `UNCHECKED("unchecked")`, `IN_PROGRESS("in-progress")`, `DONE("done")`
- `TaskStatusConverter` for JPA mapping

### Frontend
- Status icons: ○ (unchecked), ◐ (in-progress), ● (done)
- Status badge showing current state
- Color-coded by status

---

## Desired State

### Visual Design
- **Checkbox** before each task (not status icon)
- **Unchecked** (todo): Empty checkbox with checklist color border
- **Checked** (done): Filled checkbox with checklist color + white checkmark
- **Done tasks**: Strikethrough text (already implemented ✅)
- **No status badge** needed anymore

### Database
- Change CHECK constraint to: `('todo', 'done')`
- Migrate existing data: `'unchecked'` + `'in-progress'` → `'todo'`

### Backend
- Update `TaskStatus` enum to: `TODO("todo")`, `DONE("done")`
- Remove `IN_PROGRESS` state

### Frontend
- Replace status icon with checkbox
- Remove status badge
- Checkbox color matches checklist color
- Checkbox is clickable (future: will toggle status)

---

## Implementation Steps

### Step 1: Database Migration (V9)

Create new migration file to:
1. Migrate existing data
2. Update CHECK constraint

```sql
-- V9__simplify_task_status.sql

-- Migrate existing statuses
UPDATE checklist_tasks 
SET status = 'todo' 
WHERE status IN ('unchecked', 'in-progress');

-- Drop old constraint
ALTER TABLE checklist_tasks 
DROP CONSTRAINT chk__checklist_tasks__status;

-- Add new constraint
ALTER TABLE checklist_tasks 
ADD CONSTRAINT chk__checklist_tasks__status 
CHECK (status IN ('todo', 'done'));
```

**Affected rows**: 
- 4 tasks currently (3 will change from 'unchecked'/'in-progress' to 'todo')

---

### Step 2: Backend Changes

#### 2.1 Update `TaskStatus.java`

```java
public enum TaskStatus {
    TODO("todo"),
    DONE("done");
    
    private final String dbValue;
    
    TaskStatus(String dbValue) {
        this.dbValue = dbValue;
    }
    
    @JsonValue
    public String getDbValue() {
        return dbValue;
    }
    
    public static TaskStatus fromDbValue(String dbValue) {
        for (TaskStatus status : values()) {
            if (status.dbValue.equals(dbValue)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown TaskStatus: " + dbValue);
    }
}
```

**Changes**:
- Remove `IN_PROGRESS("in-progress")`
- Rename `UNCHECKED` to `TODO`

#### 2.2 Update `ChecklistTaskEntity.java`

```java
@PrePersist
protected void onCreate() {
    createdAt = Instant.now();
    updatedAt = Instant.now();
    if (status == null) status = TaskStatus.TODO;  // Changed from UNCHECKED
    if (displayOrder == null) displayOrder = 0;
}
```

**Changes**:
- Default status from `UNCHECKED` to `TODO`

#### 2.3 Update Seed Data (V8)

Update existing seed data to use new values:
```sql
-- Change all 'unchecked' to 'todo'
-- Keep 'done' as 'done'
-- Change 'in-progress' to 'todo'
```

**Note**: May need to create V10 seed data instead of modifying V8 (Flyway doesn't allow modification of executed migrations)

---

### Step 3: Frontend Changes

#### 3.1 Update `TaskRow.tsx` - Complete Redesign

**Remove**:
- `getStatusIcon()` function
- `getStatusColor()` function  
- `StatusIcon` component
- `StatusBadge` component

**Add**:
- `Checkbox` component styled with checklist color
- Checkbox receives color from parent (via prop)

**New structure**:
```tsx
<Row>
  <Checkbox 
    $checked={task.status === 'done'} 
    $color={checklistColor}
  />
  <TaskContent>
    <TaskDescription $isDone={task.status === 'done'}>
      {task.description}
    </TaskDescription>
    <TaskMeta>
      {/* assignee, deadline, comments */}
    </TaskMeta>
  </TaskContent>
</Row>
```

**Styled Components**:
```tsx
const Checkbox = styled.div<{ $checked: boolean; $color: string }>`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  
  ${p => p.$checked ? `
    background: ${p.$color};
    border: 2px solid ${p.$color};
    
    &::after {
      content: '✓';
      color: white;
      font-size: 14px;
      font-weight: bold;
    }
  ` : `
    background: white;
    border: 2px solid ${p.$color};
    
    &:hover {
      background: ${p.$color}10;
    }
  `}
`;
```

#### 3.2 Update `ChecklistCard.tsx`

Pass checklist color to TaskRow:
```tsx
<TaskRow 
  key={task.id} 
  task={task} 
  checklistColor={colorHex}  // New prop
/>
```

#### 3.3 Update TypeScript Types

In `lib/types.ts`:
```typescript
// Update TaskStatus type
export type TaskStatus = 'todo' | 'done';  // Remove 'in-progress'
```

#### 3.4 Update Summary Calculations

In `ChecklistCard.tsx`:
```tsx
// Already correct - counts 'done' tasks
const completedCount = checklist.tasks.filter(t => t.status === 'done').length;
```

No change needed (already filters by 'done')

---

### Step 4: Update Seed Data (V10)

Create new seed data file with simplified status:

```sql
-- V10__update_checklist_seed_data.sql

-- Clear old seed data
DELETE FROM task_comments WHERE task_id IN (
  SELECT id FROM checklist_tasks WHERE checklist_id IN (
    '10000000-0000-4000-a000-000000000001',
    '10000000-0000-4000-a000-000000000002'
  )
);

DELETE FROM checklist_tasks WHERE checklist_id IN (
  '10000000-0000-4000-a000-000000000001',
  '10000000-0000-4000-a000-000000000002'
);

DELETE FROM checklists WHERE id IN (
  '10000000-0000-4000-a000-000000000001',
  '10000000-0000-4000-a000-000000000002'
);

-- Insert checklists (same as V8)
INSERT INTO checklists (id, project_id, name, description, color, created_at, updated_at)
VALUES 
  ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001', 
   'Pre-departure essentials', 'Things to do before the trip', 'Sky Cyan', 
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000001', 
   'Book flights — Checklist', 'Flight booking steps', 'Blush Pink', 
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert tasks with new 'todo'/'done' status
INSERT INTO checklist_tasks (checklist_id, description, deadline, status, display_order, created_at, updated_at)
VALUES 
  ('10000000-0000-4000-a000-000000000001', 'Reserve accommodations', 
   CURRENT_DATE + INTERVAL '5 days', 'todo', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-a000-000000000001', 'Apply for foreign visa', 
   CURRENT_DATE + INTERVAL '10 days', 'todo', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-a000-a000-000000000001', 'Book travel insurance', 
   CURRENT_DATE - INTERVAL '2 days', 'todo', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-a000-000000000001', 'Download offline maps', 
   CURRENT_DATE + INTERVAL '15 days', 'done', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-a000-000000000002', 'Compare prices on Skyscanner', 
   NULL, 'done', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-a000-000000000002', 'Purchase tickets', 
   CURRENT_DATE + INTERVAL '2 days', 'todo', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

---

## Testing Plan

### Backend Tests
1. ✅ Verify migration V9 runs successfully
2. ✅ Verify data migrated correctly (check `status` column)
3. ✅ Test `TaskStatus.fromDbValue("todo")` works
4. ✅ Test `TaskStatus.fromDbValue("done")` works
5. ✅ Test API returns correct status values

### Frontend Tests
1. ✅ Verify checkbox appears instead of status icon
2. ✅ Verify checkbox color matches checklist color
3. ✅ Verify checked state shows checkmark
4. ✅ Verify done tasks have strikethrough
5. ✅ Verify summary metrics still calculate correctly
6. ✅ Verify no status badge appears

### Manual Testing
1. Navigate to Checklists page
2. Verify all tasks show checkbox (not icon)
3. Verify done tasks: ☑ (checked) + strikethrough text
4. Verify todo tasks: ☐ (unchecked) + normal text
5. Verify checkbox colors match checklist border color

---

## Files to Change

### Backend (5 files)
1. `/backend/src/main/resources/db/migration/V9__simplify_task_status.sql` - **NEW**
2. `/backend/src/main/resources/db/migration/V10__update_checklist_seed_data.sql` - **NEW**
3. `/backend/src/main/java/com/planner/model/entity/TaskStatus.java` - **UPDATE**
4. `/backend/src/main/java/com/planner/model/entity/ChecklistTaskEntity.java` - **UPDATE**
5. `/backend/src/main/java/com/planner/service/ChecklistService.java` - **UPDATE** (check for status filtering)

### Frontend (3 files)
1. `/frontend/lib/types.ts` - **UPDATE** (TaskStatus type)
2. `/frontend/components/checklists/TaskRow.tsx` - **MAJOR UPDATE** (redesign)
3. `/frontend/components/checklists/ChecklistCard.tsx` - **UPDATE** (pass color prop)

---

## Risks & Considerations

### ⚠️ Breaking Changes
- Existing tasks with `'in-progress'` status will become `'todo'`
- Users lose "in-progress" state information
- **Mitigation**: This is intentional - simplifying the workflow

### ⚠️ Migration Rollback
- If migration fails, need rollback script
- **Mitigation**: Test migration on development database first

### ⚠️ Checkbox Click (Future Feature)
- Currently view-only (Phase 1)
- Checkbox will not be clickable yet
- **Note**: Phase 2 will add click handler to toggle status

---

## Execution Order

1. **Backend First**:
   - Create V9 migration (update constraint)
   - Create V10 seed data (new values)
   - Update TaskStatus enum
   - Update ChecklistTaskEntity
   - Rebuild backend
   - Verify migrations run
   - Test API endpoints

2. **Frontend Second**:
   - Update types.ts
   - Update TaskRow.tsx (redesign)
   - Update ChecklistCard.tsx (pass color)
   - Verify rendering
   - Test with different checklist colors

3. **Testing**:
   - Manual testing
   - Verify all checkboxes render correctly
   - Verify colors match

---

## Estimated Time

- Backend changes: 20 minutes
- Frontend changes: 30 minutes
- Testing: 15 minutes
- **Total**: ~1 hour

---

## Approval Required

Before proceeding:
- ✅ Confirm this matches desired UX (checkbox + 2 states)
- ✅ Confirm loss of "in-progress" state is acceptable
- ✅ Confirm checkbox color should match checklist color

---

**Status**: ⏸️ AWAITING APPROVAL

Ready to proceed with implementation?
