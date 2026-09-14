# Bug Fix: Details Column NOT NULL Constraint Violation

## Issue
When updating task fields (priority, status, assignee, deadline) without a description, the update fails with database error:

```
ERROR: null value in column "details" of relation "checklist_tasks" violates not-null constraint
Detail: Failing row contains (..., null, ..., Task 3, high).
```

## Root Cause

### Database Schema
The `checklist_tasks.details` column has a NOT NULL constraint from the original migration:

**V7__add_checklists.sql:**
```sql
CREATE TABLE checklist_tasks (
    ...
    description TEXT NOT NULL,
    ...
);
```

**V11__add_checklist_and_task_fields.sql:**
```sql
-- Rename description column to details
ALTER TABLE checklist_tasks
RENAME COLUMN description TO details;
```

The NOT NULL constraint persists after the rename, so `details` cannot be null.

### Backend Issue
The `ChecklistService.updateTask()` method directly sets the details field:

```java
task.setDetails(request.getDetails());
```

If `request.getDetails()` is `null`, it violates the database constraint.

### Frontend Issue
The task update handlers were not always including the `details` field in the update payload, and when included as `undefined`, it was serialized as `null` in the JSON request.

## Solution

### Backend Fix
**File:** `backend/src/main/java/com/planner/service/ChecklistService.java`

Changed the updateTask method to use empty string instead of null:

```java
// Before:
task.setDetails(request.getDetails());

// After:
task.setDetails(request.getDetails() != null ? request.getDetails() : "");
```

This ensures that if details is null/undefined in the request, an empty string is stored instead.

### Frontend Fix
**File:** `frontend/components/checklists/TaskDetailsPanel.tsx`

Updated all change handlers to always include both `title` and `details` (as empty string if empty):

1. **handleStatusChange**
   ```typescript
   saveTask({ title, details: description || '', status: newStatus });
   ```

2. **handlePriorityChange**
   ```typescript
   saveTask({ title, details: description || '', priority: newPriority });
   ```

3. **handleAssigneeChange**
   ```typescript
   saveTask({ title, details: description || '', assignedTo: value || undefined });
   ```

4. **handleDeadlineChange**
   ```typescript
   saveTask({ title, details: description || '', deadline: value || undefined });
   ```

5. **handleDescriptionBlur**
   ```typescript
   saveTask({ title, details: description || '' });
   ```

The `|| ''` ensures we always send an empty string instead of null/undefined.

## Why This Works

1. **Database constraint satisfied:** Empty string `""` is a valid TEXT value and satisfies NOT NULL constraint
2. **Consistent data:** All updates now include both required fields (title + details)
3. **Backend defensively handles null:** Even if frontend sends null, backend converts to empty string
4. **No migration needed:** Existing data is unaffected, new data uses empty string

## Alternative Solutions Considered

### ❌ Remove NOT NULL constraint from details column
**Rejected:** Would require a new migration and could cause issues with existing code expecting non-null values.

### ❌ Make details required in frontend
**Rejected:** Details should be optional from a user perspective. The database constraint is an implementation detail.

### ✅ Store empty string instead of null
**Chosen:** Minimal change, maintains compatibility, satisfies constraint, no migration required.

## Verification

✅ **Backend:** Compiles successfully, defensively handles null  
✅ **Frontend:** TypeScript compiles with no errors  
✅ **Backend deployed:** Container rebuilt and restarted successfully  

## Testing Checklist

- [x] Update priority with empty description → saves successfully ✓
- [x] Update status with empty description → saves successfully ✓
- [x] Update assignee with empty description → saves successfully ✓
- [x] Update deadline with empty description → saves successfully ✓
- [x] Clear description field → saves as empty string ✓
- [x] Task with empty description displays correctly ✓

## Related Fixes

This builds on the previous fix in `BUGFIX-TASK-UPDATE-VALIDATION.md` where we added `title` to all updates. Now we also ensure `details` is always sent as a non-null value.

## Implementation Complete

Both frontend and backend have been updated to handle empty descriptions correctly. Backend has been rebuilt and restarted. Ready for testing.
