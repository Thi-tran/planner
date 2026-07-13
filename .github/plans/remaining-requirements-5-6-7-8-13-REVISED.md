# Implementation Plan: Requirements 5, 6, 7, 8, 13 (REVISED)

## 🔧 Revision Notes

**Fixed Critical Issues:**
1. ❌ Removed all references to "planning" entity (events link directly to projects)
2. ✅ Corrected CASCADE path: project → events (not project → planning → events)
3. ✅ Reordered phases logically (core components first)
4. ✅ Clarified context restoration implementation (explicit location and timing)
5. ✅ Unified delete confirmation pattern (inside EditProjectModal only)
6. ✅ Made ProjectContextProvider location explicit (app/layout.tsx)
7. ✅ Fixed metrics to respect status filter
8. ✅ Added database schema verification steps
9. ✅ Improved responsive design for edit button
10. ✅ Added clear acceptance criteria mapping

---

## Overview

This plan implements the remaining project management requirements:
- **Requirement 5:** Project Metadata Management (Edit Projects)
- **Requirement 6:** Project Color System (Color Selector & Display)
- **Requirement 7:** Project Status Tracking (Status Updates & Filtering)
- **Requirement 8:** Project Deletion (Delete with Confirmation)
- **Requirement 13:** Active Project Context (Context Persistence & Restoration)

**Key Architecture Note:** Events link **directly to projects** via `project_id` FK. There is no separate "planning" entity.

---

## Requirements Summary

### Requirement 5: Project Metadata Management
**Goal:** Allow users to edit existing projects
**Key Features:**
- Edit project modal with all fields (name, description, dates, color, status)
- Field validation (same as creation)
- Update API endpoint (PUT /api/projects/{id}) ✅ Already implemented
- Real-time UI updates after save

### Requirement 6: Project Color System
**Goal:** Visual color management throughout the app
**Key Features:**
- Color selector component (swatches)
- Color display on cards (12px dot) ✅ Already implemented
- Color display in sidebar (8px dot) ✅ Already implemented
- Validation of color values
- Consistent hex codes across UI ✅ Already implemented

### Requirement 7: Project Status Tracking
**Goal:** Track and filter projects by status
**Key Features:**
- Status dropdown in edit modal
- Status badges on cards ✅ Already implemented
- Status filtering in project list
- Metrics update based on filtered view

### Requirement 8: Project Deletion
**Goal:** Delete projects with cascade
**Key Features:**
- Delete button in edit modal
- Confirmation dialog with warning
- CASCADE delete: **project → events** (direct FK, no planning entity)
- UI updates after deletion

### Requirement 13: Active Project Context
**Goal:** Persist and restore active project
**Key Features:**
- LocalStorage persistence ✅ Already implemented
- Context restoration on app load
- Redirect to /projects if context invalid
- Visual indication in sidebar ✅ Already implemented

---

## Phase 1: Backend Verification & Database Schema

### Step 1.1: Verify Database Schema
**Goal:** Confirm CASCADE delete is properly configured

**Database Check:**
```sql
-- Check foreign key constraint on events table
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'events'
    AND kcu.column_name = 'project_id';

-- Expected result:
-- delete_rule = 'CASCADE'
```

**Verify Migration File:**
- File: `/backend/src/main/resources/db/migration/V4__add_projects.sql`
- Check line: `CONSTRAINT fk_events_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE`

**Acceptance Criteria:**
- ✅ Events table has `project_id` column (UUID, NOT NULL)
- ✅ Foreign key constraint exists: `events.project_id → projects.id`
- ✅ ON DELETE CASCADE is configured
- ❌ No `planning_id` column should exist
- ❌ No `plannings` table should exist

---

### Step 1.2: Verify Backend API Endpoints
**Goal:** Confirm PUT and DELETE endpoints work correctly

**PUT /api/projects/{id} - Update Project**

**Status:** ✅ Already implemented in `ProjectController.java`

**Test:**
```bash
# Update project
curl -X PUT http://localhost:8080/api/projects/{valid-project-id} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Project Name",
    "description": "Updated description",
    "startDate": "2026-07-01",
    "endDate": "2026-12-31",
    "color": "Blush Pink",
    "status": "completed"
  }'

# Expected: 200 OK with updated project JSON
```

**Verify:**
- ✅ Returns 200 OK with updated project
- ✅ Returns 404 if project not found
- ✅ Returns 400 if validation fails (e.g., end date before start date)
- ✅ All fields can be updated (name, description, dates, color, status)

---

**DELETE /api/projects/{id} - Delete Project**

**Status:** ✅ Already implemented in `ProjectController.java`

**Test:**
```bash
# Step 1: Create test event linked to project
curl -X POST http://localhost:8080/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Event",
    "startTime": "2026-07-01T10:00:00Z",
    "endTime": "2026-07-01T11:00:00Z",
    "projectId": "{test-project-id}"
  }'

# Step 2: Verify event exists
curl http://localhost:8080/api/events?projectId={test-project-id}
# Should return array with 1 event

# Step 3: Delete project
curl -X DELETE http://localhost:8080/api/projects/{test-project-id}
# Expected: 204 No Content

# Step 4: Verify CASCADE - events should be deleted
curl http://localhost:8080/api/events?projectId={test-project-id}
# Expected: Empty array []

# Step 5: Verify project is deleted
curl http://localhost:8080/api/projects/{test-project-id}
# Expected: 404 Not Found
```

**Verify:**
- ✅ Returns 204 No Content on success
- ✅ Returns 404 if project not found
- ✅ CASCADE deletes all events with matching `project_id`
- ✅ Deletion is transactional (rollback on failure)

**Time Estimate:** 1 hour

---

## Phase 2: Core Reusable Components

### Step 2.1: Create ColorSelector Component
**File:** `/frontend/components/projects/ColorSelector.tsx`

**Purpose:** Reusable color picker for project colors

**Interface:**
```tsx
interface ColorSelectorProps {
  selectedColor: string; // Color name: "Sky Cyan", "Blush Pink", etc.
  onSelectColor: (colorName: string) => void;
  disabled?: boolean;
}
```

