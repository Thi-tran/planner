# Implementation Plan: Requirements 5, 6, 7, 8, 13

## Overview

This plan covers the implementation of the remaining project management requirements:
- **Requirement 5:** Project Metadata Management (Edit Projects)
- **Requirement 6:** Project Color System (Color Selector & Display)
- **Requirement 7:** Project Status Tracking (Status Updates & Filtering)
- **Requirement 8:** Project Deletion (Delete with Confirmation)
- **Requirement 13:** Active Project Context (Context Persistence & Restoration)

---

## Requirements Summary

### Requirement 5: Project Metadata Management
**Goal:** Allow users to edit existing projects
**Key Features:**
- Edit project modal with all fields (name, description, dates, color, status)
- Field validation (same as creation)
- Update API endpoint (PUT /api/projects/{id})
- Real-time UI updates after save

### Requirement 6: Project Color System
**Goal:** Visual color management throughout the app
**Key Features:**
- Color selector component (swatches)
- Color display on cards (12px dot) and sidebar (8px dot)
- Validation of color values
- Consistent hex codes across UI

### Requirement 7: Project Status Tracking
**Goal:** Track and filter projects by status
**Key Features:**
- Status dropdown in edit modal
- Status badges on cards
- Status filtering in project list
- Status grouping option

### Requirement 8: Project Deletion
**Goal:** Delete projects with cascade
**Key Features:**
- Delete button in edit modal and card
- Confirmation dialog with warning
- CASCADE delete (project → planning → events)
- UI updates after deletion

### Requirement 13: Active Project Context
**Goal:** Persist and restore active project
**Key Features:**
- LocalStorage persistence (already partially done)
- Context restoration on app load
- Redirect to /projects if context invalid
- Visual indication in sidebar (already done)

---

## Implementation Steps

### Phase 1: Backend - Edit & Delete Endpoints

#### Step 1.1: Verify PUT /api/projects/{id} Endpoint
**File:** `/backend/src/main/java/com/planner/controller/ProjectController.java`

**Current Status:** ✅ Already implemented in Step 8 of original plan

**Verification Needed:**
- Endpoint accepts: name, description, startDate, endDate, color, status
- Returns 200 OK with updated project
- Returns 404 if project not found
- Returns 400 if validation fails

#### Step 1.2: Verify DELETE /api/projects/{id} Endpoint
**File:** `/backend/src/main/java/com/planner/controller/ProjectController.java`

**Current Status:** ✅ Already implemented in Step 8 of original plan

**Verification Needed:**
- Returns 204 No Content on success
- Returns 404 if project not found
- CASCADE delete works (project → planning → events)

**Testing:**
```bash
# Test DELETE endpoint
curl -X DELETE http://localhost:8080/api/projects/{id}

# Verify cascade - check events are deleted
curl http://localhost:8080/api/events?projectId={id}
# Should return empty array
```

---

### Phase 2: Frontend - Edit Project Modal

#### Step 2.1: Create EditProjectModal Component
**File:** `/frontend/components/projects/EditProjectModal.tsx`

**Structure:**
```tsx
interface EditProjectModalProps {
  open: boolean;
  project: Project | null;
  onClose: () => void;
  onUpdateProject: (id: string, data: ProjectRequest) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
}
```

**Features:**
1. Modal dialog (using @radix-ui/react-dialog)
2. Form with all project fields pre-populated
3. Color selector component
4. Status dropdown
5. Date pickers
6. Character counters (255 for name, 2000 for description)
7. Field validation (inline errors)
8. "Save" and "Cancel" buttons
9. "Delete Project" button (red, bottom-left)

**Validation Rules:**
- Name: Required, max 255 chars
- Description: Optional, max 2000 chars
- Start Date: Required
- End Date: Optional, must be after start date
- Color: Required, must be from allowed set
- Status: Required, must be from allowed set

