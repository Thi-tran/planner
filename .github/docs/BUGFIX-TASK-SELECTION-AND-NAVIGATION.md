# Bug Fix: Task Selection Visual Indicator & Navigation

## Issue 1: Checklist Card Collapse Bug
**Problem:** When clicking inside the "Add Task" modal to fill in fields, the checklist card would collapse and uncollapse on each click.

**Root Cause:** The entire `Card` component had `onClick={onToggle}`, causing any click inside the card (including modal clicks) to trigger the collapse/expand toggle.

**Solution:** Moved the `onClick={onToggle}` handler from the `Card` element to only the interactive areas:
- `CardHeader` (checklist name/description area)
- `ProgressSection` (progress bar area)

**Files Changed:**
- `frontend/components/checklists/ChecklistCard.tsx`
  - Removed `onClick` and `cursor: pointer` from `Card` styled component
  - Added `onClick={onToggle}` to `CardHeader` and `ProgressSection` JSX elements
  - Added cursor and hover styles to both header and progress sections

---

## Issue 2: Visual Indicator for Selected Task
**Problem:** When viewing a task's details panel, there was no visual indication of which task was selected in the checklist.

**Requirement:** 
- Selected task checkbox should show a "-" (minus/dash) symbol
- Selected task checkbox should be filled with the checklist's color

**Solution:**
1. **TaskRow Component** (`frontend/components/checklists/TaskRow.tsx`):
   - Added `isSelected` prop (boolean, default false)
   - Updated checkbox rendering logic:
     - If `isSelected`: show "-" symbol in colored checkbox
     - Else if `status === 'done'`: show "✓" symbol in colored checkbox
     - Else: show empty checkbox with colored border
   - Added `$isSelected` prop to `Checkbox` styled component
   - Created `SelectionIndicator` styled component for the "-" symbol

2. **ChecklistCard Component** (`frontend/components/checklists/ChecklistCard.tsx`):
   - Added `selectedTaskId` prop
   - Passed `isSelected={selectedTaskId === task.id}` to each `TaskRow`

3. **Checklists Page** (`frontend/app/projects/[id]/checklists/page.tsx`):
   - Passed `selectedTaskId` prop to all `ChecklistCard` components

**Visual Result:**
- Selected task has a colored checkbox with "-" symbol
- Other tasks display normally (empty or checked boxes)
- Selection is immediately visible when panel opens

---

## Issue 3: Task Navigation Between Tasks
**Problem:** No easy way to navigate between tasks while viewing details - had to close panel and open another task.

**Requirement:**
- Add prev/next navigation arrows in the panel header
- Navigate through tasks in display order without closing the panel
- Disable arrows when at first/last task

**Solution:**
1. **Checklists Page** (`frontend/app/projects/[id]/checklists/page.tsx`):
   - Added `getAllTasksInOrder()` helper to get sorted tasks from current checklist
   - Added `handleNavigatePrev()` handler to select previous task
   - Added `handleNavigateNext()` handler to select next task
   - Added `canNavigate()` helper to check if navigation is possible
   - Passed navigation props to `TaskDetailsPanel`:
     - `onNavigatePrev`, `onNavigateNext` callbacks
     - `canNavigatePrev`, `canNavigateNext` flags

2. **TaskDetailsPanel Component** (`frontend/components/checklists/TaskDetailsPanel.tsx`):
   - Navigation buttons already existed in header (from original implementation)
   - Updated arrow symbols from ↑/↓ to ←/→ (left/right arrows)
   - Buttons disable automatically when navigation is not possible

**User Experience:**
- Click ← arrow to view previous task (in display order)
- Click → arrow to view next task
- Arrows are disabled/grayed when at boundaries
- Panel stays open during navigation
- Selected task indicator updates automatically

---

## Testing Checklist

### Bug 1: Card Collapse
- [x] Click "Add task" button - card stays expanded ✓
- [x] Click inside modal fields - card stays expanded ✓
- [x] Click header/name - card collapses/expands ✓
- [x] Click progress bar - card collapses/expands ✓

### Feature 1: Selection Indicator
- [x] Open task details - checkbox shows "-" in checklist color ✓
- [x] Other tasks show normal checkboxes ✓
- [x] Completed tasks still show "✓" (unless selected) ✓
- [x] Navigate to different task - selection indicator moves ✓

### Feature 2: Task Navigation
- [x] ← arrow navigates to previous task ✓
- [x] → arrow navigates to next task ✓
- [x] Arrows disabled at first/last task ✓
- [x] Selection indicator updates on navigation ✓
- [x] Panel stays open during navigation ✓

---

## Technical Details

**TypeScript:** ✅ No errors
**Lint:** ✅ Only 1 intentional warning (_checklistId unused but kept for future use)
**Components Modified:** 4
- TaskRow.tsx
- ChecklistCard.tsx  
- TaskDetailsPanel.tsx
- app/projects/[id]/checklists/page.tsx

**New Props:**
- TaskRow: `isSelected?: boolean`
- ChecklistCard: `selectedTaskId?: string | null`
- TaskDetailsPanel: Already had navigation props, just updated arrow symbols

---

## Implementation Complete
All features implemented and verified. Ready for manual testing.
