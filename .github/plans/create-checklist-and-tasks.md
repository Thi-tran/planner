# Feature Plan: Create Checklist and Add Tasks

**Feature**: Checklist and Task Creation  
**Status**: Planning  
**Date**: July 29, 2026

---

## Overview

This feature extends the existing view-only checklist system (Phase 1) to enable users to create new checklists and add tasks to existing checklists within a project.

**In Scope**:
- Create new checklist modal with name, description, color picker, and optional due date
- Add task modal within expanded checklist view
- Task creation with title, description, assignee, deadline, and priority
- Backend APIs for creating checklists and tasks
- Authorization checks (only EDITOR and OWNER roles can create)

**Out of Scope** (Phase 3):
- Checklist linking to events in planning/calendar
- Updating task status (already working via checkbox)
- Editing existing checklists
- Editing existing tasks
- Deleting checklists or tasks
- Reordering tasks

---

## Requirements

### Functional Requirements

#### FR1: Create Checklist Modal
- **FR1.1**: Modal accessible via "+ Create checklist" button on checklists page
- **FR1.2**: Modal requires checklist name (max 255 chars) - required field
- **FR1.3**: Modal accepts optional description (max 2000 chars)
- **FR1.4**: Modal includes color picker with 7 color options matching project colors
- **FR1.5**: Modal accepts optional due date (date picker, must be >= today)
- **FR1.6**: Modal validates all fields before submission
- **FR1.7**: Modal shows loading state during creation
- **FR1.8**: Modal closes on success and refreshes checklist list
- **FR1.9**: Modal shows error message on failure with retry option
- **FR1.10**: Modal can be closed/cancelled, clearing all fields

#### FR2: Add Task Modal
- **FR2.1**: Modal accessible via "+ Add task" button within expanded checklist
- **FR2.2**: Modal displays checklist name and color as context
- **FR2.3**: Modal requires task title (max 500 chars) - required field
- **FR2.4**: Modal accepts optional description (max 2000 chars)
- **FR2.5**: Modal includes assignee dropdown (project members only)
- **FR2.6**: Modal accepts optional deadline (date picker, no restrictions)
- **FR2.7**: Modal includes priority selector (Low, Medium, High)
- **FR2.8**: Modal validates all fields before submission
- **FR2.9**: Modal shows loading state during creation
- **FR2.10**: Modal closes on success and refreshes checklist (auto-expands)
- **FR2.11**: Modal shows error message on failure with retry option
- **FR2.12**: Modal can be closed/cancelled, clearing all fields

#### FR3: Authorization
- **FR3.1**: Users with project access can create checklists
- **FR3.2**: Users with project access can add tasks
- **FR3.3**: Backend validates user has access to the project
- **FR3.4**: API endpoints return 403 if user doesn't have project access

**Current Implementation**: 
- ✅ At this stage, every user is OWNER of their projects (no collaborators yet)
- ✅ Simple access check: if user can view project, they can create checklists/tasks
- ✅ Use existing `ProjectAccessService.requireRole(projectId, userId, Role.VIEWER)`

**Future Enhancement** (when collaborator feature is added):
- 🔮 Enforce EDITOR/OWNER role for create operations
- 🔮 VIEWER role users won't see create/add buttons
- 🔮 Update to use `Role.EDITOR` instead of `Role.VIEWER`

#### FR4: Data Persistence
- **FR4.1**: New checklists must be persisted to database
- **FR4.2**: New tasks must be persisted to database with display_order
- **FR4.3**: display_order for new tasks = max(existing orders) + 1
- **FR4.4**: Task status defaults to 'todo'
- **FR4.5**: Timestamps (created_at, updated_at) are set automatically

---

## Technical Design

### Database Schema

**Changes Required**: V11 migration adds new fields to support due dates, task titles, and priorities.

**Existing tables (V7)**:
- `checklists`: id, project_id, name, description, color, created_at, updated_at
- `checklist_tasks`: id, checklist_id, description, assigned_to, deadline, status, display_order, created_at, updated_at

**New fields (V11)**:
- `checklists.due_date`: DATE (optional)
- `checklist_tasks.title`: VARCHAR(500) NOT NULL (task title/name)
- `checklist_tasks.details`: TEXT (renamed from description, for task details)
- `checklist_tasks.priority`: VARCHAR(20) DEFAULT 'medium'

**Migration Strategy**:
1. Add new columns
2. Migrate existing data: `UPDATE checklist_tasks SET title = description`
3. Rename `description` to `details`
4. Add constraints

