# Bug Fix: Task Update Validation Error

## Issue
When clicking on priority, status, assignee, or deadline to change them in the TaskDetailsPanel, the update fails with validation error:

```json
{
  "error": "Validation failed",
  "details": ["title: Title is required"]
}
```

## Root Cause
The backend `UpdateTaskRequest` DTO has `@NotBlank` validation on the `title` field:

```java
@NotBlank(message = "Title is required")
@Size(max = 500, message = "Title must be at most 500 characters")
private String title;
```

When the frontend sends partial updates (e.g., only `{ priority: 'high' }`), the `title` field is missing/null, causing validation to fail.

## Solution
Always include the current `title` value in every update request, regardless of which field is being changed.

### Changes Made
**File:** `frontend/components/checklists/TaskDetailsPanel.tsx`

Updated all change handlers to include `title` in the update payload:

1. **handleStatusChange**
   ```typescript
   // Before: saveTask({ status: newStatus });
   // After:
   saveTask({ title, status: newStatus });
   ```

2. **handlePriorityChange**
   ```typescript
   // Before: saveTask({ priority: newPriority });
   // After:
   saveTask({ title, priority: newPriority });
   ```

3. **handleAssigneeChange**
   ```typescript
   // Before: saveTask({ assignedTo: value || undefined });
   // After:
   saveTask({ title, assignedTo: value || undefined });
   ```

4. **handleDeadlineChange**
   ```typescript
   // Before: saveTask({ deadline: value || undefined });
   // After:
   saveTask({ title, deadline: value || undefined });
   ```

5. **handleDescriptionBlur**
   ```typescript
   // Before: saveTask({ details: description });
   // After:
   saveTask({ title, details: description });
   ```

## Why This Works
The `title` state variable is always kept in sync with the current task title. When any field changes:
1. The new value is set in local state
2. `saveTask()` is called with both the `title` and the changed field
3. The backend receives a valid request with all required fields
4. Validation passes and the update succeeds

## Alternative Solutions Considered

### ❌ Make title optional in backend
**Rejected:** Title is a required field for tasks. Making it optional would allow invalid task states.

### ❌ Send all fields on every update
**Rejected:** Unnecessary data transfer. Only changed fields + title is more efficient.

### ✅ Current solution: Include title in every update
**Chosen:** Minimal change, maintains data integrity, follows backend validation rules.

## Verification
✅ TypeScript compiles with no errors
✅ All update operations now include title
✅ No changes required to backend validation logic

## Testing Checklist
- [x] Change status → saves successfully ✓
- [x] Change priority → saves successfully ✓
- [x] Change assignee → saves successfully ✓
- [x] Change deadline → saves successfully ✓
- [x] Edit description → saves successfully ✓
- [x] Edit title directly → saves successfully ✓

## Implementation Complete
Bug fixed and verified. All task field updates now work correctly.
