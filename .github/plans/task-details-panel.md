---
status: under-review
feature: Task Details Side Panel
last-updated: September 13, 2026
---

# Task Details Side Panel - Implementation Plan

**Date**: September 13, 2026  
**Target**: Full task detail viewing, editing, and commenting functionality  
**User Story**: As a project member, I want to view the details of a checklist task, so that I can understand what needs to be done, track its progress, and access all relevant information in one place.

---

## 🔴 CRITICAL ISSUES FOUND DURING GRILLING

### C1: TaskStatus.fromString() Method Does Not Exist
**Problem**: The plan's `updateTask()` method calls `TaskStatus.fromString(request.getStatus())` but this method doesn't exist.

**Evidence**:
- Actual method in `TaskStatus.java`: `fromDbValue(String dbValue)`
- Not: `fromString(String value)`

**Impact**: Code won't compile. Backend implementation will fail.

**Fix**: Use `TaskStatus.fromDbValue(request.getStatus())` instead of `fromString()`.

---

### C2: Missing Repository Query Method
**Problem**: Plan proposes `findByIdWithDetails()` but this doesn't exist and conflicts with existing pattern.

**Current Pattern Analysis**:
- Existing: `findByIdWithAssignee()` - loads task + assignee
- Existing: `findByIdWithChecklist()` - loads task + checklist + project
- Neither loads comments with the task

**Impact**: 
- The single query approach won't work
- Need multiple queries or a new complex JOIN FETCH
- Comments are loaded lazily, causing potential N+1

**Fix Options**:
1. Create new `findByIdWithDetails()` with full JOIN FETCH chain
2. Use existing `findByIdWithChecklist()` + fetch comments separately
3. Accept lazy loading (comments will auto-fetch in transaction)

**Recommendation**: **Option 1** - Create proper query to avoid N+1:
```java
@Query("SELECT t FROM ChecklistTaskEntity t " +
       "JOIN FETCH t.checklist c " +
       "JOIN FETCH c.project p " +
       "LEFT JOIN FETCH t.assignedToUser " +
       "LEFT JOIN FETCH t.comments cmt " +
       "LEFT JOIN FETCH cmt.user " +
       "WHERE t.id = :taskId")
Optional<ChecklistTaskEntity> findByIdWithDetails(@Param("taskId") UUID taskId);
```

---

### C3: Navigation Query Method Missing
**Problem**: Plan mentions navigating to prev/next task but provides no implementation.

**Required**: `findByChecklistIdOrderByDisplayOrder()` method.

**Current State**: This method does NOT exist in `ChecklistTaskRepository`.

**Impact**: Navigation arrows won't work without this query.

**Fix**: Add to repository:
```java
@Query("SELECT t FROM ChecklistTaskEntity t " +
       "WHERE t.checklist.id = :checklistId " +
       "ORDER BY t.displayOrder ASC")
List<ChecklistTaskEntity> findByChecklistIdOrderByDisplayOrder(@Param("checklistId") UUID checklistId);
```

---

### C4: ChecklistCard Missing onTaskClick Prop
**Problem**: Plan shows adding `onTaskClick` prop to ChecklistCard, but current implementation doesn't have it.

**Current Props**: `checklist, expanded, onToggle, onTaskAdded`

**Impact**: Breaking change to existing component contract.

**Fix**: This is intentional and correct - the plan IS adding this new prop. **Not an issue, but documenting the breaking change.**

---

### C5: TaskRow Missing "View →" Button and Click Handler
**Problem**: Plan assumes TaskRow will be updated, but current implementation has no hover state or "View →" button.

**Current Behavior**: TaskRow only shows checkbox and task info. No click handling except checkbox.

**Impact**: Need significant TaskRow refactor, not just "add a prop".

**Fix**: Correct - this is in the plan. **Documenting scope of changes.**

---

### C6: Status Mapping Mismatch
**Problem**: Plan shows status as string "todo"/"done" but needs to handle both DB format and enum.

**Current Mapping in ChecklistMapper**:
```java
entity.getStatus().name().toLowerCase().replace('_', '-')
// Returns "todo" or "done" (correct)
```

**TaskStatus.fromDbValue()** expects: "todo" or "done" (matches)

**UpdateTaskRequest.status**: String "todo" or "done"

**Conclusion**: Mapping is actually correct. Plan should use `fromDbValue()`. **Fixed in C1.**

---

### C7: Missing TaskCommentRepository Import
**Problem**: Plan shows `TaskCommentRepository` as dependency but it's not currently used in ChecklistService.

**Current Dependencies**:
```java
ChecklistRepository, ChecklistTaskRepository, ChecklistMapper, 
ProjectAccessService, ProjectRepository, UserRepository, ProjectMembershipRepository
```

**No**: TaskCommentRepository

**Impact**: Adding comments will require this new repository.

**Fix**: Plan correctly identifies this as NEW. Need to create `TaskCommentRepository` interface. **Confirmed in plan.**

---

### C8: Update Method Authorization Mismatch
**Problem**: Plan has different auth requirements for different update types.

**Inconsistency**:
- Checkbox toggle (existing): Requires VIEWER
- Update task details (plan): Requires EDITOR

**User Confusion**: "I can toggle the checkbox but not change priority?"

**Question**: Should toggling status be EDITOR-only to match other updates?

**Decision Needed**: 
- **Option A**: Keep status toggle as VIEWER (current), other updates EDITOR (plan)
- **Option B**: Make ALL task updates require EDITOR (consistent but breaking)

**Recommendation**: **Option A** - Status toggle is lightweight and should stay VIEWER. Editing detailed fields (title, deadline, assignee, priority) requires EDITOR. This matches UI expectations.

---

### C9: Optimistic Comment Append Without Server ID
**Problem**: Plan says "append comment immediately (optimistic)" but server returns ID.

**Flow**:
1. User types comment, clicks Post
2. Optimistically append to list (but comment has no ID yet)
3. Server responds with comment object (has ID, timestamps, etc.)
4. Need to replace the optimistic comment with real one

**Risk**: If using optimistic comment ID as React key, will cause re-render issues.

**Fix**: Generate temp ID (`crypto.randomUUID()`) for optimistic comment, then replace when server responds. Or skip optimistic update for comments (safer).

**Recommendation**: **Skip optimistic updates for comments** in v1. They're not as frequent as status toggles. Show loading state instead.

---

### C10: Panel Width Layout Conflict
**Problem**: Plan specifies panel width of 480px but doesn't address how checklist page layout changes.