### Backend Implementation

#### 1. DTOs/Request Objects

**ChecklistRequest.java**
```java
package com.planner.domain;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ChecklistRequest {
    @NotBlank(message = "Checklist name is required")
    @Size(max = 255, message = "Name must not exceed 255 characters")
    private String name;

    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    private String description;

    @NotBlank(message = "Color is required")
    @Size(max = 50)
    private String color;

    private LocalDate dueDate; // Optional
}
```

**TaskRequest.java**
```java
package com.planner.domain;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class TaskRequest {
    @NotBlank(message = "Task title is required")
    @Size(max = 500, message = "Title must not exceed 500 characters")
    private String title;

    @Size(max = 2000, message = "Details must not exceed 2000 characters")
    private String details;  // Optional task details/description

    private UUID assignedTo; // Optional, must be project member

    private LocalDate deadline; // Optional

    private String priority; // "low", "medium", "high" - defaults to "medium"
}
```

**Note**: After V11 migration, `title` maps to `checklist_tasks.title` and `details` maps to `checklist_tasks.details`.

#### 2. Service Methods

**ChecklistService.java** - Add methods:

```java
@Transactional
public ChecklistResponse create(UUID projectId, ChecklistRequest request, UUID userId) {
    // 1. Validate project access (VIEWER is sufficient for now - user is OWNER)
    projectAccessService.requireRole(projectId, userId, Role.VIEWER);
    
    // 2. Load project
    ProjectEntity project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
    
    // 3. Create checklist entity
    ChecklistEntity checklist = new ChecklistEntity();
    checklist.setProject(project);
    checklist.setName(request.getName());
    checklist.setDescription(request.getDescription());
    checklist.setColor(request.getColor());
    checklist.setDueDate(request.getDueDate());
    
    // 4. Save and return
    ChecklistEntity saved = checklistRepository.save(checklist);
    return checklistMapper.toResponse(saved);
}

@Transactional
public ChecklistTask addTask(UUID checklistId, TaskRequest request, UUID userId) {
    // 1. Load checklist with project
    ChecklistEntity checklist = checklistRepository.findByIdWithProject(checklistId)
        .orElseThrow(() -> new ResourceNotFoundException("Checklist not found"));
    
    // 2. Validate project access (VIEWER is sufficient for now - user is OWNER)
    projectAccessService.requireRole(checklist.getProject().getId(), userId, Role.VIEWER);
    
    // 3. If assignedTo provided, validate they're a project member
    if (request.getAssignedTo() != null) {
        // Check membership exists
        membershipRepository.findByProjectIdAndUserId(
            checklist.getProject().getId(), 
            request.getAssignedTo()
        ).orElseThrow(() -> new BadRequestException("Assigned user is not a project member"));
    }
    
    // 4. Calculate display_order
    Integer maxOrder = checklistTaskRepository.findMaxDisplayOrder(checklistId);
    int displayOrder = (maxOrder != null) ? maxOrder + 1 : 0;
    
    // 5. Create task entity
    ChecklistTaskEntity task = new ChecklistTaskEntity();
    task.setChecklist(checklist);
    task.setTitle(request.getTitle());
    task.setDetails(request.getDetails());
    if (request.getAssignedTo() != null) {
        UserEntity assignee = userRepository.findById(request.getAssignedTo())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        task.setAssignedTo(assignee);
    }
    task.setDeadline(request.getDeadline());
    task.setPriority(request.getPriority() != null ? request.getPriority() : "medium");
    task.setStatus(TaskStatus.TODO);
    task.setDisplayOrder(displayOrder);
    
    // 6. Save and return (ChecklistMapper will map to ChecklistTask type)
    ChecklistTaskEntity saved = checklistTaskRepository.save(task);
    
    // Reload task with full associations for proper mapping
    saved = checklistTaskRepository.findByIdWithAssignee(saved.getId())
        .orElseThrow(() -> new ResourceNotFoundException("Task not found after creation"));
    
    return checklistMapper.taskToResponse(saved);
}
```

**Note**: 
- Returns `ChecklistTask` (frontend type = backend TaskResponse)
- Uses existing `ChecklistMapper` for task mapping
- Requires new dependencies: `projectRepository`, `userRepository`, `membershipRepository`

#### 3. Repository Methods

**ChecklistRepository.java** - Add:
```java
@Query("SELECT c FROM ChecklistEntity c JOIN FETCH c.project WHERE c.id = :id")
Optional<ChecklistEntity> findByIdWithProject(@Param("id") UUID id);
```