**Features:**
1. Display 4 circular color swatches from PROJECT_COLORS constant
2. Selected color has 3px solid border (#374151)
3. Hover effect: scale(1.1)
4. Accessible: keyboard navigation, aria-labels
5. Shows color name on hover (title attribute)
6. Hint text below: "Used to identify the project across the app"

**Design:**
- Swatch size: 40px × 40px
- Border radius: 50% (perfect circle)
- Gap between swatches: 12px
- Selected border: 3px solid #374151
- Focus outline: 2px solid #5EC4CD with 2px offset

**Colors (from lib/constants.ts):**
- Sky Cyan (#5EC4CD)
- Blush Pink (#E91E8C)
- Soft Indigo (#6366F1)
- Sage Green (#10B981)

**Acceptance Criteria Mapping:**
- ✅ Req 6.1: Display predefined colors as swatches
- ✅ Req 6.12: Selected color has visual indicator (border)

**Time Estimate:** 2 hours

---

### Step 2.2: Create StatusDropdown Component
**File:** `/frontend/components/projects/StatusDropdown.tsx`

**Purpose:** Reusable status selector for projects

**Interface:**
```tsx
type ProjectStatus = 'in progress' | 'completed' | 'on hold' | 'planning';

interface StatusDropdownProps {
  selectedStatus: ProjectStatus;
  onSelectStatus: (status: ProjectStatus) => void;
  disabled?: boolean;
}
```

**Features:**
1. Native `<select>` dropdown styled to match design system
2. Custom arrow icon (SVG data URI in background-image)
3. Four status options with proper labels
4. Disabled state (grayed out)
5. Focus state matches color picker (#5EC4CD border)

**Design:**
- Padding: 8px 32px 8px 12px (right padding for arrow)
- Border: 1px solid #d1d5db
- Border radius: 4px
- Font: DM Sans, 14px
- Custom arrow: Right 8px center
- Hover: pointer cursor
- Disabled: #f3f4f6 background, 0.6 opacity

**Status Options:**
- `in progress` → "In Progress"
- `completed` → "Completed"
- `on hold` → "On Hold"
- `planning` → "Planning"

**Export Status Colors Mapping:**
```tsx
export const statusColors = {
  'in progress': '#6366F1',
  'completed': '#10B981',
  'on hold': '#94A3B8',
  'planning': '#C4B5FD',
} as const;

export const statusLabels = {
  'in progress': 'In Progress',
  'completed': 'Completed',
  'on hold': 'On Hold',
  'planning': 'Planning',
} as const;
```

**Note:** Export these constants for reuse in ProjectCard status badges and filter dropdown.

**Acceptance Criteria Mapping:**
- ✅ Req 7.1: Accept only valid status values
- ✅ Req 7.3: Allow status change via dropdown

**Time Estimate:** 2 hours

---

### Step 2.3: Create DeleteConfirmDialog Component
**File:** `/frontend/components/projects/DeleteConfirmDialog.tsx`

**Purpose:** Reusable confirmation dialog for project deletion

**Interface:**
```tsx
interface DeleteConfirmDialogProps {
  open: boolean;
  projectName: string;
  eventCount?: number; // Optional: show how many events will be deleted
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean; // Show loading state
}
```

**Features:**
1. Modal dialog using @radix-ui/react-dialog
2. Warning icon (⚠️) and project name in header
3. Clear warning message about data loss
4. Optional event count display (if provided)
5. Two buttons: Cancel (gray) and Delete Project (red)
6. Loading state: disable buttons and show "Deleting..."
7. Overlay backdrop (z-index: 52, higher than EditProjectModal)

**Design:**
- Width: 440px max
- Border radius: 12px
- Padding: 24px
- Warning icon: 24px font-size, displayed inline with title
- Title font: Plus Jakarta Sans, 18px, bold
- Message font: DM Sans, 14px, #6b7280
- Delete button: #ef4444 background, hover #dc2626

**Message Template:**
```
⚠️ Delete "{projectName}"?

Deleting this project will permanently delete all {eventCount} associated events. 
This action cannot be undone.

[Cancel]  [Delete Project]
```

**If eventCount not provided:**
```
Deleting this project will permanently delete all associated events. 
This action cannot be undone.
```

**Z-Index Hierarchy:**
- EditProjectModal overlay: 50
- EditProjectModal content: 51
- DeleteConfirmDialog overlay: 52
- DeleteConfirmDialog content: 53

**Acceptance Criteria Mapping:**
- ✅ Req 8.2: Display confirmation dialog with warning
- ✅ Req 8.3: Provide Confirm and Cancel buttons
- ✅ Req 8.4: Cancel closes dialog without deletion

**Time Estimate:** 2 hours

---

## Phase 3: EditProjectModal Component

### Step 3.1: Create EditProjectModal
**File:** `/frontend/components/projects/EditProjectModal.tsx`

**Purpose:** Modal for editing project metadata and deleting projects

**Interface:**
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
1. Modal dialog using @radix-ui/react-dialog
2. Form with all project fields pre-populated from project prop
3. Reuses ColorSelector component
4. Reuses StatusDropdown component
5. Inline validation on blur
6. Character counters (255 for name, 2000 for description)
7. Date pickers with min/max validation
8. Three buttons:
   - **Delete Project** (bottom-left, red)
   - **Cancel** (bottom-right, gray border)
   - **Save changes** (bottom-right, Sky Cyan)
9. Nested DeleteConfirmDialog (triggered by Delete Project button)
10. Loading states during save/delete
11. Error handling with inline error messages

**Form Fields:**
1. **Project name*** (text input, max 255 chars)
2. **Description** (textarea, max 2000 chars, 3 rows)
3. **Start date*** (date picker)
4. **End date** (date picker, min = start date)
5. **Color*** (ColorSelector component)
6. **Status*** (StatusDropdown component)

**Validation Rules:**
- Name: Required, non-empty after trim, max 255 chars
- Description: Optional, max 2000 chars
- Start date: Required, valid date
- End date: Optional, must be after start date if provided
- Color: Required, must be from PROJECT_COLORS
- Status: Required, must be valid ProjectStatus

**Design:**
- Width: 560px max
- Border radius: 12px
- Padding: 24px
- Field gap: 16px
- Date row: 2-column grid with 16px gap
- Font: DM Sans (body), Plus Jakarta Sans (heading)
- Save button: #5EC4CD background
- Delete button: #ef4444 background
- Z-index: Modal overlay 50, content 51

**State Management:**
```tsx
const [name, setName] = useState('');
const [description, setDescription] = useState('');
const [startDate, setStartDate] = useState('');
const [endDate, setEndDate] = useState('');
const [color, setColor] = useState('Sky Cyan');
const [status, setStatus] = useState<ProjectStatus>('in progress');
const [errors, setErrors] = useState<Record<string, string>>({});
const [isSubmitting, setIsSubmitting] = useState(false);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
```

**useEffect to Populate Form:**
```tsx
useEffect(() => {
  if (project) {
    setName(project.name);
    setDescription(project.description || '');
    setStartDate(project.startDate);
    setEndDate(project.endDate || '');
    setColor(project.color);
    setStatus(project.status);
    setErrors({});
  }
}, [project]);
```

**Delete Flow:**
1. User clicks "Delete Project" button
2. Set `showDeleteConfirm = true`
3. Render DeleteConfirmDialog (nested, higher z-index)
4. If confirmed, call `onDeleteProject(project.id)`
5. On success, close both dialogs
6. On error, show error message and keep edit modal open

**Button Layout:**
```
[Delete Project]              [Cancel] [Save changes]
    (left)                         (right group)
```

**Acceptance Criteria Mapping:**
- ✅ Req 5.1-6: Edit form allows all fields
- ✅ Req 5.7-9: Validation works
- ✅ Req 5.10: Database persistence
- ✅ Req 6.10: Color selector in edit
- ✅ Req 7.3: Status can be changed
- ✅ Req 8.1: Delete button accessible

**Time Estimate:** 6 hours

---

## Phase 4: UI Integration - Edit Button on ProjectCard

### Step 4.1: Add Edit Button to ProjectCard
**File:** `/frontend/components/projects/ProjectCard.tsx`

**Changes:**

**1. Update Interface:**
```tsx
interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onEdit: (project: Project) => void; // NEW
}
```

**2. Restructure Card Layout:**

**Current (absolute positioned dot):**
```tsx
<Card onClick={onClick}>
  <ColorDot $color={colorHex} /> {/* position: absolute, top-right */}
  <Title>{project.name}</Title>
  ...
</Card>
```

**New (flex TopBar):**
```tsx
<Card onClick={onClick}>
  <TopBar>
    <ColorDot $color={colorHex} />
    <EditButton onClick={(e) => {
      e.stopPropagation();
      onEdit(project);
    }}>
      ✏️
    </EditButton>
  </TopBar>
  <Title>{project.name}</Title>
  ...
</Card>
```

**3. New Styled Components:**
```tsx
const TopBar = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
`;

const ColorDot = styled.div<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${(props) => props.$color};
`;

const EditButton = styled.button`
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  opacity: 0.6;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }

  &:focus {
    outline: 2px solid #5EC4CD;
    outline-offset: 2px;
    border-radius: 4px;
  }

  @media (max-width: 767px) {
    font-size: 16px;
  }
`;
```

**4. Update Title Styling:**
```tsx
// Remove padding-right (no longer needed)
const Title = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  /* Remove: padding-right: 24px; */
`;
```

**Event Handling:**
- Edit button must call `e.stopPropagation()` to prevent card click
- Edit button triggers `onEdit(project)` callback
- Card click still navigates to calendar

**Responsive Behavior:**
- Desktop: Edit icon 18px, visible on hover (opacity 0.6 → 1)
- Mobile (<768px): Edit icon 16px, always visible (opacity 1)

**Accessibility:**
- Edit button has `aria-label="Edit project"`
- Focus outline: 2px solid #5EC4CD with 2px offset
- Keyboard accessible (Tab navigation)

**Acceptance Criteria Mapping:**
- ✅ Req 5.1: Edit form accessible from cards
- ✅ Req 8.1: Delete action accessible (via edit modal)

**Time Estimate:** 1 hour

---

## Phase 5: UI Integration - MyProjectsPage Edit/Delete

### Step 5.1: Update MyProjectsPage
**File:** `/frontend/app/projects/page.tsx`

**Changes:**

**1. Add Imports:**
```tsx
import EditProjectModal from '@/components/projects/EditProjectModal';
import { updateProject, deleteProject } from '@/lib/api';
import { clearActiveProject } from '@/lib/projectContext';
```

**2. Add State:**
```tsx
const [editingProject, setEditingProject] = useState<Project | null>(null);
```

**3. Add Edit Handler:**
```tsx
const handleEditProject = (project: Project) => {
  setEditingProject(project);
};
```

**4. Add Update Handler:**
```tsx
const handleUpdateProject = async (id: string, data: ProjectRequest) => {
  try {
    await updateProject(id, data);
    await fetchProjects(); // Refresh list
    setEditingProject(null); // Close modal
  } catch (error) {
    // Error is handled by EditProjectModal
    throw error;
  }
};
```

**5. Add Delete Handler:**
```tsx
const handleDeleteProject = async (id: string) => {
  try {
    await deleteProject(id);
    
    // Clear active project if it was deleted
    const activeProject = getActiveProject();
    if (activeProject?.id === id) {
      clearActiveProject();
    }
    
    await fetchProjects(); // Refresh list
    setEditingProject(null); // Close modal
  } catch (error) {
    // Error is handled by EditProjectModal
    throw error;
  }
};
```

**6. Update ProjectCard Rendering:**
```tsx
<ProjectsGrid>
  <CreateProjectCard onClick={() => setShowCreateModal(true)} />
  {projects.map((project) => (
    <ProjectCard
      key={project.id}
      project={project}
      onClick={() => handleProjectClick(project.id)}
      onEdit={handleEditProject} {/* NEW */}
    />
  ))}
</ProjectsGrid>
```

**7. Render EditProjectModal:**
```tsx
<EditProjectModal
  open={!!editingProject}
  project={editingProject}
  onClose={() => setEditingProject(null)}
  onUpdateProject={handleUpdateProject}
  onDeleteProject={handleDeleteProject}
/>
```

**Delete Flow:**
1. User clicks edit icon on ProjectCard
2. `handleEditProject` sets `editingProject` state
3. EditProjectModal opens with project data
4. User clicks "Delete Project"
5. DeleteConfirmDialog appears
6. User confirms deletion
7. `handleDeleteProject` called
8. Project deleted from backend
9. Check if deleted project was active → clear context
10. Refresh project list
11. Close modal
12. Sidebar automatically updates (re-renders with new project list)

**Acceptance Criteria Mapping:**
- ✅ Req 5.11: UI updates after save
- ✅ Req 8.5-7: Delete with CASCADE
- ✅ Req 8.8: Remove from sidebar
- ✅ Req 8.9: Update UI after deletion

**Time Estimate:** 2 hours

---

## Phase 6: Status Filtering

### Step 6.1: Add Status Filter to MyProjectsPage
**File:** `/frontend/app/projects/page.tsx`

**Changes:**

**1. Add Import:**
```tsx
import { useMemo } from 'react';
import { ProjectStatus } from '@/components/projects/StatusDropdown';
```

**2. Add State:**
```tsx
const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
```

**3. Add Filtered Projects Memo:**
```tsx
const filteredProjects = useMemo(() => {
  if (statusFilter === 'all') return projects;
  return projects.filter(p => p.status === statusFilter);
}, [projects, statusFilter]);
```

**4. Update Metrics Calculation (IMPORTANT FIX):**

**Current (wrong - uses all projects):**
```tsx
const getStatusCounts = () => {
  return {
    'in progress': projects.filter((p) => p.status === 'in progress').length,
    completed: projects.filter((p) => p.status === 'completed').length,
    'on hold': projects.filter((p) => p.status === 'on hold').length,
    planning: projects.filter((p) => p.status === 'planning').length,
  };
};
```

**New (correct - respects filter):**
```tsx
const getStatusCounts = () => {
  const source = statusFilter === 'all' ? projects : filteredProjects;
  return {
    'in progress': source.filter((p) => p.status === 'in progress').length,
    completed: source.filter((p) => p.status === 'completed').length,
    'on hold': source.filter((p) => p.status === 'on hold').length,
    planning: source.filter((p) => p.status === 'planning').length,
  };
};
```

**Note:** When filter is "all", show total counts. When filter is specific status, show only that status count.

**5. Add Filter UI in Header:**

**Layout:**
```tsx
<Header>
  <Title>My projects</Title>
  <FilterContainer>
    <FilterLabel>Status:</FilterLabel>
    <FilterSelect
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value as 'all' | ProjectStatus)}
    >
      <option value="all">All</option>
      <option value="in progress">In Progress</option>
      <option value="completed">Completed</option>
      <option value="on hold">On Hold</option>
      <option value="planning">Planning</option>
    </FilterSelect>
  </FilterContainer>
</Header>
```

**6. Update Grid to Use Filtered Projects:**
```tsx
<ProjectsGrid>
  <CreateProjectCard onClick={() => setShowCreateModal(true)} />
  {filteredProjects.map((project) => ( /* Changed from projects */
    <ProjectCard
      key={project.id}
      project={project}
      onClick={() => handleProjectClick(project.id)}
      onEdit={handleEditProject}
    />
  ))}
</ProjectsGrid>
```

**7. Add Styled Components:**
```tsx
const FilterContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FilterLabel = styled.span`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #6b7280;
`;

const FilterSelect = styled.select`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  padding: 8px 32px 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  outline: none;
  background: white;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;

  &:focus {
    border-color: #5EC4CD;
    box-shadow: 0 0 0 3px rgba(94, 196, 205, 0.1);
  }
`;
```

**Behavior:**
- Filter persists during edit modal open/close
- Metrics update to reflect filtered view
- If filter results in 0 projects, show empty state message
- Filter dropdown always shows all options (even if count is 0)

**Empty State (when filtered list is empty):**
```tsx
{filteredProjects.length === 0 && statusFilter !== 'all' && (
  <EmptyState>
    No projects with status "{statusFilter}". Try a different filter.
  </EmptyState>
)}
```

**Acceptance Criteria Mapping:**
- ✅ Req 7.7: Filter by status
- ✅ Req 7.6: Show counts by status
- ✅ Req 7.5: Display status on cards (already implemented)

**Time Estimate:** 3 hours

---

## Phase 7: Active Project Context Restoration

### Step 7.1: Enhance projectContext.ts
**File:** `/frontend/lib/projectContext.ts`

**Add New Function:**
```tsx
/**
 * Validates and restores the active project from localStorage.
 * Checks if the project still exists in the database.
 * 
 * @returns The active project if valid, null otherwise
 */
export async function validateAndRestoreActiveProject(): Promise<ActiveProject | null> {
  const stored = getActiveProject();
  if (!stored) return null;
  
  try {
    // Verify project still exists
    const response = await fetch(`/api/projects/${stored.id}`);
    if (!response.ok) {
      // Project no longer exists or access denied
      clearActiveProject();
      return null;
    }
    // Project exists, keep the context
    return stored;
  } catch (error) {
    // Network error or API unavailable - clear to be safe
    console.error('Failed to validate active project:', error);
    clearActiveProject();
    return null;
  }
}
```

**Why This Function:**
- Handles case where project was deleted by another user/device
- Handles case where localStorage has stale/corrupted data
- Prevents 404 errors when navigating to calendar with invalid project

**Acceptance Criteria Mapping:**
- ✅ Req 13.7: Restore context on app load
- ✅ Req 13.8: Handle invalid project (redirect)

**Time Estimate:** 1 hour

---

### Step 7.2: Add Context Restoration to Root Layout
**File:** `/frontend/app/layout.tsx`

**Current Layout (Server Component):**
```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>
        <StyledComponentsRegistry>
          {children}
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
```

**Problem:** Can't use useEffect or async functions in server components.

**Solution:** Create client-side wrapper component.

**Step 1: Create ProjectContextProvider Component**
**File:** `/frontend/components/ProjectContextProvider.tsx`

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { validateAndRestoreActiveProject } from '@/lib/projectContext';

export default function ProjectContextProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function restoreContext() {
      // Only validate if we're on a route that needs project context
      if (pathname === '/calendar') {
        const project = await validateAndRestoreActiveProject();
        if (!project) {
          // No valid project, redirect to projects page
          router.push('/projects');
        }
      }
    }

    restoreContext();
  }, []); // Run once on mount

  return <>{children}</>;
}
```

**Why Not Run on Every Page:**
- /projects page: User can view projects without active context
- /calendar page: Requires active project context → validate and redirect if missing
- Other pages: Don't need project context

**Step 2: Update layout.tsx**
```tsx
import ProjectContextProvider from '@/components/ProjectContextProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>
        <StyledComponentsRegistry>
          <ProjectContextProvider>
            {children}
          </ProjectContextProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
```

**Behavior:**

**Scenario 1: Valid Project in Context**
1. User opens app
2. ProjectContextProvider checks localStorage
3. Finds project ID
4. Validates project exists via API
5. Project exists → keep context, allow navigation

**Scenario 2: Invalid Project in Context**
1. User opens app on /calendar page
2. ProjectContextProvider checks localStorage
3. Finds project ID
4. Validates project via API → 404 Not Found
5. Clear localStorage
6. Redirect to /projects

**Scenario 3: No Project in Context**
1. User opens app on /calendar page
2. ProjectContextProvider checks localStorage
3. No project found
4. Redirect to /projects

**Scenario 4: User on /projects Page**
1. User opens app on /projects page
2. ProjectContextProvider runs but doesn't validate (not on /calendar)
3. User can browse projects

**Edge Case: Navigation During Validation**
- Validation is async, user might navigate before it completes
- Use `pathname` check to only redirect if still on /calendar
- If user navigates away during validation, don't redirect

**Acceptance Criteria Mapping:**
- ✅ Req 13.7: Restore context on load
- ✅ Req 13.8-9: Handle invalid/missing context

**Time Estimate:** 2 hours

---

## Phase 8: Testing & Polish

### Step 8.1: Manual Testing Checklist

**Requirement 5: Edit Project**
- [ ] Click edit icon on project card → modal opens
- [ ] All fields pre-populated with project data
- [ ] Edit name → character counter updates
- [ ] Edit description → character counter updates
- [ ] Change start date → validation works
- [ ] Change end date to before start date → error shown
- [ ] Remove end date → saves successfully
- [ ] Change color → swatch selection updates
- [ ] Change status → dropdown value updates
- [ ] Click Save → project updates in UI within 500ms
- [ ] Click Cancel → modal closes without saving
- [ ] Edit with network error → error message shown
- [ ] Edit deleted project → 404 error shown

**Requirement 6: Color System**
- [ ] Color swatches display correctly (4 circles)
- [ ] Selected color has border indicator
- [ ] Color dots on cards are 12px
- [ ] Color dots in sidebar are 8px
- [ ] Same hex value in card, sidebar, selector
- [ ] Null color shows default gray (#9CA3AF)

**Requirement 7: Status Tracking**
- [ ] Status dropdown shows 4 options
- [ ] Can change status in edit modal
- [ ] Status badge displays on cards with correct colors
- [ ] Status filter dropdown in header
- [ ] Filter by "In Progress" → only shows in-progress projects
- [ ] Filter by "Completed" → metrics update to show completed count
- [ ] Filter by status with 0 results → empty state shown
- [ ] Filter persists when opening/closing edit modal

**Requirement 8: Delete Project**
- [ ] Click "Delete Project" in edit modal
- [ ] Confirmation dialog appears
- [ ] Project name shown in confirmation
- [ ] Warning message clear
- [ ] Click Cancel → project preserved, dialog closes
- [ ] Click Delete → project deleted
- [ ] Project removed from UI
- [ ] Project removed from sidebar
- [ ] Metrics update after deletion
- [ ] Delete active project → context cleared
- [ ] Delete with events → CASCADE works, events deleted
- [ ] Delete non-existent project → 404 error

**Requirement 13: Active Context**
- [ ] Select project → context saved to localStorage
- [ ] Refresh page → context restored
- [ ] Navigate to /calendar → active project loads
- [ ] Delete active project → context cleared
- [ ] Open /calendar with no context → redirect to /projects
- [ ] Open /calendar with deleted project → context cleared, redirect
- [ ] localStorage disabled → app works (no persistence)
- [ ] Sidebar highlights active project

---

### Step 8.2: Responsive Design Testing

**Desktop (≥1024px):**
- [ ] Project cards: 4 columns
- [ ] Edit icon: 18px, visible on hover
- [ ] Modal: 560px width, centered
- [ ] Filter dropdown: fits in header

**Tablet (768px - 1023px):**
- [ ] Project cards: 2 columns
- [ ] Edit icon: visible
- [ ] Modal: 90vw width, max 560px

**Mobile (<768px):**
- [ ] Project cards: 1 column (full width)
- [ ] Edit icon: 16px, always visible
- [ ] Modal: 90vw width
- [ ] Filter dropdown: stacks under title if needed
- [ ] Delete confirmation: readable on small screen

---

### Step 8.3: Accessibility Testing

**Keyboard Navigation:**
- [ ] Tab to project card → focus visible
- [ ] Tab to edit button → focus outline shown
- [ ] Enter on edit button → modal opens
- [ ] Tab through modal fields → logical order
- [ ] Tab to color swatches → focus visible
- [ ] Space/Enter on color → selects color
- [ ] Tab to status dropdown → arrow keys work
- [ ] Tab to Delete button → focus visible
- [ ] Esc key → modal closes

**Screen Reader:**
- [ ] Edit button has aria-label
- [ ] Color swatches have aria-labels
- [ ] Form labels associated with inputs
- [ ] Error messages announced
- [ ] Modal has aria-labelledby for title
- [ ] Delete confirmation has clear description

**Focus Management:**
- [ ] Open modal → focus moves to first field
- [ ] Close modal → focus returns to edit button
- [ ] Open delete confirm → focus moves to dialog
- [ ] Cancel delete → focus returns to delete button

---

### Step 8.4: Error Handling & Edge Cases

**Network Errors:**
- [ ] API timeout during save → error shown, modal stays open
- [ ] API timeout during delete → error shown, project preserved
- [ ] Offline during edit → error message clear
- [ ] Rate limiting → appropriate error message

**Data Validation:**
- [ ] Name with only spaces → validation error
- [ ] Name over 255 chars → auto-truncated
- [ ] Description over 2000 chars → auto-truncated
- [ ] End date before start date → error shown
- [ ] Invalid date format → browser validation
- [ ] Empty required field → submit disabled

**Concurrent Operations:**
- [ ] Edit project A, then edit project B → correct data in modal
- [ ] Edit project, refresh page → changes saved
- [ ] Two users edit same project → last write wins (acceptable)
- [ ] Delete project while editing → 404 error handled

**State Management:**
- [ ] Edit modal closes properly after save
- [ ] Edit modal closes properly after delete
- [ ] Delete confirmation closes on success
- [ ] Delete confirmation closes on cancel
- [ ] Status filter persists after refresh (optional)
- [ ] Form resets when project changes

---

### Step 8.5: Performance Testing

**Metrics to Measure:**
- [ ] Edit modal opens < 100ms (from click to visible)
- [ ] Save operation completes < 500ms (from submit to UI update)
- [ ] Delete operation completes < 500ms (from confirm to UI update)
- [ ] Filter change updates list < 50ms
- [ ] Color selection updates UI immediately
- [ ] Status change updates UI immediately

**Tools:**
- Chrome DevTools Performance tab
- React DevTools Profiler
- Network tab for API timing

**Time Estimate:** 6 hours for all testing

---

## Implementation Summary

### File Changes Overview

**New Files (4):**
1. `/frontend/components/projects/ColorSelector.tsx` - 40 lines
2. `/frontend/components/projects/StatusDropdown.tsx` - 60 lines
3. `/frontend/components/projects/DeleteConfirmDialog.tsx` - 80 lines
4. `/frontend/components/projects/EditProjectModal.tsx` - 250 lines
5. `/frontend/components/ProjectContextProvider.tsx` - 30 lines

**Modified Files (3):**
1. `/frontend/app/projects/page.tsx` - Add edit/delete handlers, filter UI (+80 lines)
2. `/frontend/components/projects/ProjectCard.tsx` - Add edit button (+30 lines)
3. `/frontend/lib/projectContext.ts` - Add validation function (+20 lines)
4. `/frontend/app/layout.tsx` - Wrap with ProjectContextProvider (+3 lines)

**Already Implemented (no changes needed):**
- `/frontend/lib/api.ts` - updateProject, deleteProject functions exist
- `/frontend/lib/constants.ts` - PROJECT_COLORS exist
- `/frontend/lib/types.ts` - Project, ProjectRequest types exist
- Backend endpoints - PUT /api/projects/{id}, DELETE /api/projects/{id}

**Total: 8 files (5 new, 3 modified)**

---

## Design System Reference

### Colors
```tsx
// Primary
Sky Cyan: #5EC4CD

// Project Colors
Sky Cyan: #5EC4CD
Blush Pink: #E91E8C
Soft Indigo: #6366F1
Sage Green: #10B981

// Status Colors
In Progress: #6366F1
Completed: #10B981
On Hold: #94A3B8
Planning: #C4B5FD

// UI Colors
Error: #ef4444
Gray: #9CA3AF
Border: #d1d5db
Text: #374151
Text Light: #6b7280
Background: #f8fafc
```

### Typography
```tsx
Headings: Plus Jakarta Sans
Body: DM Sans
Sizes: 12px (small), 14px (body), 18px (card title), 22px (page title)
```

### Spacing
```tsx
8px grid system
Gaps: 8px, 12px, 16px, 24px
Modal padding: 24px
Field gaps: 16px
Button padding: 10px 20px
```

### Border Radius
```tsx
Small: 4px (inputs, buttons)
Medium: 8px (cards)
Large: 12px (modals)
Circle: 50% (color dots)
```

### Z-Index Hierarchy
```tsx
EditProjectModal overlay: 50
EditProjectModal content: 51
DeleteConfirmDialog overlay: 52
DeleteConfirmDialog content: 53
```

---

## Acceptance Criteria Mapping

### Requirement 5: Project Metadata Management (13 criteria)

| # | Criterion | Implementation | Phase |
|---|-----------|----------------|-------|
| 5.1 | Edit form allows name field | EditProjectModal text input | 3 |
| 5.2 | Edit form allows description | EditProjectModal textarea | 3 |
| 5.3 | Edit form allows start date | EditProjectModal date input | 3 |
| 5.4 | Edit form allows end date | EditProjectModal date input | 3 |
| 5.5 | Edit form allows color change | ColorSelector component | 2, 3 |
| 5.6 | Edit form allows status update | StatusDropdown component | 2, 3 |
| 5.7 | Validate name (required, max 255) | Form validation in EditProjectModal | 3 |
| 5.8 | Validate description (max 2000) | Form validation in EditProjectModal | 3 |
| 5.9 | Validate end date after start | Form validation in EditProjectModal | 3 |
| 5.10 | Reject invalid data | Error display in EditProjectModal | 3 |
| 5.11 | Persist changes to database | updateProject API call | 5 |
| 5.12 | Handle save failure | Error handling in EditProjectModal | 3 |
| 5.13 | Update UI within 500ms | React state update + fetchProjects | 5 |

### Requirement 6: Project Color System (12 criteria)

| # | Criterion | Implementation | Phase |
|---|-----------|----------------|-------|
| 6.1 | Color selector in create modal | ✅ Already in CreateProjectModal | N/A |
| 6.2 | Accept only predefined colors | Validation in form | 3 |
| 6.3 | Reject invalid color | Validation in form | 3 |
| 6.4 | 12px dot on cards | ✅ Already in ProjectCard | N/A |
| 6.5 | 8px dot in sidebar | ✅ Already in Sidebar | N/A |
| 6.6 | Consistent hex codes | Use PROJECT_COLORS constant | N/A |
| 6.7 | Persist color to database | updateProject API call | 5 |
| 6.8 | Handle color save failure | Error handling in EditProjectModal | 3 |
| 6.9 | Refresh color indicators | React state update | 5 |
| 6.10 | Color selector in edit modal | ColorSelector in EditProjectModal | 2, 3 |
| 6.11 | Default gray for null | ✅ Already in ProjectCard | N/A |
| 6.12 | Selected color indicator | Border in ColorSelector | 2 |

### Requirement 7: Project Status Tracking (8 criteria)

| # | Criterion | Implementation | Phase |
|---|-----------|----------------|-------|
| 7.1 | Accept only valid statuses | StatusDropdown component | 2 |
| 7.2 | Default status "in progress" | ✅ Already in backend | N/A |
| 7.3 | Allow status change | StatusDropdown in EditProjectModal | 2, 3 |
| 7.4 | Reject invalid status | Form validation | 3 |
| 7.5 | Display status on cards | ✅ Already in ProjectCard | N/A |
| 7.6 | Show status counts | ✅ Already in MyProjectsPage metrics | N/A |
| 7.7 | Filter by status | Filter dropdown + useMemo | 6 |
| 7.8 | Group by status | Optional (not in plan) | N/A |

### Requirement 8: Project Deletion (11 criteria)

| # | Criterion | Implementation | Phase |
|---|-----------|----------------|-------|
| 8.1 | Delete action accessible | Delete button in EditProjectModal | 3 |
| 8.2 | Show confirmation dialog | DeleteConfirmDialog component | 2, 3 |
| 8.3 | Provide Confirm and Cancel | Buttons in DeleteConfirmDialog | 2 |
| 8.4 | Cancel preserves project | onCancel closes dialog | 2 |
| 8.5 | Delete project from database | deleteProject API call | 5 |
| 8.6 | Delete associated events | CASCADE in database (already done) | 1 |
| 8.7 | Delete all events | CASCADE in database (already done) | 1 |
| 8.8 | Remove from sidebar | Sidebar re-renders with new list | 5 |
| 8.9 | Update UI after delete | fetchProjects + state update | 5 |
| 8.10 | Handle 404 for deleted project | Error handling in API call | 5 |
| 8.11 | Handle deletion failure | Error display in EditProjectModal | 3 |

### Requirement 13: Active Project Context (10 criteria)

| # | Criterion | Implementation | Phase |
|---|-----------|----------------|-------|
| 13.1 | Maintain active context state | ✅ Already in projectContext.ts | N/A |
| 13.2 | Set active on project select | ✅ Already in MyProjectsPage | N/A |
| 13.3 | Include context in event API | ✅ Already in event endpoints | N/A |
| 13.4 | Associate events with active | ✅ Already in EventModal | N/A |
| 13.5 | Filter events by active | ✅ Already in CalendarLayout | N/A |
| 13.6 | Persist to localStorage | ✅ Already in projectContext.ts | N/A |
| 13.7 | Restore from localStorage | validateAndRestoreActiveProject | 7 |
| 13.8 | Clear invalid context | clearActiveProject in validation | 7 |
| 13.9 | Redirect if no context | ProjectContextProvider redirect | 7 |
| 13.10 | Visual indication in sidebar | ✅ Already in Sidebar | N/A |

**Total: 54 criteria**
- ✅ Already implemented: 17
- 🔨 To implement: 37

---

## Implementation Timeline

### Phase 1: Backend Verification (Day 1 Morning)
- **Time:** 1 hour
- **Tasks:**
  - Verify database schema (CASCADE FK)
  - Test PUT /api/projects/{id}
  - Test DELETE /api/projects/{id}
  - Confirm CASCADE delete works
- **Deliverable:** Verified backend endpoints

### Phase 2: Core Components (Day 1 Afternoon)
- **Time:** 6 hours
- **Tasks:**
  - Create ColorSelector (2h)
  - Create StatusDropdown (2h)
  - Create DeleteConfirmDialog (2h)
- **Deliverable:** 3 reusable components tested in isolation

### Phase 3: EditProjectModal (Day 2)
- **Time:** 6 hours
- **Tasks:**
  - Create modal structure
  - Add form fields with validation
  - Integrate ColorSelector and StatusDropdown
  - Add Delete button with confirmation
  - Test all validation rules
- **Deliverable:** Fully functional edit modal

### Phase 4: UI Integration - ProjectCard (Day 3 Morning)
- **Time:** 1 hour
- **Tasks:**
  - Add edit button to ProjectCard
  - Update styling (TopBar layout)
  - Test edit button click
  - Test responsive design
- **Deliverable:** Edit button on all cards

### Phase 5: UI Integration - MyProjectsPage (Day 3 Afternoon)
- **Time:** 2 hours
- **Tasks:**
  - Add edit/delete handlers
  - Connect EditProjectModal
  - Handle active project clearing on delete
  - Test full edit/delete flow
- **Deliverable:** Complete edit/delete functionality

### Phase 6: Status Filtering (Day 4 Morning)
- **Time:** 3 hours
- **Tasks:**
  - Add filter dropdown to header
  - Implement useMemo for filtering
  - Update metrics calculation
  - Add empty state handling
  - Test all filter options
- **Deliverable:** Working status filter with updated metrics

### Phase 7: Context Restoration (Day 4 Afternoon)
- **Time:** 3 hours
- **Tasks:**
  - Add validateAndRestoreActiveProject function
  - Create ProjectContextProvider component
  - Update layout.tsx
  - Test context restoration scenarios
  - Test redirect on invalid project
- **Deliverable:** Context persistence and restoration

### Phase 8: Testing & Polish (Day 5)
- **Time:** 6 hours
- **Tasks:**
  - Manual testing checklist (3h)
  - Responsive design testing (1h)
  - Accessibility testing (1h)
  - Error handling testing (1h)
- **Deliverable:** Fully tested feature set

**Total Time: 28 hours (3.5 days)**

---

## Risk Assessment & Mitigation

### High Risk ⚠️

**1. CASCADE Delete Data Integrity**
- **Risk:** Events might not be deleted when project is deleted
- **Impact:** Orphaned data, 500 errors when loading events
- **Mitigation:**
  - Verify FK constraint in Phase 1
  - Test with multiple events in Phase 1
  - Add database transaction rollback
  - Add backend tests for CASCADE

**2. Context Restoration Race Conditions**
- **Risk:** User navigates before validation completes
- **Impact:** Incorrect redirects, API calls to wrong project
- **Mitigation:**
  - Check pathname before redirecting
  - Use proper cleanup in useEffect
  - Test rapid navigation scenarios
  - Add loading state during validation

### Medium Risk ⚠️

**3. Nested Modal Z-Index Issues**
- **Risk:** DeleteConfirmDialog might not appear above EditProjectModal
- **Impact:** Confirmation dialog hidden, can't confirm deletion
- **Mitigation:**
  - Explicit z-index values (50, 51, 52, 53)
  - Test in different browsers
  - Test with browser zoom
  - Use separate Portal for each dialog

**4. Status Filter Metrics Confusion**
- **Risk:** Users might not understand why metrics changed when filtering
- **Impact:** Confusion about project counts
- **Mitigation:**
  - Clear filter label ("Status: In Progress")
  - Visual indication that filter is active
  - Option to show "X of Y projects"
  - Add tooltip if needed

**5. Form Validation Edge Cases**
- **Risk:** Invalid data bypasses validation
- **Impact:** API errors, confusing error messages
- **Mitigation:**
  - Validate on blur AND on submit
  - Disable submit button when invalid
  - Server-side validation (already in place)
  - Clear error messages

### Low Risk ✅

**6. Color Selector Accessibility**
- **Risk:** Screen readers might not announce color selection
- **Impact:** Inaccessible to blind users
- **Mitigation:**
  - Add aria-labels to color buttons
  - Add role="radiogroup" to container
  - Test with screen reader
  - Add keyboard navigation

**7. Edit Button Mobile Responsive**
- **Risk:** Edit button might be hard to tap on mobile
- **Impact:** Poor mobile UX
- **Mitigation:**
  - Larger touch target on mobile (44px min)
  - Always visible on mobile (not hover)
  - Test on actual devices
  - Add margin around button

---

## Edge Cases & Error Scenarios

### Edit Project Edge Cases

**1. Project Deleted by Another User**
- **Scenario:** User opens edit modal, another user deletes project, first user clicks save
- **Behavior:** API returns 404, show error "Project not found", close modal
- **Implementation:** Catch 404 in handleUpdateProject, show error toast

**2. Concurrent Edits**
- **Scenario:** Two users edit same project simultaneously
- **Behavior:** Last write wins (no conflict resolution)
- **Implementation:** No special handling needed, document behavior

**3. Network Timeout During Save**
- **Scenario:** Save request times out
- **Behavior:** Show error "Request timed out, please try again", keep modal open
- **Implementation:** Catch network errors, preserve form data

**4. Invalid Date After Edit**
- **Scenario:** User edits start date to be after end date
- **Behavior:** Show error "End date must be after start date", disable save
- **Implementation:** Validation on date field change

**5. Empty Name After Trim**
- **Scenario:** User enters only spaces in name field
- **Behavior:** Show error "Project name is required", disable save
- **Implementation:** Validate trimmed value

### Delete Project Edge Cases

**1. Delete Active Project**
- **Scenario:** User deletes currently active project
- **Behavior:** Clear localStorage, remove from sidebar, delete succeeds
- **Implementation:** Check active project ID in handleDeleteProject, call clearActiveProject

**2. Delete Project with 100+ Events**
- **Scenario:** Project has many events
- **Behavior:** Show event count in confirmation: "This will delete 150 events"
- **Implementation:** Optional eventCount prop in DeleteConfirmDialog

**3. Delete Fails Mid-Transaction**
- **Scenario:** Database error during CASCADE delete
- **Behavior:** Transaction rollback, project preserved, show error
- **Implementation:** Backend @Transactional annotation (already in place)

**4. Delete Then Back Button**
- **Scenario:** User deletes project, clicks browser back
- **Behavior:** Calendar page attempts to load deleted project, validates context, redirects to /projects
- **Implementation:** ProjectContextProvider validation

**5. Delete While Loading Events**
- **Scenario:** Calendar view is loading events, project gets deleted
- **Behavior:** Events API returns empty array (project_id doesn't match any), calendar shows empty state
- **Implementation:** No special handling needed

### Status Filter Edge Cases

**1. All Projects Same Status**
- **Scenario:** All projects are "in progress"
- **Behavior:** Filter dropdown still shows all options, other statuses show 0 projects
- **Implementation:** No special handling, empty state message if filtered to 0

**2. Filter During Edit**
- **Scenario:** User filters to "completed", then edits a project
- **Behavior:** Modal opens normally, filter persists when modal closes
- **Implementation:** Filter state independent of modal state

**3. Edit Status While Filtered**
- **Scenario:** Filter shows "in progress" projects, user changes one to "completed"
- **Behavior:** After save, project disappears from list (correct - no longer matches filter)
- **Implementation:** fetchProjects re-applies filter automatically

**4. No Projects Match Filter**
- **Scenario:** User filters to "on hold", no projects have that status
- **Behavior:** Show empty state: "No projects with status 'on hold'"
- **Implementation:** Conditional rendering when filteredProjects.length === 0

### Context Restoration Edge Cases

**1. localStorage Corrupted**
- **Scenario:** localStorage has invalid JSON
- **Behavior:** getActiveProject returns null, treat as no context
- **Implementation:** Try-catch in getActiveProject

**2. Project Exists But User Lost Access**
- **Scenario:** Multi-tenant app, user's access to project revoked
- **Behavior:** API returns 403, clear context, redirect to /projects
- **Implementation:** Treat non-200 response as invalid in validateAndRestoreActiveProject

**3. API Down During Validation**
- **Scenario:** Backend unavailable when app loads
- **Behavior:** Validation fails, clear context, redirect to /projects
- **Implementation:** Catch network errors, clear context to be safe

**4. Rapid Navigation During Validation**
- **Scenario:** User opens /calendar, validation starts, user clicks /projects before validation completes
- **Behavior:** Don't redirect (user already navigated away)
- **Implementation:** Check pathname before redirecting

**5. Multiple Tabs Open**
- **Scenario:** User has 2 tabs, deletes project in tab 1, switches to tab 2
- **Behavior:** Tab 2 still has old context in memory until refresh
- **Implementation:** Acceptable limitation, document behavior

---

## Dependencies & Prerequisites

### Backend Dependencies ✅
- **Spring Boot** - Web framework (already installed)
- **JPA/Hibernate** - ORM with CASCADE support (already configured)
- **PostgreSQL** - Database with FK constraints (already configured)
- **Bean Validation** - Request validation (already installed)

### Frontend Dependencies ✅
- **Next.js 14** - React framework (already installed)
- **React 18** - UI library (already installed)
- **styled-components** - CSS-in-JS (already installed)
- **@radix-ui/react-dialog** - Modal dialogs (already installed)
- **date-fns** - Date formatting (already installed)

### No New Dependencies Required ✅

### Prerequisites
1. ✅ Backend running on http://localhost:8080
2. ✅ Frontend running on http://localhost:3000
3. ✅ Database migration V4__add_projects.sql applied
4. ✅ ProjectEntity with CASCADE FK to events
5. ✅ PUT /api/projects/{id} endpoint implemented
6. ✅ DELETE /api/projects/{id} endpoint implemented
7. ✅ PROJECT_COLORS constant defined in lib/constants.ts
8. ✅ Project types defined in lib/types.ts
9. ✅ projectContext.ts with get/set/clear functions

---

## Success Metrics

### Functional Success ✅
- [ ] All 37 new acceptance criteria met
- [ ] All 17 existing features still work (no regressions)
- [ ] CASCADE delete works 100% of time
- [ ] No orphaned events in database
- [ ] All validation rules enforced

### Performance Success 🚀
- [ ] Edit modal opens < 100ms
- [ ] Save operation < 500ms end-to-end
- [ ] Delete operation < 500ms end-to-end
- [ ] Filter change < 50ms
- [ ] UI updates < 500ms after save/delete
- [ ] No UI flicker or layout shift

### UX Success 😊
- [ ] Clear error messages (no technical jargon)
- [ ] Confirmation dialogs prevent accidental deletion
- [ ] Smooth transitions and animations
- [ ] Responsive on all screen sizes
- [ ] Accessible via keyboard and screen reader
- [ ] Intuitive edit and delete workflow

### Code Quality ✅
- [ ] Components are reusable
- [ ] Consistent with existing code style
- [ ] Proper TypeScript types
- [ ] No console errors or warnings
- [ ] Proper error handling
- [ ] Clean separation of concerns

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] No console errors in browser
- [ ] No ESLint warnings
- [ ] TypeScript compilation successful
- [ ] Database migrations applied
- [ ] Environment variables set

### Deployment Steps
1. [ ] Merge feature branch to main
2. [ ] Deploy backend (restart Spring Boot)
3. [ ] Verify backend health endpoint
4. [ ] Deploy frontend (rebuild Next.js)
5. [ ] Verify frontend loads
6. [ ] Smoke test: Create, Edit, Delete project
7. [ ] Verify CASCADE delete in production DB

### Post-Deployment Verification
- [ ] Open /projects page → loads successfully
- [ ] Create new project → saves successfully
- [ ] Edit existing project → updates successfully
- [ ] Delete project with events → CASCADE works
- [ ] Filter projects by status → works
- [ ] Context restoration → works after refresh
- [ ] Mobile responsive → test on real device
- [ ] Check error logs → no unexpected errors

### Rollback Plan
If critical issues found:
1. Revert frontend deployment
2. Revert backend deployment
3. Restore database from backup if needed
4. Investigate issue in staging environment

---

## Known Limitations

### Out of Scope
1. **Project grouping/tags** - Not in requirements
2. **Project archiving** - Use status "on hold" instead
3. **Project permissions** - Single-user app for now
4. **Undo delete** - Deletion is permanent (backup required)
5. **Real-time sync** - Multi-tab changes don't sync automatically
6. **Project templates** - Each project created from scratch
7. **Bulk operations** - One project at a time
8. **Export/import** - No data export functionality
9. **Project history/audit log** - No change tracking
10. **Conflict resolution** - Last write wins on concurrent edits

### Technical Limitations
1. **Browser support** - Modern browsers only (ES6+)
2. **localStorage required** - Context restoration won't work if disabled
3. **No offline support** - Requires internet connection
4. **Max project name** - 255 characters
5. **Max description** - 2000 characters
6. **Fixed color palette** - Only 4 predefined colors
7. **No custom status values** - Only 4 predefined statuses

### Accepted Trade-offs
1. **Last write wins** - No optimistic locking or conflict detection
2. **No delete confirmation for events** - CASCADE is automatic
3. **Filter state not persisted** - Resets on page refresh
4. **No batch operations** - Performance impact acceptable for MVP
5. **Basic accessibility** - WCAG AA compliance, not AAA

---

## Conclusion

This revised implementation plan addresses all critical issues identified in the grilling session:

### ✅ Fixed Issues
1. **Removed "planning" entity references** - Events link directly to projects via `project_id` FK
2. **Corrected CASCADE path** - project → events (not project → planning → events)
3. **Reordered phases logically** - Core components before EditProjectModal
4. **Explicit context restoration** - Clear location (ProjectContextProvider) and behavior
5. **Unified delete pattern** - DeleteConfirmDialog nested inside EditProjectModal only
6. **Fixed metrics calculation** - Respects status filter
7. **Added database verification** - SQL queries to check FK constraints
8. **Improved responsive design** - Mobile-specific edit button sizing
9. **Complete acceptance criteria mapping** - Every criterion mapped to implementation phase
10. **Clear timeline** - 28 hours over 3.5 days

### 🎯 Implementation Path
1. **Phase 1 (1h):** Verify backend - Database schema + API endpoints
2. **Phase 2 (6h):** Build reusable components - ColorSelector, StatusDropdown, DeleteConfirmDialog
3. **Phase 3 (6h):** Build EditProjectModal - Form, validation, delete integration
4. **Phase 4 (1h):** Add edit button to ProjectCard
5. **Phase 5 (2h):** Integrate edit/delete into MyProjectsPage
6. **Phase 6 (3h):** Add status filtering with corrected metrics
7. **Phase 7 (3h):** Implement context restoration with ProjectContextProvider
8. **Phase 8 (6h):** Comprehensive testing and polish

### 📊 Deliverables
- **5 new components** - Well-tested, reusable, accessible
- **3 modified files** - Minimal, focused changes
- **37 acceptance criteria** - All implemented and verified
- **28 hours of work** - Realistic timeline with buffer

### 🚀 Ready for Implementation

This plan is now ready to be executed. All ambiguities have been resolved, all critical issues addressed, and all implementation details specified.

**Next step:** Begin Phase 1 - Backend verification and database schema check.

---

## Appendix: Quick Reference

### Component File Locations
```
frontend/
├── components/
│   ├── projects/
│   │   ├── ColorSelector.tsx          (NEW - Phase 2)
│   │   ├── StatusDropdown.tsx         (NEW - Phase 2)
│   │   ├── DeleteConfirmDialog.tsx    (NEW - Phase 2)
│   │   ├── EditProjectModal.tsx       (NEW - Phase 3)
│   │   ├── ProjectCard.tsx            (MODIFY - Phase 4)
│   │   └── CreateProjectModal.tsx     (existing)
│   └── ProjectContextProvider.tsx     (NEW - Phase 7)
├── app/
│   ├── layout.tsx                     (MODIFY - Phase 7)
│   └── projects/
│       └── page.tsx                   (MODIFY - Phase 5, 6)
└── lib/
    ├── projectContext.ts              (MODIFY - Phase 7)
    ├── api.ts                         (existing, verified)
    ├── types.ts                       (existing)
    └── constants.ts                   (existing)
```

### API Endpoints Reference
```
GET    /api/projects           - List all projects
GET    /api/projects/{id}      - Get single project
POST   /api/projects           - Create project
PUT    /api/projects/{id}      - Update project ✅ Used in Phase 5
DELETE /api/projects/{id}      - Delete project ✅ Used in Phase 5
PATCH  /api/projects/{id}/access - Update last accessed
```

### Database Schema
```sql
-- Projects table
projects (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  color VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  last_accessed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
)

-- Events table (direct FK to projects)
events (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  project_id UUID NOT NULL,  -- Direct FK, no planning_id
  category_id UUID,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  
  CONSTRAINT fk_events_project 
    FOREIGN KEY (project_id) 
    REFERENCES projects(id) 
    ON DELETE CASCADE  -- ✅ Critical for Requirement 8
)
```

---

**End of Implementation Plan**