**Current Layout**: Checklists page is full width.

**With Panel Open**: Need to shrink checklist area OR overlay panel.

**Options**:
1. **Overlay**: Panel floats over content (with dimmed background)
2. **Shrink**: Checklist area width reduces, panel slides in beside it

**Screenshot Analysis**: Shows overlay pattern (dim background visible).

**Fix**: Plan should explicitly state: **Panel uses overlay pattern with fixed positioning and semi-transparent backdrop**. Checklist area does NOT shrink.

---

### C11: Missing Checklist Context in Panel Header
**Problem**: Plan says "Parent checklist name (clickable to scroll to checklist)" but doesn't provide implementation details.

**Questions**:
1. How to get checklist name? (Task object has checklistId but not name)
2. How to scroll to checklist? (Need ref or ID-based scroll)
3. What if checklist is collapsed?

**Missing**:
- Need to fetch checklist name when opening panel
- Need scroll-to logic in parent component
- Need to expand checklist if collapsed

**Fix**: Add to plan:
```typescript
// In TaskDetailsPanel, fetch checklist info:
const [checklistInfo, setChecklistInfo] = useState<{name: string, color: string} | null>(null);

useEffect(() => {
  fetch(`/api/checklists/${checklistId}`)
    .then(res => res.json())
    .then(data => setChecklistInfo({name: data.name, color: data.color}));
}, [checklistId]);

// Click handler:
const handleChecklistClick = () => {
  onScrollToChecklist(checklistId); // Parent handles scroll + expand
};
```

**Or simpler**: Pass checklist name/color as props from parent.

**Recommendation**: **Pass from parent** - avoids extra API call.

---

### C12: Navigation Arrow Edge Case
**Problem**: What happens if task is deleted while panel is open?

**Scenario**:
1. User opens task #3 of 5
2. Another user deletes task #4
3. User clicks ↓ (next)
4. Task #4 no longer exists

**Current Plan**: Doesn't handle this edge case.

**Fix**: 
- On navigation, if task not found (404), show error and close panel
- OR: Refetch checklist tasks on navigation to get latest list

**Recommendation**: **Refetch checklist on navigation** - ensures arrows always work with fresh data.

---

## 🟡 MAJOR ISSUES

### M1: Debounced Auto-Save State Management Complexity
**Problem**: Multiple fields with different save states = complex UI.

**Scenario**:
- User edits title (starts 1s debounce timer)
- User edits priority (starts another 1s debounce timer)
- User edits deadline (starts another 1s debounce timer)
- All 3 fire at different times with different success/failure states

**Questions**:
1. Show "Saving..." for each field separately?
2. Global "Saving..." indicator?
3. What if title saves but priority fails?
4. Should failed save show per-field error or global error?

**Recommendation**: 
- **Global "Saving..." indicator** in panel header
- **Per-field error messages** below failed field
- **Merge updates**: Collect all changes in 1s window, send single PUT request

---

### M2: Comment Section Scroll Behavior
**Problem**: If task has 20 comments, where does comment list scroll to?

**Options**:
1. **Top of comments** (oldest first, user scrolls down to see new)
2. **Bottom of comments** (newest visible first, user scrolls up for history)
3. **Auto-scroll to bottom** on new comment (chat-app pattern)

**Screenshot Analysis**: Shows "Comments (3)" header, implying scrollable section.

**Recommendation**: 
- **Oldest first, fixed height, scroll to bottom** after posting new comment
- Max height: `400px` with `overflow-y: auto`

---

### M3: Delete Confirmation Button Placement
**Problem**: Delete button at bottom of panel - what if panel is scrolled?

**Options**:
1. **Sticky bottom**: Button always visible (overlays content when scrolling)
2. **Scrollable**: User must scroll to bottom to see delete button

**Screenshot Analysis**: Delete button appears at bottom of visible content.

**Recommendation**: **Scrollable** (not sticky). User must scroll to bottom. Prevents accidental deletion.

---

### M4: Assignee Dropdown - Missing Self-Assignment Default
**Problem**: Plan doesn't specify default assignee when creating task.

**Current State**: `addTask()` allows `assignedTo: null`.

**Question**: Should panel default to current user when opened from "Add task"?

**Decision**: This is for **editing existing tasks**, not creating. Creation happens via AddTaskModal. **Not an issue.**

---

### M5: Priority Validation Missing
**Problem**: UpdateTaskRequest allows any string for priority, but DB only allows low/medium/high.

**Current Validation**: None in DTO.

**Impact**: Invalid priority passes DTO validation, fails at DB constraint.

**Fix**: Add validation annotation:
```java
@Pattern(regexp = "^(low|medium|high)$", message = "Priority must be low, medium, or high")
private String priority;
```

---

### M6: Status "Cancelled" Mentioned But Not in Enum
**Problem**: Plan's UI spec mentions "Cancelled" status but `TaskStatus` enum only has TODO and DONE.

**Plan Section "UI/UX Design Specifications"**:
```
Status Colors:
- To do: #E5E7EB (gray-200)
- Done: #10B981 (Sage Green)
- Cancelled: #EF4444 (red-500) - deferred
```

**Impact**: If user tries to set status to "cancelled", it will fail.

**Fix**: Plan correctly marks as **"deferred"**. Remove from UI spec or add to enum if implementing.

**Recommendation**: **Remove from UI spec** to avoid confusion.

---

### M7: Unclear Role Requirements for Comments
**Problem**: Plan says "Requires VIEWER (anyone who can see the task can comment)".

**Question**: Should VIEWER be able to comment or just view comments?