**ChecklistTaskRepository.java** - Add:
```java
@Query("SELECT MAX(t.displayOrder) FROM ChecklistTaskEntity t WHERE t.checklist.id = :checklistId")
Integer findMaxDisplayOrder(@Param("checklistId") UUID checklistId);

@Query("SELECT t FROM ChecklistTaskEntity t LEFT JOIN FETCH t.assignedTo WHERE t.id = :id")
Optional<ChecklistTaskEntity> findByIdWithAssignee(@Param("id") UUID id);
```

#### 4. Controller Endpoints

**ChecklistController.java** - Add methods:

```java
@PostMapping("/projects/{projectId}/checklists")
public ResponseEntity<ChecklistResponse> createChecklist(
        @PathVariable UUID projectId,
        @Valid @RequestBody ChecklistRequest request,
        @AuthenticationPrincipal Jwt jwt) {
    UserEntity user = currentUserService.resolveCurrentUser(jwt);
    ChecklistResponse response = checklistService.create(projectId, request, user.getId());
    return ResponseEntity.status(201).body(response);
}

@PostMapping("/checklists/{checklistId}/tasks")
public ResponseEntity<ChecklistTask> addTask(
        @PathVariable UUID checklistId,
        @Valid @RequestBody TaskRequest request,
        @AuthenticationPrincipal Jwt jwt) {
    UserEntity user = currentUserService.resolveCurrentUser(jwt);
    ChecklistTask task = checklistService.addTask(checklistId, request, user.getId());
    return ResponseEntity.status(201).body(task);
}
```

**Note**: Returns `ChecklistTask` (same as frontend type in lib/types.ts)

#### 5. Mapper & Entity Updates

**ChecklistEntity.java** - Add field:
```java
@Column(name = "due_date")
private LocalDate dueDate;
```

**ChecklistTaskEntity.java** - Add/modify fields:
```java
@Column(name = "title", nullable = false, length = 500)
private String title;

@Column(name = "details", columnDefinition = "TEXT")
private String details;  // Renamed from description

@Column(name = "priority", length = 20)
private String priority = "medium";
```

**ChecklistMapper.java** - Add method:
```java
public ChecklistTask taskToResponse(ChecklistTaskEntity entity) {
    // Map ChecklistTaskEntity to ChecklistTask DTO
    // Include: id, checklistId, title, details, assignedTo, assignedToUser, 
    //          deadline, priority, status, displayOrder, comments, timestamps
}
```

**Note**: Existing `ChecklistMapper` already maps checklists with tasks. Just add `taskToResponse()` method for single task creation.

---

### Frontend Implementation

#### 1. Types

**lib/types.ts** - Add request types:

```typescript
export interface ChecklistRequest {
  name: string;
  description?: string;
  color: string;
  dueDate?: string; // ISO date string (YYYY-MM-DD)
}

export interface TaskRequest {
  title: string;
  details?: string;  // Task description/details
  assignedTo?: string; // UUID
  deadline?: string; // ISO date string (YYYY-MM-DD)
  priority?: 'low' | 'medium' | 'high';
}
```

**Note**: Existing `ChecklistTask` type in lib/types.ts already has all fields needed (id, title, details, priority, etc.)

#### 2. API Functions

**lib/api.ts** - Add:

```typescript
export async function createChecklist(
  projectId: string,
  data: ChecklistRequest
): Promise<Checklist> {
  const res = await fetch(`/api/projects/${projectId}/checklists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create checklist: ${res.status}`);
  return res.json();
}

export async function addTask(
  checklistId: string,
  data: TaskRequest
): Promise<ChecklistTask> {
  const res = await fetch(`/api/checklists/${checklistId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to add task: ${res.status}`);
  return res.json();
}

export async function getProjectMembers(projectId: string): Promise<MembershipResponse[]> {
  const res = await fetch(`/api/projects/${projectId}/members`);
  if (!res.ok) throw new Error(`Failed to fetch members: ${res.status}`);
  return res.json();
}
```

#### 3. API Routes

**app/api/projects/[id]/checklists/route.ts** - Add POST handler:

```typescript
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToBackend(req, `/api/projects/${id}/checklists`, { method: 'POST' });
}
```

**app/api/checklists/[id]/tasks/route.ts** (new file):

```typescript
import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToBackend(req, `/api/checklists/${id}/tasks`, { method: 'POST' });
}
```

#### 4. Components

**components/checklists/CreateChecklistModal.tsx** (new):

Pattern: Follow `CreateProjectModal.tsx`

```typescript
interface CreateChecklistModalProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onCreateChecklist: (data: ChecklistRequest) => Promise<void>;
}

// Fields:
// - name (text input, required, max 255)
// - description (textarea, optional, max 2000)
// - color (color picker with 7 options)
// - dueDate (date picker, optional, min today)

// Validation:
// - Name required
// - Color required
// - Due date >= today if provided
```

**components/checklists/AddTaskModal.tsx** (new):

Pattern: Similar to CreateChecklistModal

```typescript
interface AddTaskModalProps {
  checklistId: string;
  checklistName: string;
  checklistColor: string;
  projectId: string;
  open: boolean;
  onClose: () => void;
  onAddTask: (data: TaskRequest) => Promise<void>;
}

// Header: Shows checklist name with colored left border

// Fields:
// - title (text input, required, max 500)
// - details (textarea, optional, max 2000) - labeled as "Description"
// - assignedTo (dropdown, optional, load from project members)
// - deadline (date picker, optional, no restrictions)
// - priority (button group: Low, Medium, High)

// Validation:
// - Title required
// - If assignedTo provided, must be valid project member
```

**components/checklists/ChecklistCard.tsx** - Modify:

Add "+ Add task" button that appears when checklist is expanded:

```typescript
{expanded && (
  <TasksSection>
    {checklist.tasks.map(task => <TaskRow key={task.id} task={task} />)}
    <AddTaskButton onClick={() => setShowAddTaskModal(true)}>
      + Add task
    </AddTaskButton>
  </TasksSection>
)}
```

**Note**: Consistent with existing pattern - no role-based conditional rendering until collaborator feature is added.

#### 5. Main Page Updates

**app/projects/[id]/checklists/page.tsx** - Modify:

Add:
- State for CreateChecklistModal
- Handler for createChecklist API call
- "+ Create checklist" button in header (no conditional rendering - consistent with rest of app)

```typescript
const [showCreateModal, setShowCreateModal] = useState(false);

const handleCreateChecklist = async (data: ChecklistRequest) => {
  if (!projectId) return;
  await createChecklist(projectId, data);
  await fetchData(); // Refresh list
};

// In JSX:
<Header>
  <Title>Checklists</Title>
  <CreateButton onClick={() => setShowCreateModal(true)}>
    + Create checklist
  </CreateButton>
</Header>

<CreateChecklistModal
  projectId={projectId}
  open={showCreateModal}
  onClose={() => setShowCreateModal(false)}
  onCreateChecklist={handleCreateChecklist}
/>
```

**Note**: Consistent with existing pattern in `app/projects/page.tsx` - no role-based conditional rendering until collaborator feature is added.

---

## UI/UX Design

### Create Checklist Modal

**Layout**:
```
[X Close]
New checklist

Checklist name *
[___________________]

Description
[___________________]
[___________________]
[___________________]

Color
○ ○ ○ ○ ○ ○ ○
(Sky Cyan, Blush Pink, Soft Indigo, Sage Green, Gold, Coral, Gray)
Used as the checklist color bar and progress indicator.

Due date (optional)
[____/_____/_______]

              [Cancel]  [+ Create checklist]
```

**Color Palette**: Use same 7 colors as projects
- Sky Cyan: #5EC4CD
- Blush Pink: #E91E8C
- Soft Indigo: #6366F1
- Sage Green: #10B981
- Gold: #F59E0B
- Coral: #F97316
- Gray: #6B7280

**Validation**:
- Name required
- Color required (default to first color)
- Due date >= today if provided

### Add Task Modal

**Layout**:
```
┃ Add task                                    [X Close]
┃ Pre-departure essentials
┃
┃ Task title *
┃ [___________________]
┃
┃ Description (optional)
┃ [___________________]
┃ [___________________]
┃
┃ Assigned to                  Deadline
┃ [Select member ▼]            [____/_____/_______]
┃
┃ Priority
┃ [ Low ]  [ Medium ]  [ High ]
┃
┃                       [Cancel]  [+ Add task]
```

**Left Border**: Colored bar matching checklist color (4px wide)

**Priority Selector**: Button group with:
- Low (Sage Green #10B981)
- Medium (Gold #F59E0B)
- High (Coral #EF4444)

**Validation**:
- Title required
- Assigned to must be valid project member if provided

### Checklist Card Updates

**Add Task Button** (appears when expanded):
```
[Existing tasks...]

+ Add task
```

**Style**: 
- Text button with "+" icon
- Gray color #6B7280
- Appears below task list
- Only visible to EDITOR and OWNER roles

---

## Implementation Steps

### Phase 2A: Database Migration

1. ✅ Create V11 migration script
2. ✅ Test migration on development database
3. ✅ Verify existing data migrated correctly
4. ✅ Verify constraints work

### Phase 2B: Backend (Create Checklist)

5. ✅ Update `ChecklistEntity.java` with dueDate field
6. ✅ Create `ChecklistRequest.java` DTO
7. ✅ Add repository dependencies to `ChecklistService`
8. ✅ Add `ChecklistService.create()` method
9. ✅ Add POST `/api/projects/{projectId}/checklists` endpoint
10. ✅ Test with Postman/curl

### Phase 2C: Backend (Add Task)

11. ✅ Update `ChecklistTaskEntity.java` with title, details, priority fields
12. ✅ Create `TaskRequest.java` DTO
13. ✅ Add `ChecklistRepository.findByIdWithProject()` method
14. ✅ Add `ChecklistTaskRepository.findMaxDisplayOrder()` method
15. ✅ Add `ChecklistTaskRepository.findByIdWithAssignee()` method
16. ✅ Add `ChecklistMapper.taskToResponse()` method
17. ✅ Add `ChecklistService.addTask()` method
18. ✅ Add POST `/api/checklists/{checklistId}/tasks` endpoint
19. ✅ Test with Postman/curl

### Phase 2D: Frontend (Create Checklist)

20. ✅ Add types `ChecklistRequest` to `lib/types.ts`
21. ✅ Add `createChecklist()` to `lib/api.ts`
22. ✅ Add POST handler to `app/api/projects/[id]/checklists/route.ts`
23. ✅ Create `CreateChecklistModal.tsx` component
24. ✅ Update `page.tsx` to show "+ Create checklist" button
25. ✅ Integrate modal with page
26. ✅ Test end-to-end

### Phase 2E: Frontend (Add Task)

27. ✅ Add types `TaskRequest` to `lib/types.ts`
28. ✅ Add `addTask()` and `getProjectMembers()` to `lib/api.ts`
29. ✅ Create `app/api/checklists/[id]/tasks/route.ts`
30. ✅ Create `AddTaskModal.tsx` component
31. ✅ Update `ChecklistCard.tsx` to show "+ Add task" button
32. ✅ Integrate modal with ChecklistCard
33. ✅ Test end-to-end

### Phase 2F: Polish & Testing

34. ✅ Add loading states
35. ✅ Add error handling
36. ✅ Test validation errors
37. ✅ Test with multiple tasks
38. ✅ Run `npm run build` and `npm run lint`
39. ✅ Manual QA testing

---

## Open Questions & Decisions

### ✅ Q1: Due Date for Checklists
**Decision**: Add V11 migration to include `due_date DATE` column in checklists table.

### ✅ Q2: Task Title vs Description
**Decision**: Add V11 migration to:
- Add `title VARCHAR(500)` for task name/title
- Rename `description` to `details` for task description/details

### ✅ Q3: Task Priority
**Decision**: Add V11 migration to include `priority VARCHAR(20)` column with constraint for low/medium/high values.

### ✅ Q4: Color Validation
**Decision**: Validate against fixed list of 7 colors (same as PROJECT_COLORS constant).

### Q5: ChecklistTask Type Updates
**Question**: Does existing `ChecklistTask` type in lib/types.ts need updates for new fields?

**Current fields**: id, checklistId, **description**, assignedTo, assignedToUser, deadline, status, displayOrder, comments

**New fields needed**: **title**, **details** (replacing description), **priority**

**Decision**: YES - Update required in Phase 2D, Step 27:

```typescript
export interface ChecklistTask {
  id: string;
  checklistId: string;
  title: string;  // NEW - replaces description as main field
  details: string | null;  // NEW - optional detailed description
  assignedTo: string | null;
  assignedToUser: UserSummary | null;
  deadline: string | null;
  priority: 'low' | 'medium' | 'high';  // NEW
  status: 'todo' | 'done';
  displayOrder: number;
  comments: TaskComment[];
  createdAt: string;
  updatedAt: string;
}
```

### Q6: Checklist Type Updates
**Question**: Does `Checklist` type need dueDate field?

**Decision**: YES - Add in Phase 2D, Step 20:

```typescript
export interface Checklist {
  id: string;
  projectId: string;
  name: string;
  description: string;
  color: string;
  dueDate: string | null;  // NEW - ISO date string (YYYY-MM-DD)
  tasks: ChecklistTask[];
  createdAt: string;
  updatedAt: string;
}
```

**Important**: After updating types, all existing Phase 1 components will need updates:
- `TaskRow.tsx`: Change `task.description` to `task.title`
- `ChecklistCard.tsx`: May need updates if displaying task details
- Any other components referencing task.description

---

## Testing Checklist

### Backend Tests

- [ ] POST /api/projects/{id}/checklists - success (authenticated user)
- [ ] POST /api/projects/{id}/checklists - 401 (unauthorized)
- [ ] POST /api/projects/{id}/checklists - 404 (project not found)
- [ ] POST /api/projects/{id}/checklists - 400 (validation errors)
- [ ] POST /api/checklists/{id}/tasks - success (authenticated user)
- [ ] POST /api/checklists/{id}/tasks - 401 (unauthorized)
- [ ] POST /api/checklists/{id}/tasks - 404 (checklist not found)
- [ ] POST /api/checklists/{id}/tasks - 400 (validation errors)
- [ ] POST /api/checklists/{id}/tasks - 400 (invalid assignee)
- [ ] Task display_order increments correctly

**Note**: Role-based tests (EDITOR/VIEWER) deferred until collaborator feature is implemented.

### Frontend Tests

- [ ] Create checklist modal opens/closes correctly
- [ ] Create checklist form validation works
- [ ] Create checklist success refreshes list
- [ ] Create checklist error shows message
- [ ] Add task modal opens/closes correctly
- [ ] Add task form validation works
- [ ] Add task success refreshes checklist
- [ ] Add task error shows message
- [ ] Color picker selects colors correctly
- [ ] Date pickers show correct format
- [ ] Assignee dropdown loads project members
- [ ] Priority selector highlights selected option
- [ ] Character counters update correctly
- [ ] Cancel button clears form
- [ ] Create buttons always visible (no role check)

**Note**: Role-based button visibility tests deferred until collaborator feature is implemented.

---

## Migration Scripts

### V11__add_checklist_and_task_fields.sql

```sql
-- Add due_date to checklists
ALTER TABLE checklists 
ADD COLUMN due_date DATE;

-- Add title and priority to checklist_tasks
ALTER TABLE checklist_tasks
ADD COLUMN title VARCHAR(500),
ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';

-- Migrate existing data: copy description to title
UPDATE checklist_tasks SET title = description WHERE title IS NULL;

-- Rename description column to details
ALTER TABLE checklist_tasks
RENAME COLUMN description TO details;

-- Make title NOT NULL after migration
ALTER TABLE checklist_tasks
ALTER COLUMN title SET NOT NULL;

-- Add constraint for priority
ALTER TABLE checklist_tasks
ADD CONSTRAINT chk__checklist_tasks__priority 
CHECK (priority IN ('low', 'medium', 'high'));

COMMENT ON COLUMN checklists.due_date IS 'Optional due date for the checklist';
COMMENT ON COLUMN checklist_tasks.title IS 'Short title/name of the task';
COMMENT ON COLUMN checklist_tasks.details IS 'Detailed description of the task';
COMMENT ON COLUMN checklist_tasks.priority IS 'Task priority: low, medium, high';
```

**Important**: This migration MUST be run BEFORE implementing Phase 2.

---

## Summary

This plan provides a complete roadmap for implementing checklist and task creation features with full database schema support.

**Key points**:

1. **V11 Migration Required**: Adds due_date, title, details (renamed), and priority fields
2. **No TaskMapper needed**: Use existing ChecklistMapper with new taskToResponse() method
3. **ChecklistTask = Task**: Same type used throughout (backend response = frontend type)
4. **Simple access control**: Use Role.VIEWER for now, upgrade to Role.EDITOR when collaborators added
5. **Validation**: Both frontend and backend validation with consistent error messages
6. **Error handling**: Comprehensive error messages and retry logic
7. **39 implementation steps**: Clear, sequential tasks starting with migration

**Estimated Effort**: 3-4 days for full implementation and testing

**Dependencies**: 
- V11 migration must run first
- Builds on Phase 1 (view checklists)

**Next Phase (Phase 3)**: 
- Edit/delete checklists and tasks
- Reorder tasks
- Link checklists to calendar events
- Role-based access (EDITOR/VIEWER distinction)