**Design Specs:**
- Modal width: 560px
- Border radius: 12px
- Padding: 24px
- Font: DM Sans (body), Plus Jakarta Sans (heading)
- Gap between fields: 16px
- Save button: Sky Cyan (#5EC4CD)
- Delete button: Red (#ef4444)

#### Step 2.2: Create ColorSelector Component
**File:** `/frontend/components/projects/ColorSelector.tsx`

**Structure:**
```tsx
interface ColorSelectorProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
}
```

**Features:**
1. Display 4 color swatches in a row
2. Each swatch shows color + name
3. Selected color has border/checkmark indicator
4. Click to select
5. Accessible (keyboard navigation)

**Colors:**
- Sky Cyan (#5EC4CD)
- Blush Pink (#E91E8C)
- Soft Indigo (#6366F1)
- Sage Green (#10B981)

**Design:**
```
[ Sky Cyan ]  [ Blush Pink ]  [ Soft Indigo ]  [ Sage Green ]
   (selected)
```

- Swatch size: 40px × 40px
- Border radius: 8px
- Selected: 2px solid border (#3b82f6)
- Gap: 12px

#### Step 2.3: Create StatusDropdown Component
**File:** `/frontend/components/projects/StatusDropdown.tsx`

**Structure:**
```tsx
interface StatusDropdownProps {
  selectedStatus: ProjectStatus;
  onSelectStatus: (status: ProjectStatus) => void;
}

type ProjectStatus = 'in progress' | 'completed' | 'on hold' | 'planning';
```

**Features:**
1. Dropdown select with all 4 statuses
2. Status badges with colors
3. Click to change status

**Status Colors (from design):**
- In Progress: #6366F1 (Soft Indigo)
- Completed: #10B981 (Sage Green)
- On Hold: #94A3B8 (Slate Gray)
- Planning: #C4B5FD (Light Purple)

#### Step 2.4: Update ProjectCard to Trigger Edit
**File:** `/frontend/components/projects/ProjectCard.tsx`

**Changes:**
1. Add "Edit" button (icon or text)
2. Stop propagation on edit click (don't navigate to calendar)
3. Call `onEdit` prop callback

**Design:**
- Edit button: Top-right corner (near color dot)
- Icon: ✏️ or "Edit" text
- Show on hover or always visible
- Size: 24px × 24px

---

### Phase 3: Frontend - Delete Confirmation Dialog

#### Step 3.1: Create DeleteConfirmDialog Component
**File:** `/frontend/components/projects/DeleteConfirmDialog.tsx`

**Structure:**
```tsx
interface DeleteConfirmDialogProps {
  open: boolean;
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
}
```

**Features:**
1. Modal dialog with warning message
2. Project name displayed prominently
3. Warning text: "Deleting this project will permanently delete its planning and all associated events. This action cannot be undone."
4. Two buttons: "Cancel" (gray) and "Delete Project" (red)

**Design:**
- Width: 440px
- Border radius: 12px
- Padding: 24px
- Warning icon: ⚠️ (orange)
- Delete button: Red (#ef4444)
- Cancel button: Gray border

**Message Template:**
```
⚠️ Delete "{projectName}"?

Deleting this project will permanently delete its planning 
and all associated events. This action cannot be undone.

[Cancel]  [Delete Project]
```

---

### Phase 4: Frontend - Status Filtering

#### Step 4.1: Add Status Filter to MyProjectsPage
**File:** `/frontend/app/projects/page.tsx`

**Features:**
1. Status filter dropdown above metrics
2. Options: "All", "In Progress", "Completed", "On Hold", "Planning"
3. Filter projects by selected status
4. Update metrics based on filtered projects

**Design:**
```
My projects                    Status: [All ▾]

[Total: 10]  [In Progress: 3]  [Completed: 5]  ...
```

**Implementation:**
```tsx
const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');

const filteredProjects = useMemo(() => {
  if (statusFilter === 'all') return projects;
  return projects.filter(p => p.status === statusFilter);
}, [projects, statusFilter]);
```

---

### Phase 5: Frontend - Active Project Context

#### Step 5.1: Enhance Project Context Utilities
**File:** `/frontend/lib/projectContext.ts`

**Current Status:** ✅ Partially implemented (getActiveProject, setActiveProject, clearActiveProject)

**Enhancements Needed:**
1. Add validation function to check if project exists
2. Add restoration logic for app startup
3. Handle invalid/deleted projects

**New Functions:**
```tsx
export async function validateAndRestoreActiveProject(): Promise<ActiveProject | null> {
  const stored = getActiveProject();
  if (!stored) return null;
  
  try {
    // Verify project exists
    const response = await fetch(`/api/projects/${stored.id}`);
    if (!response.ok) {
      clearActiveProject();
      return null;
    }
    return stored;
  } catch {
    clearActiveProject();
    return null;
  }
}
```

#### Step 5.2: Add Context Restoration to App Layout
**File:** `/frontend/app/layout.tsx` or create `/frontend/components/ProjectContextProvider.tsx`

**Features:**
1. On app load, call `validateAndRestoreActiveProject()`
2. If valid project found, keep context
3. If invalid project, redirect to /projects
4. If no project, allow navigation (will redirect from calendar page)

**Implementation:**
```tsx
'use client';

export function ProjectContextProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    async function restoreContext() {
      const project = await validateAndRestoreActiveProject();
      if (!project && pathname === '/calendar') {
        router.push('/projects');
      }
    }
    restoreContext();
  }, []);
  
  return <>{children}</>;
}
```

---

### Phase 6: Frontend - UI Integration

#### Step 6.1: Update MyProjectsPage with Edit & Delete
**File:** `/frontend/app/projects/page.tsx`

**Changes:**
1. Add state for `editingProject`
2. Add state for `deletingProjectId`
3. Add handlers for edit, delete, confirm delete
4. Render EditProjectModal
5. Render DeleteConfirmDialog
6. Add status filter dropdown

**New State:**
```tsx
const [editingProject, setEditingProject] = useState<Project | null>(null);
const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
```

**New Handlers:**
```tsx
const handleEditProject = (project: Project) => {
  setEditingProject(project);
};

const handleUpdateProject = async (id: string, data: ProjectRequest) => {
  await updateProject(id, data);
  await fetchProjects();
  setEditingProject(null);
};

const handleDeleteClick = (projectId: string) => {
  setDeletingProjectId(projectId);
};

const handleConfirmDelete = async () => {
  if (!deletingProjectId) return;
  await deleteProject(deletingProjectId);
  await fetchProjects();
  setDeletingProjectId(null);
};
```

#### Step 6.2: Update ProjectCard with Edit Button
**File:** `/frontend/components/projects/ProjectCard.tsx`

**Changes:**
1. Add `onEdit` prop
2. Add edit button/icon
3. Stop propagation on edit click

**Props:**
```tsx
interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onEdit: (project: Project) => void;  // NEW
}
```

**Edit Button:**
```tsx
<EditButton onClick={(e) => {
  e.stopPropagation();
  onEdit(project);
}}>
  ✏️
</EditButton>
```

---

## File Structure Summary

### New Files (6)
1. `/frontend/components/projects/EditProjectModal.tsx` - Edit project form
2. `/frontend/components/projects/ColorSelector.tsx` - Color picker component
3. `/frontend/components/projects/StatusDropdown.tsx` - Status selector
4. `/frontend/components/projects/DeleteConfirmDialog.tsx` - Delete confirmation
5. `/frontend/components/ProjectContextProvider.tsx` - Context restoration (optional)

### Modified Files (5)
1. `/frontend/app/projects/page.tsx` - Add edit/delete handlers, status filter
2. `/frontend/components/projects/ProjectCard.tsx` - Add edit button
3. `/frontend/lib/projectContext.ts` - Add validation function
4. `/frontend/lib/api.ts` - Verify updateProject, deleteProject functions exist
5. `/frontend/app/layout.tsx` - Add context provider (if needed)

**Total: 11 files (6 new, 5 modified)**

---

## Design System Compliance

### Colors
- Primary (Sky Cyan): #5EC4CD
- Blush Pink: #E91E8C
- Soft Indigo: #6366F1
- Sage Green: #10B981
- Status - In Progress: #6366F1
- Status - Completed: #10B981
- Status - On Hold: #94A3B8
- Status - Planning: #C4B5FD
- Error: #ef4444
- Gray: #9CA3AF

### Typography
- Headings: Plus Jakarta Sans
- Body: DM Sans
- Font sizes: 14px (body), 16px (labels), 18px (headings)

### Spacing
- 8px grid system
- Modal padding: 24px
- Field gaps: 16px
- Button padding: 10px 20px

### Border Radius
- Small: 4px
- Medium: 8px
- Large: 12px

---

## API Endpoints Verification

### Existing Endpoints (Should Already Work)
1. ✅ `GET /api/projects` - List all projects
2. ✅ `GET /api/projects/{id}` - Get single project
3. ✅ `POST /api/projects` - Create project
4. ✅ `PUT /api/projects/{id}` - Update project (REQ 5)
5. ✅ `DELETE /api/projects/{id}` - Delete project (REQ 8)
6. ✅ `PATCH /api/projects/{id}/access` - Update access time

### Testing Commands
```bash
# Update project
curl -X PUT http://localhost:8080/api/projects/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "description": "Updated description",
    "startDate": "2026-07-01",
    "endDate": "2026-12-31",
    "color": "Blush Pink",
    "status": "completed"
  }'

# Delete project
curl -X DELETE http://localhost:8080/api/projects/{id}

# Verify cascade - events should be gone
curl http://localhost:8080/api/events?projectId={id}
```

---

## Implementation Order

### Phase 1: Core Components (Day 1)
1. Create ColorSelector component
2. Create StatusDropdown component
3. Create DeleteConfirmDialog component
4. Test components in isolation

### Phase 2: Edit Modal (Day 2)
1. Create EditProjectModal component
2. Wire up form validation
3. Connect to API
4. Test edit functionality

### Phase 3: Integration (Day 3)
1. Add edit button to ProjectCard
2. Add edit/delete handlers to MyProjectsPage
3. Connect EditProjectModal and DeleteConfirmDialog
4. Test full edit/delete flow

### Phase 4: Filtering & Context (Day 4)
1. Add status filter dropdown
2. Implement filter logic
3. Enhance projectContext.ts
4. Add context restoration logic
5. Test filtering and context restoration

### Phase 5: Testing & Polish (Day 5)
1. End-to-end testing
2. Error handling
3. Loading states
4. Visual polish
5. Responsive design

---

## Testing Checklist

### Requirement 5: Edit Project
- [ ] Edit button appears on project cards
- [ ] Clicking edit opens modal with pre-filled data
- [ ] Can edit name, description, dates, color, status
- [ ] Validation works (same as create)
- [ ] Save updates project in DB and UI
- [ ] Cancel closes modal without saving
- [ ] Error messages display for validation failures

### Requirement 6: Color System
- [ ] Color selector shows 4 swatches
- [ ] Selected color has indicator
- [ ] Color dots display on cards (12px)
- [ ] Color dots display in sidebar (8px)
- [ ] Same hex values throughout app
- [ ] Default gray for null colors

### Requirement 7: Status Tracking
- [ ] Status dropdown shows 4 options
- [ ] Status badges use correct colors
- [ ] Can change status in edit modal
- [ ] Status filter dropdown works
- [ ] Filtering updates project list
- [ ] Metrics update with filter

### Requirement 8: Delete Project
- [ ] Delete button in edit modal
- [ ] Confirmation dialog appears
- [ ] Cancel preserves project
- [ ] Confirm deletes project
- [ ] CASCADE deletes planning and events
- [ ] UI updates after deletion
- [ ] Sidebar removes deleted project

### Requirement 13: Active Context
- [ ] Context persists to localStorage
- [ ] Context restores on app load
- [ ] Invalid project redirects to /projects
- [ ] No context redirects from calendar
- [ ] Sidebar shows active project highlighted

---

## Edge Cases

### Edit Project
1. **Project deleted by another user:** Show 404 error, close modal
2. **Concurrent edits:** Last write wins (no conflict resolution)
3. **Network failure during save:** Show error, keep modal open
4. **Invalid date range:** Show validation error

### Delete Project
1. **Project has many events (>100):** Show count in confirmation
2. **Delete fails mid-cascade:** Rollback transaction, show error
3. **Project already deleted:** Show 404 error
4. **Network failure during delete:** Show error, don't update UI

### Status Filter
1. **All projects same status:** Other filter options still available
2. **Filter changes while editing:** Don't close modal
3. **No projects match filter:** Show empty state

### Active Context
1. **Project deleted while active:** Clear context, redirect to /projects
2. **LocalStorage disabled:** App works, but no persistence
3. **Invalid localStorage data:** Clear and start fresh
4. **Multiple tabs:** Changes in one tab don't sync to others (acceptable)

---

## Acceptance Criteria Summary

### Requirement 5 (10 criteria) ✅
1-6: Edit form allows all fields
7-9: Validation works correctly
10: Database persistence works
11: Display updates < 500ms (no specific implementation needed, React is fast)

### Requirement 6 (12 criteria) ✅
1-3: Color selector with validation
4-5: Dot sizes (12px cards, 8px sidebar)
6: Consistent hex codes
7-9: Color persistence and updates
10-12: Edit color selector, null handling, selection indicator

### Requirement 7 (8 criteria) ✅
1-4: Status validation and updates
5: Status display on cards
6: Status counts in metrics
7-8: Status filtering and grouping

### Requirement 8 (11 criteria) ✅
1-3: Delete action with confirmation
4: Cancel works
5-7: Delete + cascade
8-9: UI updates
10-11: Error handling

### Requirement 13 (10 criteria) ✅
1-2: Maintain and set active context
3-5: API requests use context
6-7: localStorage persistence and restoration
8-9: Invalid context handling
10: Visual indication (already implemented)

**Total: 51 acceptance criteria to implement**

---

## Dependencies

### Backend
- ✅ PUT /api/projects/{id} endpoint (already implemented)
- ✅ DELETE /api/projects/{id} endpoint (already implemented)
- ✅ CASCADE delete configured (already implemented)

### Frontend Libraries
- ✅ @radix-ui/react-dialog (already used)
- ✅ styled-components (already used)
- ✅ date-fns (already used)
- ✅ Next.js router (already used)

### New Dependencies
- None required

---

## Estimated Effort

### Backend
- Verification only: 1 hour (test endpoints)

### Frontend
- ColorSelector: 2 hours
- StatusDropdown: 2 hours
- DeleteConfirmDialog: 2 hours
- EditProjectModal: 6 hours
- ProjectCard edit button: 1 hour
- MyProjectsPage integration: 4 hours
- Status filtering: 3 hours
- Context restoration: 3 hours
- Testing & polish: 8 hours

**Total: ~32 hours (~4 days of development)**

---

## Risk Assessment

### Low Risk
- Color selector (straightforward UI)
- Status dropdown (similar to existing dropdowns)
- Edit button (simple addition)

### Medium Risk
- EditProjectModal (complex form with validation)
- Delete with confirmation (needs careful CASCADE testing)
- Status filtering (state management)

### High Risk
- Context restoration (async validation, error handling)
- CASCADE delete (data integrity critical)

### Mitigation
- Test CASCADE delete thoroughly with different data scenarios
- Add comprehensive error boundaries
- Implement rollback on partial failures
- Add loading states for async operations

---

## Success Metrics

### Functional
- ✅ All 51 acceptance criteria met
- ✅ No regressions in existing features
- ✅ CASCADE delete works 100% of the time

### Performance
- Edit modal opens < 100ms
- Save/delete operations < 500ms
- UI updates < 500ms after save

### UX
- No confusing error messages
- Clear confirmation dialogs
- Smooth transitions
- Responsive on all devices

---

## Conclusion

This plan provides a complete implementation guide for requirements 5, 6, 7, 8, and 13. The implementation is structured in phases to allow incremental development and testing. Most backend work is already complete, so focus is on frontend components and integration.

**Next Steps:**
1. Review and approve this plan
2. Begin Phase 1 (Core Components)
3. Test each phase before moving to next
4. Deploy and validate in production

**Ready for implementation!** 🚀