**Options**:
- VIEWER can comment (plan's choice - collaborative)
- EDITOR required to comment (more restrictive)

**Decision in Plan**: VIEWER can comment.

**Validation**: This matches ticket: "PROJECT MEMBER" persona (any member can collaborate).

**Conclusion**: Correct. **No issue.**

---

### M8: Missing "Parent Checklist" Information in TaskResponse
**Problem**: Plan shows "Parent checklist" section in panel but `TaskResponse` only has `checklistId`.

**Missing**: Checklist name, checklist color.

**Options**:
1. Expand `TaskResponse` to include `ChecklistSummary` (name, color)
2. Fetch checklist separately in frontend
3. Pass from parent component (checklistId is known)

**Recommendation**: **Option 3** - Parent already has checklist data, pass it as props. Avoids backend change and extra API call.

---

## 🟢 MINOR ISSUES

### N1: Panel Animation Timing Not Specified
**Problem**: Plan says "200ms ease-out" for slide-in but no slide-out timing.

**Fix**: Use same 200ms ease-out for consistency.

---

### N2: Overlay z-index Not Specified
**Problem**: Plan doesn't specify z-index for panel and overlay.

**Fix**: 
- Overlay: `z-index: 1000`
- Panel: `z-index: 1001`
- Ensure higher than sidebar (check sidebar z-index)

---

### N3: Mobile Panel Covers Entire Screen
**Problem**: Plan says "100% width on mobile" but doesn't address close button accessibility.

**Fix**: Ensure close button (×) is always visible and tappable on mobile (44x44px minimum).

---

### N4: Keyboard Focus Management Missing
**Problem**: Plan mentions accessibility but doesn't detail focus management.

**Required**:
- Focus trap inside panel when open
- Return focus to clicked task when closed
- Esc key closes panel (mentioned)
- Tab order logical

**Fix**: Use Radix Dialog primitives or implement focus trap manually.

---

### N5: "View →" Button Always Rendered in DOM?
**Problem**: Plan shows button appears on hover. Should it exist in DOM always or render conditionally?

**Performance**: Rendering for every task adds DOM nodes.

**Recommendation**: Conditional render on hover state. **Not a critical issue.**

---

### N6: Comment Textarea Enter Key Behavior Unclear
**Problem**: Plan says "Enter to submit (Shift+Enter for newline)" but doesn't specify implementation.

**Fix**: Add `onKeyDown` handler:
```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handlePostComment();
  }
};
```

---

### N7: Auto-Save Error Recovery Not Specified
**Problem**: Plan mentions "show error if save fails" but not recovery path.

**Question**: After failed save, does user:
1. Retry manually (button)?
2. Edit triggers new auto-save attempt?
3. See "unsaved changes" warning?

**Recommendation**: **Option 2** - Next edit triggers retry. Show persistent error message until successful save.

---

### N8: Loading State During Navigation
**Problem**: ↑↓ navigation swaps content but plan doesn't show loading state during fetch.

**Fix**: Show skeleton or spinner during task fetch. Disable navigation arrows while loading.

---

### N9: Character Counter Position
**Problem**: Plan mentions character counter for title/description but doesn't show position.

**Recommendation**: 
- Title: Counter in bottom-right of input container
- Description: Counter below textarea (bottom-right)
- Show format: "245 / 500"

---

### N10: Delete Button Color Spec Incomplete
**Problem**: Plan says "Red outline button" but doesn't specify hover state.

**Fix**:
- Default: `border: 1px solid #EF4444; color: #EF4444; background: white`
- Hover: `background: #FEF2F2` (light red tint)

---

## ❓ OPEN QUESTIONS REQUIRING DECISIONS

### Q1: Should Panel Show Task Status History? (Nice-to-have)
**Plan Says**: Deferred to Phase 2.

**Decision**: Confirm this is out of scope for v1. ✅

---

### Q2: Unassign Task - How?
**Question**: If task has assignee, how does user remove assignment?

**Options**:
1. Dropdown has "Unassigned" option at top
2. X button next to assignee name to clear
3. Both

**Recommendation**: **Option 1** - Dropdown with "Unassigned" as first option.

---

### Q3: Clear Deadline - How?
**Question**: If task has deadline, how to remove it?

**HTML5 date input**: Has built-in clear button (×) in most browsers.

**Fallback**: Add explicit "Clear" button next to date picker.

**Recommendation**: **Rely on native clear** + add Clear button for browsers that don't support it.

---

### Q4: Task Title Max Length - Enforce Where?
**Current**: `ChecklistTaskEntity.title` = VARCHAR(500)
**DTO**: `@Size(max = 500)`

**Question**: Frontend input `maxLength` attribute?

**Recommendation**: **Yes** - Add `maxLength={500}` to prevent typing beyond limit. Clearer UX.

---

### Q5: Comment Text Max Length?
**DTO**: `@Size(max = 2000)`

**Question**: Enforce in frontend?

**Recommendation**: **Yes** - Add `maxLength={2000}` to textarea.

---

### Q6: What Happens to Open Panel When Checklist is Deleted?
**Scenario**: User A has task panel open. User B deletes parent checklist (cascade deletes task).

**Current Behavior**: Task endpoint will return 404 on next interaction.

**Recommendation**: Show error "Task no longer exists" and close panel. **Already covered by error handling.**

---

### Q7: Edit Task Title Inline or in Modal?
**Plan Shows**: Inline editable (click to edit).

**Confirmation**: This is correct per plan. ✅

---

### Q8: Show "Edited" Indicator on Comments?
**Question**: If comment `updatedAt > createdAt`, show "Edited"?

**Plan**: Doesn't mention comment editing (deferred).

**Decision**: No edit indicator needed in v1 (comments can't be edited). ✅

---

## 📝 REQUIRED PLAN UPDATES

### Update 1: Fix TaskStatus Method Name
**Section**: Phase B3: Service Layer Updates

**Change**: `TaskStatus.fromString(request.getStatus())` → `TaskStatus.fromDbValue(request.getStatus())`

---

### Update 2: Clarify Repository Query
**Section**: Phase B2: New Repository Methods

**Add Note**: `findByIdWithDetails()` is a NEW method that must be created. It doesn't exist in current codebase.

---

### Update 3: Add findByChecklistIdOrderByDisplayOrder
**Section**: Phase B2: New Repository Methods

**Add**: Navigation query method.

---

### Update 4: Specify Panel Layout Pattern
**Section**: UI/UX Design Specifications

**Add**: Panel uses **overlay pattern with fixed positioning**. Checklist content does NOT shrink. Overlay backdrop dims background.

---

### Update 5: Add Priority Validation
**Section**: Phase B1: New Request/Response DTOs

**Add**: `@Pattern` annotation to `UpdateTaskRequest.priority`.

---

### Update 6: Remove "Cancelled" Status from UI Spec
**Section**: UI/UX Design Specifications > Status Colors

**Remove**: Line about "Cancelled" status (not in enum).

---

### Update 7: Skip Optimistic Comment Updates
**Section**: Q8: Optimistic Updates

**Change**: Comments from "Yes" to "No" - wait for server confirmation.

---

### Update 8: Clarify Parent Checklist Info Source
**Section**: Phase F3: TaskDetailsPanel Component

**Add**: Pass `checklistName` and `checklistColor` as props from parent (avoid extra API call).

---

### Update 9: Add Navigation Error Handling
**Section**: FR5: Navigate Between Tasks

**Add**: If next/prev task returns 404, show error and close panel OR refetch checklist tasks.

---

### Update 10: Add Character Input Limits
**Section**: Phase F3: TaskDetailsPanel Component

**Add**: `maxLength` attributes on title input and description textarea.

---

## ✅ GRILLING SUMMARY

**Total Issues Found**: 30
- 🔴 Critical: 12
- 🟡 Major: 8
- 🟢 Minor: 10

**Plan Quality**: 7/10

**Blocking Issues**: 3 (C1, C2, C3) - Must fix before implementation.

**Readiness**: 60% - Needs updates before starting.

**Estimated Fix Time**: 1-2 hours to update plan.

---

## Executive Summary

This feature adds a right-side panel that displays complete task information including description, status, assignment, deadline, priority, parent checklist, and comments. Users can edit task details, add comments, and navigate between tasks without closing the panel.

### Key Capabilities
- ✅ View full task details in a side panel
- ✅ Edit task information (title, description, assignee, deadline, priority, status)
- ✅ Add and view comments chronologically
- ✅ Delete tasks with confirmation
- ✅ Navigate between tasks using ↑↓ arrows
- ✅ Click task title or "View →" button to open panel
- ✅ Checkbox toggle (without opening panel)

---

## Current State Analysis

### ✅ What Already Exists
1. **Backend**:
   - `ChecklistTaskEntity` with all required fields (title, details, assignedTo, deadline, priority, status, displayOrder)
   - `TaskCommentEntity` with user relationship
   - `TaskResponse` DTO includes comments
   - `PATCH /api/checklists/tasks/{taskId}/status` for status updates
   - Authorization via `ProjectAccessService`

2. **Frontend**:
   - `ChecklistTask` type with all fields
   - `TaskComment` type with user info
   - `TaskRow` component with checkbox toggle
   - `updateTaskStatus()` API function
   - Checklist page with expandable cards

### ❌ What Needs to Be Built

#### Backend (6 endpoints needed)
1. `GET /api/tasks/{taskId}` - Get single task with full details
2. `PUT /api/tasks/{taskId}` - Update task information
3. `DELETE /api/tasks/{taskId}` - Delete task
4. `POST /api/tasks/{taskId}/comments` - Add comment
5. `DELETE /api/tasks/{taskId}/comments/{commentId}` - Delete comment (optional, deferred)
6. ~~`GET /api/tasks/{taskId}/history`~~ - Task history (nice-to-have, deferred)

#### Frontend (1 major component + updates)
1. `TaskDetailsPanel` component (new, ~500 lines)
2. Update `TaskRow` to handle title click
3. Update `ChecklistCard` to manage panel state
4. Update checklist page to handle panel open/close
5. Add API functions for new endpoints

---

## Functional Requirements

### FR1: Open Task Details Panel
**Trigger**: User clicks task title OR "View →" button  
**Result**: Panel slides in from right side, task enters "Active" state  
**Panel displays**:
- Task title (editable inline)
- Description (editable textarea)
- Status selector (To do / Done / Cancelled)
- Priority buttons (Low / Medium / High)
- Assignee dropdown
- Deadline date picker
- Parent checklist name (read-only, clickable to scroll to checklist)
- Comments section
- Delete button (bottom)

### FR2: Edit Task Information
**Fields editable**:
- Title: inline text input (max 500 chars)
- Description: textarea (max 2000 chars)
- Status: button group (todo/done)
- Priority: button group (low/medium/high)
- Assignee: dropdown (project members)
- Deadline: date picker (HTML5 date input)

**Behavior**:
- Auto-save on blur/change (debounced)
- Show saving indicator
- Show error if save fails
- Optimistic updates where safe

### FR3: View and Add Comments
**Comments display**:
- Chronological order (oldest first OR newest first - decide based on UX)
- Author avatar/initials + name
- Date/time (relative: "2 hours ago", "Jun 22")
- Comment text

**Add comment**:
- Text input at bottom of comments section
- "Post" button
- Enter to submit (Shift+Enter for newline)
- Clears input after successful post
- New comment appears immediately (optimistic)

### FR4: Delete Task
**Trigger**: Click delete button at bottom of panel  
**Flow**:
1. Show confirmation dialog: "Delete this task? This action cannot be undone."
2. If confirmed: DELETE request to backend
3. Remove task from checklist
4. Close panel
5. Refresh checklist (update task count, progress)

### FR5: Navigate Between Tasks
**Trigger**: Click ↑ or ↓ arrows in panel header  
**Behavior**:
- ↑ opens previous task (same checklist, by display_order)
- ↓ opens next task
- Fetch checklist tasks on navigation to ensure fresh data
- If next/prev task returns 404, show error and close panel
- Arrows disabled if at first/last task OR while loading
- Panel stays open, content swaps with loading skeleton
- URL updates (optional - not in v1)

### FR6: Close Panel
**Triggers**:
- Click × close button (top right)
- Click outside panel (on overlay)
- Press Escape key
- Delete task (after confirmation)

**Result**:
- Panel slides out
- Checklist list returns to full width
- Active task returns to normal state

### FR7: Checkbox Toggle (No Panel Open)
**Current behavior preserved**:
- Click checkbox → toggles status (todo ↔ done)
- Does NOT open panel
- Shows inline loading state
- Updates checklist UI immediately

---

## Technical Architecture

### Backend Implementation

#### Phase B1: New Request/Response DTOs

**File**: `backend/src/main/java/com/planner/domain/UpdateTaskRequest.java`
```java
package com.planner.domain;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class UpdateTaskRequest {
    @NotBlank(message = "Title is required")
    @Size(max = 500, message = "Title must be at most 500 characters")
    private String title;
    
    @Size(max = 2000, message = "Details must be at most 2000 characters")
    private String details;
    
    private UUID assignedTo; // UUID or null
    
    private LocalDate deadline; // ISO date or null
    
    @Pattern(regexp = "^(low|medium|high)$", message = "Priority must be low, medium, or high")
    private String priority; // "low" | "medium" | "high"
    
    private String status; // "todo" | "done"
}
```

**File**: `backend/src/main/java/com/planner/domain/CommentRequest.java`
```java
package com.planner.domain;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CommentRequest {
    @NotBlank(message = "Comment text is required")
    @Size(max = 2000, message = "Comment must be at most 2000 characters")
    private String commentText;
}
```

#### Phase B2: New Repository Methods

**File**: `backend/src/main/java/com/planner/model/repository/ChecklistTaskRepository.java`

Add methods (BOTH ARE NEW - they don't exist in current codebase):
```java
// NEW METHOD: Find task by ID with all relationships (avoids N+1 query problem)
@Query("SELECT t FROM ChecklistTaskEntity t " +
       "JOIN FETCH t.checklist c " +
       "JOIN FETCH c.project p " +
       "LEFT JOIN FETCH t.assignedToUser " +
       "LEFT JOIN FETCH t.comments cmt " +
       "LEFT JOIN FETCH cmt.user " +
       "WHERE t.id = :taskId")
Optional<ChecklistTaskEntity> findByIdWithDetails(@Param("taskId") UUID taskId);

// NEW METHOD: Find tasks in same checklist ordered by display_order (for navigation arrows)
@Query("SELECT t FROM ChecklistTaskEntity t " +
       "WHERE t.checklist.id = :checklistId " +
       "ORDER BY t.displayOrder ASC")
List<ChecklistTaskEntity> findByChecklistIdOrderByDisplayOrder(@Param("checklistId") UUID checklistId);
```

**File**: `backend/src/main/java/com/planner/model/repository/TaskCommentRepository.java` (NEW)
```java
package com.planner.model.repository;

import com.planner.model.entity.TaskCommentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TaskCommentRepository extends JpaRepository<TaskCommentEntity, UUID> {
    // Spring Data JPA provides basic CRUD
}
```

#### Phase B3: Service Layer Updates

**File**: `backend/src/main/java/com/planner/service/ChecklistService.java`

Add methods:
```java
/**
 * Get single task with full details (including comments).
 * Requires VIEWER role on the task's project.
 */
@Transactional(readOnly = true)
public TaskResponse getTaskDetails(UUID taskId, UUID userId) {
    ChecklistTaskEntity task = checklistTaskRepository.findByIdWithDetails(taskId)
        .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
    
    UUID projectId = task.getChecklist().getProject().getId();
    
    // Authorization: require VIEWER
    projectAccessService.requireRole(projectId, userId, Role.VIEWER);
    
    return checklistMapper.toTaskResponse(task);
}

/**
 * Update task information.
 * Requires EDITOR role on the task's project.
 */
@Transactional
public TaskResponse updateTask(UUID taskId, UpdateTaskRequest request, UUID userId) {
    ChecklistTaskEntity task = checklistTaskRepository.findByIdWithDetails(taskId)
        .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
    
    UUID projectId = task.getChecklist().getProject().getId();
    
    // Authorization: require EDITOR
    projectAccessService.requireRole(projectId, userId, Role.EDITOR);
    
    // Update fields
    task.setTitle(request.getTitle());
    task.setDetails(request.getDetails());
    task.setDeadline(request.getDeadline());
    task.setPriority(request.getPriority());
    
    // Update status if changed
    if (request.getStatus() != null) {
        task.setStatus(TaskStatus.fromDbValue(request.getStatus())); // FIX: Use fromDbValue, not fromString
    }
    
    // Update assignee if changed
    if (request.getAssignedTo() != null) {
        // Validate assignee is project member
        UserEntity assignee = userRepository.findById(request.getAssignedTo())
            .orElseThrow(() -> new BadRequestException("Assigned user not found"));
        
        membershipRepository.findByProjectIdAndUserId(projectId, request.getAssignedTo())
            .orElseThrow(() -> new BadRequestException("Assigned user is not a project member"));
        
        task.setAssignedToUser(assignee);
    } else {
        task.setAssignedToUser(null); // Unassign
    }
    
    checklistTaskRepository.save(task);
    
    return checklistMapper.toTaskResponse(task);
}

/**
 * Delete task.
 * Requires EDITOR role on the task's project.
 */
@Transactional
public void deleteTask(UUID taskId, UUID userId) {
    ChecklistTaskEntity task = checklistTaskRepository.findByIdWithDetails(taskId)
        .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
    
    UUID projectId = task.getChecklist().getProject().getId();
    
    // Authorization: require EDITOR
    projectAccessService.requireRole(projectId, userId, Role.EDITOR);
    
    checklistTaskRepository.delete(task);
    // Comments are cascade-deleted via orphanRemoval
}

/**
 * Add comment to task.
 * Requires VIEWER role (anyone who can see the task can comment).
 */
@Transactional
public TaskCommentResponse addComment(UUID taskId, CommentRequest request, UUID userId) {
    ChecklistTaskEntity task = checklistTaskRepository.findByIdWithDetails(taskId)
        .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
    
    UUID projectId = task.getChecklist().getProject().getId();
    
    // Authorization: require VIEWER (can comment if can view)
    projectAccessService.requireRole(projectId, userId, Role.VIEWER);
    
    UserEntity user = userRepository.findById(userId)
        .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    
    TaskCommentEntity comment = TaskCommentEntity.builder()
        .task(task)
        .user(user)
        .commentText(request.getCommentText())
        .build();
    
    task.getComments().add(comment);
    checklistTaskRepository.save(task);
    
    return checklistMapper.toCommentResponse(comment);
}
```

Add repository dependencies to service:
```java
@RequiredArgsConstructor
public class ChecklistService {
    private final ChecklistRepository checklistRepository;
    private final ChecklistTaskRepository checklistTaskRepository;
    private final TaskCommentRepository taskCommentRepository; // NEW
    private final UserRepository userRepository;
    private final ProjectMembershipRepository membershipRepository;
    private final ProjectAccessService projectAccessService;
    private final ChecklistMapper checklistMapper;
}
```

#### Phase B4: Controller Updates

**File**: `backend/src/main/java/com/planner/controller/ChecklistController.java`

Add endpoints:
```java
@GetMapping("/tasks/{taskId}")
public ResponseEntity<TaskResponse> getTask(
        @PathVariable UUID taskId,
        @AuthenticationPrincipal Jwt jwt) {
    UserEntity user = currentUserService.resolveCurrentUser(jwt);
    return ResponseEntity.ok(checklistService.getTaskDetails(taskId, user.getId()));
}

@PutMapping("/tasks/{taskId}")
public ResponseEntity<TaskResponse> updateTask(
        @PathVariable UUID taskId,
        @Valid @RequestBody UpdateTaskRequest request,
        @AuthenticationPrincipal Jwt jwt) {
    UserEntity user = currentUserService.resolveCurrentUser(jwt);
    return ResponseEntity.ok(checklistService.updateTask(taskId, request, user.getId()));
}

@DeleteMapping("/tasks/{taskId}")
public ResponseEntity<Void> deleteTask(
        @PathVariable UUID taskId,
        @AuthenticationPrincipal Jwt jwt) {
    UserEntity user = currentUserService.resolveCurrentUser(jwt);
    checklistService.deleteTask(taskId, user.getId());
    return ResponseEntity.noContent().build();
}

@PostMapping("/tasks/{taskId}/comments")
public ResponseEntity<TaskCommentResponse> addComment(
        @PathVariable UUID taskId,
        @Valid @RequestBody CommentRequest request,
        @AuthenticationPrincipal Jwt jwt) {
    UserEntity user = currentUserService.resolveCurrentUser(jwt);
    TaskCommentResponse comment = checklistService.addComment(taskId, request, user.getId());
    return ResponseEntity.status(201).body(comment);
}
```

#### Phase B5: Exception Handling

Verify `GlobalExceptionHandler` handles:
- `ResourceNotFoundException` → 404
- `BadRequestException` → 400
- `ForbiddenException` → 403
- `MethodArgumentNotValidException` → 400 with field errors

---

### Frontend Implementation

#### Phase F1: API Functions

**File**: `frontend/lib/api.ts`

Add functions:
```typescript
export async function getTask(taskId: string): Promise<ChecklistTask> {
  return request<ChecklistTask>(`/api/tasks/${taskId}`);
}

export async function updateTask(taskId: string, data: TaskRequest): Promise<ChecklistTask> {
  return request<ChecklistTask>(`/api/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTask(taskId: string): Promise<void> {
  return request<void>(`/api/tasks/${taskId}`, { method: 'DELETE' });
}

export async function addComment(taskId: string, commentText: string): Promise<TaskComment> {
  return request<TaskComment>(`/api/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ commentText }),
  });
}
```

#### Phase F2: Next.js API Routes

**File**: `frontend/app/api/tasks/[id]/route.ts` (NEW)
```typescript
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const API_URL = process.env.API_URL || 'http://localhost:8080';
  
  const res = await fetch(`${API_URL}/api/tasks/${id}`, {
    headers: {
      'Authorization': `Bearer ${session.idToken}`,
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: await res.text() },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const API_URL = process.env.API_URL || 'http://localhost:8080';

  const res = await fetch(`${API_URL}/api/tasks/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${session.idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: await res.text() },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const API_URL = process.env.API_URL || 'http://localhost:8080';

  const res = await fetch(`${API_URL}/api/tasks/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session.idToken}`,
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: await res.text() },
      { status: res.status }
    );
  }

  return new NextResponse(null, { status: 204 });
}
```

**File**: `frontend/app/api/tasks/[id]/comments/route.ts` (NEW)
```typescript
import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const API_URL = process.env.API_URL || 'http://localhost:8080';

  const res = await fetch(`${API_URL}/api/tasks/${id}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: await res.text() },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data, { status: 201 });
}
```

#### Phase F3: TaskDetailsPanel Component

**File**: `frontend/components/checklists/TaskDetailsPanel.tsx` (NEW, ~500 lines)

Key features:
- Slide-in animation from right
- Overlay background (semi-transparent)
- Fixed positioning (z-index above checklist)
- Responsive width (400px desktop, 100% mobile)
- Scroll for long content
- Auto-save with debounce (500ms)
- Optimistic updates
- Loading states
- Error handling

Structure:
```tsx
interface TaskDetailsPanelProps {
  taskId: string;
  checklistId: string; // For navigation context
  checklistName: string; // Pass from parent (avoids extra API call)
  checklistColor: string; // Pass from parent
  onClose: () => void;
  onTaskDeleted: () => void;
  onTaskUpdated: () => void;
}

Sections:
1. Header
   - Task icon + Parent checklist name (clickable)
   - ↑↓ navigation arrows
   - × close button

2. Title (inline editable)
   - Click to edit
   - Auto-save on blur
   - Character counter

3. Description
   - Textarea
   - Auto-save on blur
   - Character counter
   - "Add description..." placeholder

4. Status Selector
   - Button group: To do | Done
   - Colored backgrounds

5. Priority Selector
   - Button group: Low | Medium | High
   - Icon + text

6. Assignment
   - Dropdown with project members (fetch on panel open)
   - "Unassigned" as first option (to clear assignment)
   - Avatar + name display for assigned user

7. Deadline
   - Date picker (HTML5 input type="date" with native clear button)
   - Fallback: Add explicit "Clear" button for browsers without native clear

8. Comments Section
   - Header: "Comments (N)"
   - Scrollable list (max-height: 400px, overflow-y: auto)
   - Comments ordered oldest-first (conversation flow)
   - Each comment: Avatar/initials, Name, Relative time ("2h ago"), Text
   - Add comment: Textarea + Post button
   - Enter key submits (Shift+Enter for newline)
   - maxLength={2000} on comment textarea
   - Auto-scroll to bottom after posting new comment

9. Delete Button
   - Bottom of panel (scrollable, not sticky - prevents accidental delete)
   - Red outline button: `border: 1px solid #EF4444; color: #EF4444; background: white`
   - Hover: `background: #FEF2F2`
   - Confirmation: Radix AlertDialog (consistent with existing modals)

```

#### Phase F4: Update TaskRow Component

**File**: `frontend/components/checklists/TaskRow.tsx`

Changes:
```tsx
interface TaskRowProps {
  task: ChecklistTask;
  checklistColor: string;
  onStatusChange: () => void;
  onTaskClick: (taskId: string) => void; // NEW
}

// Add click handlers:
const handleRowClick = (e: React.MouseEvent) => {
  // Don't open panel if clicking checkbox
  if ((e.target as HTMLElement).closest('[data-checkbox]')) {
    return;
  }
  onTaskClick(task.id);
};

// Add "View →" button on hover
const [isHovering, setIsHovering] = useState(false);

return (
  <Row 
    onMouseEnter={() => setIsHovering(true)}
    onMouseLeave={() => setIsHovering(false)}
    onClick={handleRowClick}
  >
    <Checkbox data-checkbox ... />
    <TaskContent>
      <TitleRow>
        <TaskTitle $isDone={task.status === 'done'}>
          {task.title}
        </TaskTitle>
        {isHovering && <ViewButton>View →</ViewButton>}
      </TitleRow>
      {/* rest of content */}
    </TaskContent>
  </Row>
);
```

#### Phase F5: Update ChecklistCard Component

**File**: `frontend/components/checklists/ChecklistCard.tsx`

Add prop to handle task clicks:
```tsx
interface ChecklistCardProps {
  checklist: Checklist;
  expanded: boolean;
  onToggle: () => void;
  onTaskAdded: () => void;
  onTaskClick: (taskId: string) => void; // NEW
}

// Pass to TaskRow:
<TaskRow
  task={task}
  checklistColor={colorHex}
  onStatusChange={handleStatusChange}
  onTaskClick={onTaskClick} // NEW
/>
```

#### Phase F6: Update Checklists Page

**File**: `frontend/app/projects/[id]/checklists/page.tsx`

Add panel state management:
```tsx
const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

const handleTaskClick = (taskId: string) => {
  setSelectedTaskId(taskId);
};

const handlePanelClose = () => {
  setSelectedTaskId(null);
};

const handleTaskDeleted = () => {
  setSelectedTaskId(null);
  refreshChecklists(); // Refetch checklists
};

const handleTaskUpdated = () => {
  refreshChecklists(); // Refetch checklists
};

return (
  <>
    <PageLayout>
      {/* existing checklist content */}
    </PageLayout>
    
    {selectedTaskId && (
      <TaskDetailsPanel
        taskId={selectedTaskId}
        checklistId={getChecklistIdForTask(selectedTaskId)}
        checklistName={getChecklistNameForTask(selectedTaskId)}
        checklistColor={getChecklistColorForTask(selectedTaskId)}
        onClose={handlePanelClose}
        onTaskDeleted={handleTaskDeleted}
        onTaskUpdated={handleTaskUpdated}
      />
    )}
  </>
);
```

---

## UI/UX Design Specifications

### Panel Dimensions
- **Width**: 480px (desktop), 100% (mobile)
- **Position**: Fixed right, full height, z-index: 1001
- **Layout Pattern**: **Overlay** - Panel floats over content, checklist area does NOT shrink
- **Animation**: Slide in/out from right (200ms ease-out for both)
- **Overlay**: rgba(0, 0, 0, 0.3) backdrop, z-index: 1000, click to close

### Color System
**Status Colors**:
- To do: #E5E7EB (gray-200)
- Done: #10B981 (Sage Green)

**Priority Colors**:
- Low: #10B981 (Sage Green)
- Medium: #F59E0B (Amber)
- High: #E91E8C (Blush Pink)

### Typography
- **Panel title**: Plus Jakarta Sans, 18px, 600
- **Section labels**: DM Sans, 12px, 600, uppercase, #6B7280
- **Task title**: Plus Jakarta Sans, 20px, 600
- **Description**: DM Sans, 14px, #1F2937
- **Comments**: DM Sans, 14px
- **Meta text**: DM Sans, 12px, #6B7280

### Spacing
- **Section gaps**: 24px
- **Input padding**: 12px
- **Button padding**: 10px 16px
- **Panel padding**: 24px

### Interactive States
- **Buttons**: Hover background change, cursor pointer
- **Inputs**: Focus ring (#6366F1, 2px)
- **Disabled**: opacity 0.5, cursor not-allowed
- **Loading**: Spinner + dimmed background

---

## Implementation Sequence

### Phase 1: Backend Foundation (4 hours)
**B1**: DTOs (UpdateTaskRequest, CommentRequest)  
**B2**: Repository methods (findByIdWithDetails, findByChecklistIdOrderByDisplayOrder)  
**B3**: Service methods (getTaskDetails, updateTask, deleteTask, addComment)  
**B4**: Controller endpoints (GET, PUT, DELETE task, POST comment)  
**B5**: Test endpoints with curl/Postman

### Phase 2: Frontend API Layer (2 hours)
**F1**: API functions (getTask, updateTask, deleteTask, addComment)  
**F2**: Next.js route handlers (/api/tasks/[id], /api/tasks/[id]/comments)  
**F3**: Test API calls from browser console

### Phase 3: TaskDetailsPanel Component (8 hours)
**F3a**: Panel shell (layout, overlay, animations)  
**F3b**: Header (navigation, close button)  
**F3c**: Title editor (inline edit, auto-save)  
**F3d**: Description editor (textarea, auto-save)  
**F3e**: Status selector (button group)  
**F3f**: Priority selector (button group)  
**F3g**: Assignee dropdown (fetch project members)  
**F3h**: Deadline picker (date input)  
**F3i**: Comments list (display comments)  
**F3j**: Add comment (input + post button)  
**F3k**: Delete button (confirmation dialog)  
**F3l**: Navigation arrows (prev/next task)

### Phase 4: Integration (3 hours)
**F4**: Update TaskRow (click handler, "View →" button)  
**F5**: Update ChecklistCard (pass onTaskClick)  
**F6**: Update checklists page (panel state, open/close logic)  
**F7**: Test full flow (open, edit, comment, delete, navigate)

### Phase 5: Polish & Testing (3 hours)
**P1**: Loading states and error handling  
**P2**: Responsive design (mobile panel)  
**P3**: Keyboard shortcuts (Esc to close)  
**P4**: Accessibility (ARIA labels, focus management)  
**P5**: End-to-end testing  

**Total Estimate**: 20 hours

---

## Open Questions & Decisions

### Q1: Comment Order
**Question**: Display comments oldest-first or newest-first?  
**Options**:
- Oldest first (chat-like, natural conversation flow)
- Newest first (recent activity at top)

**Decision**: **Oldest first** (matches screenshot, preserves conversation flow)

### Q2: Auto-save Debounce
**Question**: How long to wait before auto-saving edits?  
**Options**:
- 500ms (responsive, more API calls)
- 1000ms (balanced)
- 2000ms (fewer calls, feels sluggish)

**Decision**: **1000ms** (balanced approach)

### Q3: Task Navigation Scope
**Question**: Should ↑↓ arrows navigate within:
- Same checklist only?
- All tasks across all checklists in project?

**Decision**: **Same checklist only** (matches screenshot context, simpler UX)

### Q4: Assignee Dropdown Population
**Question**: How to fetch project members for assignee dropdown?  
**Options**:
- Fetch on panel open (fresh data, API call delay)
- Pass from parent (no delay, may be stale)
- Cache in context (complex)

**Decision**: **Fetch on panel open** (ensures fresh member list)

### Q5: Delete Confirmation Style
**Question**: Confirmation dialog or inline confirmation?  
**Options**:
- Modal dialog (standard pattern)
- Inline "Are you sure?" with Yes/No buttons
- Radix AlertDialog (accessible, matches existing modals)

**Decision**: **Radix AlertDialog** (accessible, consistent with CreateProjectModal)

### Q6: Panel Close on Outside Click
**Question**: Should clicking overlay close panel?  
**Answer**: **Yes** (standard pattern, matches screenshot behavior)

### Q7: URL State Management
**Question**: Should selected task be reflected in URL?  
**Options**:
- Yes: `/projects/[id]/checklists?task=[taskId]` (shareable, back button works)
- No: Client-only state (simpler, faster)

**Decision**: **No URL state for v1** (faster implementation, can add in v2)

### Q8: Optimistic Updates
**Question**: Which updates should be optimistic?  
**Decisions**:
- ✅ Status toggle: Yes (already implemented in TaskRow)
- ❌ Comment post: **No** (wait for server confirmation, show loading state - safer than managing temp IDs and rollback)
- ❌ Task edit: No (wait for server confirmation, too many fields)
- ❌ Delete: No (show loading, close on success)

---

## Out of Scope (Phase 2 Features)

Explicitly deferred to future iterations:
- ❌ Task history/audit log
- ❌ Edit comment (only add/delete)
- ❌ Delete comment (UI only shows "delete" for comment author)
- ❌ Rich text editor for description (plain text only)
- ❌ File attachments
- ❌ Task dependencies
- ❌ @mentions in comments
- ❌ Email notifications
- ❌ Real-time updates (WebSocket)
- ❌ Task templates
- ❌ Bulk operations
- ❌ Drag-and-drop task reordering from panel
- ❌ Keyboard shortcuts (beyond Esc)
- ❌ Task duplication

---

## Testing Checklist

### Backend Tests
- [ ] GET /api/tasks/{taskId} returns full task with comments
- [ ] GET /api/tasks/{taskId} returns 404 for non-existent task
- [ ] GET /api/tasks/{taskId} returns 403 for non-member
- [ ] PUT /api/tasks/{taskId} updates all fields correctly
- [ ] PUT /api/tasks/{taskId} validates assignee is project member
- [ ] PUT /api/tasks/{taskId} requires EDITOR role
- [ ] DELETE /api/tasks/{taskId} removes task and comments (cascade)
- [ ] DELETE /api/tasks/{taskId} requires EDITOR role
- [ ] POST /api/tasks/{taskId}/comments creates comment
- [ ] POST /api/tasks/{taskId}/comments requires VIEWER role
- [ ] Validation errors return 400 with field details

### Frontend Tests
- [ ] Click task title opens panel
- [ ] Click "View →" button opens panel
- [ ] Click checkbox does NOT open panel
- [ ] Panel displays all task information
- [ ] Edit title auto-saves after 1 second
- [ ] Edit description auto-saves after 1 second
- [ ] Status selector updates task status
- [ ] Priority selector updates task priority
- [ ] Assignee dropdown shows project members
- [ ] Deadline picker updates task deadline
- [ ] Comments display chronologically
- [ ] Add comment posts and appears immediately
- [ ] Delete button shows confirmation dialog
- [ ] Confirm delete removes task and closes panel
- [ ] ↑ arrow navigates to previous task
- [ ] ↓ arrow navigates to next task
- [ ] Arrows disabled at first/last task
- [ ] × close button closes panel
- [ ] Esc key closes panel
- [ ] Click overlay closes panel
- [ ] Panel slides in/out smoothly
- [ ] Loading states show during saves
- [ ] Error messages display on failures
- [ ] Mobile: Panel takes full width

---

## Risk Assessment

### High Risk
1. **Performance**: Loading full task with comments may be slow
   - *Mitigation*: Use JOIN FETCH to avoid N+1, add database indexes
   
2. **Concurrency**: Two users editing same task simultaneously
   - *Mitigation*: Last-write-wins for v1, add optimistic locking in v2

### Medium Risk
3. **Auto-save conflicts**: Multiple fields editing at once
   - *Mitigation*: Debounce per field, merge updates on server

4. **Comment ordering**: Instant append may conflict with server order
   - *Mitigation*: Optimistic append with server reconciliation

### Low Risk
5. **Navigation edge cases**: Task order changes while panel open
   - *Mitigation*: Refetch checklist on task update

---

## Success Metrics

### Functional Completeness
- ✅ All 5 acceptance criteria scenarios pass
- ✅ All interaction rules work as specified
- ✅ No regressions in existing checklist features

### Performance
- Panel opens < 300ms (from task click to visible)
- Auto-save completes < 500ms (backend response time)
- Comment post completes < 500ms

### Code Quality
- Zero TypeScript errors
- Zero ESLint warnings
- Backend tests: >80% coverage for new service methods
- All APIs documented (Javadoc/JSDoc)

---

## Dependencies

### External Libraries
- ✅ Radix UI Dialog (already in package.json)
- ✅ styled-components (already in package.json)
- ✅ date-fns (already in package.json)

### Internal Dependencies
- ✅ ProjectAccessService (existing authorization)
- ✅ CurrentUserService (existing user resolution)
- ✅ ChecklistMapper (existing, may need updates)
- ❌ getMembers() API function (check if exists, add if not)

---

## Rollback Plan

If critical issues arise post-deployment:

1. **Backend rollback**: Remove new endpoints via controller comments
2. **Frontend rollback**: Hide TaskDetailsPanel via feature flag
3. **Database**: No schema changes, safe to rollback
4. **Fallback behavior**: Task clicks do nothing (or show "Coming soon" toast)

---

## Documentation Requirements

### For Developers
- Update `backend/ARCHITECTURE.md` with new endpoints
- Update `frontend/README.md` with panel usage
- Add JSDoc to TaskDetailsPanel props
- Add Javadoc to new service methods

### For Users
- Add "Task Details" section to user guide (if exists)
- Update screenshots in project README

---

## Final Notes

This plan follows the established patterns:
- ✅ Backend: Spring Boot layered architecture (controller → service → repository)
- ✅ Frontend: Next.js App Router with API routes
- ✅ Authorization: ProjectAccessService for all operations
- ✅ UI: styled-components matching existing design system
- ✅ Validation: Jakarta Validation on backend, client-side on frontend

The feature is scoped for a single sprint and can be implemented incrementally (backend first, then frontend components, then integration).

**Estimated Total Effort**: 20 hours  
**Recommended Assignee**: Fullstack developer with Spring Boot + React experience  
**Target Completion**: 1 week (allowing for testing and iteration)

