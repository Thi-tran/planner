---
status: completed
feature: Manage Categories Page
---

## Feature: Manage Categories Page

### Requirements Summary

- Add a "Manage categories" button in the calendar header (next to the view switcher)
- Clicking the button opens a dedicated category management modal
- Users can add, edit, and view all categories in one place
- Remove the inline "＋ New category" and edit functionality from `CategoryPicker` in the event modal
- `CategoryPicker` becomes a simple selector (read-only) — just picks from existing categories
- The dedicated management modal shows:
  - List of all categories with color dot + name
  - "＋ Add a new category" button at the bottom
  - Inline edit for each category (click edit icon to edit)
  - Category deletion is NOT implemented (out of scope, can be added in future)

---

### User Flow

**Current (buggy):**
1. User creates an event
2. Opens event modal → clicks "＋ New category"
3. Fills form, clicks Add → **nothing happens** (bug: promise not awaited, modal closes before save)
4. Category is lost

**New flow:**
1. User clicks "Manage categories" button in calendar header
2. Modal/page opens with full category list
3. User clicks "＋ Add a new category"
4. Inline form appears, user fills name + color, clicks Save
5. Category is saved and appears in the list immediately
6. User closes the management modal
7. When creating an event, the category picker shows the new category (read-only selector)

---

### Implementation Steps

#### Step 1: Create `ManageCategoriesModal` component
- **What:** A large modal dialog for managing categories
- **Where:** `frontend/components/calendar/ManageCategoriesModal.tsx`
- **How:**
  - Use `@radix-ui/react-dialog` for the modal
  - **Props Interface:**
    ```tsx
    interface ManageCategoriesModalProps {
      open: boolean;
      onClose: () => void;
      categories: Category[];
      onCreateCategory: (name: string, color: string) => Promise<void>;
      onUpdateCategory: (id: string, name: string, color: string) => Promise<void>;
    }
    ```
  - **State Management:**
    - `editingId: string | null` - tracks which category is being edited (only one at a time)
    - `showNewForm: boolean` - controls visibility of inline create form
    - `error: string` - displays error messages from failed API calls
    - Note: Opening edit for one category automatically cancels editing of others
  - **Layout:**
    - Header: "Manage Categories" title + close button (X)
    - Info banner: "Categories help you organize and color-code your events. Click the edit icon to change a category's name or color."
    - Scrollable list of categories (max-height with overflow-y: auto)
    - Each category row: color dot (14px) + name (truncated if > 200px) + edit icon button
    - Empty state: "No categories yet. Create your first one below!" (if categories.length === 0)
    - "＋ Add a new category" button at the bottom (opens inline form)
  - **Inline Create Form:**
    - Name input field (autoFocus, placeholder: "Category name")
    - 8 color swatches (reuse MiniSwatch pattern: 20px circles from CategoryPicker)
    - Default color: first color in EVENT_COLORS
    - Save button (disabled when invalid) + Cancel button
    - Appears above the "Add new category" button when active
  - **Inline Edit Form:**
    - Replaces the category row when editing
    - Pre-filled name input + color swatches showing current values
    - Save button + Cancel button
    - Cancel restores original values and exits edit mode
  - **Validation:**
    - Name: required, trim whitespace, 1-50 characters
    - Color: must be one of EVENT_COLORS (enforced by UI)
    - Disable Save button when name is empty or invalid
  - **Error Handling:**
    - Display error banner at top of modal (below info banner) for API failures
    - Show error message from API response
    - Clear error on next successful operation or modal close
  - **Loading States:**
    - Disable all inputs and buttons during save operations
    - Show "Saving..." text on Save button during mutation
    - Prevent modal close during active mutations
  - **Accessibility:**
    - When modal opens: focus on "＋ Add a new category" button (or first category if list is empty)
    - When inline form opens: autoFocus on name input
    - Escape key: close inline form if open, otherwise close modal
    - On modal close: return focus to "Manage categories" button in CalendarHeader
  - **Category Name Display:**
    - Use `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`
    - Max-width: 200px to prevent long names from breaking layout
    - No tooltip needed (users can edit to see full name)
  - **State Sync:**
    - Categories are passed as props from CalendarLayout
    - After successful create/update, onCreateCategory/onUpdateCategory handlers update CalendarLayout's category state
    - Both ManageCategoriesModal and EventModal receive updated categories automatically
    - No manual refresh needed (state flows down from parent)

#### Step 2: Add "Manage categories" button to `CalendarHeader`
- **What:** Add a button to open the category management modal
- **Where:** `frontend/components/calendar/CalendarHeader.tsx`
- **How:**
  - Add a new prop to `CalendarHeaderProps`: `onManageCategories: () => void`
  - **Exact Placement:** Render button inside the existing `<Header>` element, after the `<ViewSwitcher>` component (rightmost position)
  - **Button Structure:**
    ```tsx
    <ManageButton onClick={onManageCategories}>
      Manage categories
    </ManageButton>
    ```
  - **Styling:**
    - Match the secondary button style (like TodayButton)
    - Border: 1px solid #cbd5e1
    - Background: #fff
    - Padding: 6px 12px
    - Font-size: 14px
    - Border-radius: 6px
    - Hover state: background: #f8fafc
  - **Icon Decision:** No emoji/icon — just text for clarity and consistency

#### Step 3: Wire up `ManageCategoriesModal` in `CalendarLayout`
- **What:** Add state for the manage categories modal and connect all handlers
- **Where:** `frontend/components/calendar/CalendarLayout.tsx`
- **How:**
  - **Import:** Add `import ManageCategoriesModal from './ManageCategoriesModal';` at the top
  - **Add State:** `const [showManageCategories, setShowManageCategories] = useState(false);`
  - **Pass Handler to CalendarHeader:**
    ```tsx
    <CalendarHeader
      currentDate={currentDate}
      currentView={currentView}
      onDateChange={setCurrentDate}
      onViewChange={setCurrentView}
      onManageCategories={() => setShowManageCategories(true)}
    />
    ```
  - **Render ManageCategoriesModal:** Add after the `EventModal` component:
    ```tsx
    <ManageCategoriesModal
      open={showManageCategories}
      onClose={() => setShowManageCategories(false)}
      categories={categories}
      onCreateCategory={handleCreateCategory}
      onUpdateCategory={handleUpdateCategory}
    />
    ```
  - **Reuse Existing Handlers:** The existing `handleCreateCategory` and `handleUpdateCategory` already update the `categories` state after mutations, so both modals automatically receive fresh data
  - **Note:** No additional category refresh needed — state management is already correct

#### Step 4: Simplify `CategoryPicker` to read-only selector
- **What:** Strip down `CategoryPicker` to be a simple read-only category selector
- **Where:** `frontend/components/calendar/CategoryPicker.tsx`
- **How:**
  - **Update Props Interface:**
    ```tsx
    interface CategoryPickerProps {
      categories: Category[];
      selectedId: string | null;
      onSelect: (id: string | null) => void;
    }
    ```
  - **Remove Props:** `onCreateCategory`, `onUpdateCategory`
  - **Remove State:** `showNewForm`, `editingId`
  - **Remove Components:** Delete entire `InlineCreateForm` and `InlineEditForm` function components
  - **Remove UI Elements:**
    - Delete the "＋ New category" `AddButton`
    - Delete the edit icon (`EditIcon`) from each category row
    - Delete all related styled components: `MiniForm`, `MiniInput`, `MiniSwatches`, `MiniSwatch`, `MiniActions`, `MiniSaveBtn`, `MiniCancelBtn`
  - **Keep Only:**
    - `Container` with scrollable list
    - "None" option as first row
    - Category rows: color dot + name + checkmark (if selected)
    - Click handler to select category
    - Visual selected state (blue background + border)
    - Existing styled components: `Container`, `CategoryRow`, `ColorDot`, `CategoryName`, `Checkmark`
  - **Check for Tests:** Search for `CategoryPicker.test.tsx` or `CategoryPicker.spec.tsx` files
    - If tests exist, update them to remove assertions about create/edit functionality
    - If no tests exist, skip this substep

#### Step 5: Remove category mutation handlers from `EventModal`
- **What:** Update `EventModal` to use the simplified read-only `CategoryPicker`
- **Where:** `frontend/components/calendar/EventModal.tsx`
- **How:**
  - **Update Props Interface:**
    ```tsx
    interface EventModalProps {
      state: ModalState;
      onClose: () => void;
      onCreateEvent: (data: EventRequest) => Promise<void>;
      onUpdateEvent: (id: string, data: EventRequest) => Promise<void>;
      onDeleteEvent: (id: string) => Promise<void>;
      categories: Category[];
      // REMOVED: onCreateCategory
      // REMOVED: onUpdateCategory
    }
    ```
  - **Remove Props from Destructuring:**
    ```tsx
    export default function EventModal({
      state,
      onClose,
      onCreateEvent,
      onUpdateEvent,
      onDeleteEvent,
      categories,
      // onCreateCategory, ← DELETE
      // onUpdateCategory, ← DELETE
    }: EventModalProps) {
    ```
  - **Update CategoryPicker Usage:**
    ```tsx
    <CategoryPicker
      categories={categories}
      selectedId={categoryId}
      onSelect={(id) => setCategoryId(id)}
      // REMOVED: onCreateCategory={onCreateCategory}
      // REMOVED: onUpdateCategory={onUpdateCategory}
    />
    ```

#### Step 6: Stop passing mutation handlers to `EventModal` in `CalendarLayout`
- **What:** Update `EventModal` invocation to match the new simplified props
- **Where:** `frontend/components/calendar/CalendarLayout.tsx`
- **How:**
  - **Update EventModal JSX:**
    ```tsx
    <EventModal
      state={modalState}
      onClose={() => setModalState({ open: false })}
      onCreateEvent={createEvent}
      onUpdateEvent={updateEvent}
      onDeleteEvent={deleteEvent}
      categories={categories}
      // REMOVED: onCreateCategory={handleCreateCategory}
      // REMOVED: onUpdateCategory={handleUpdateCategory}
    />
    ```
  - **Keep Handlers:** Do NOT delete `handleCreateCategory` and `handleUpdateCategory` from CalendarLayout — they're still used by `ManageCategoriesModal`

---

### Dependencies & Prerequisites

**Execution Order:**
- Step 1 must complete before Step 3 (CalendarLayout imports ManageCategoriesModal)
- Step 4 must complete before Step 5 (EventModal uses simplified CategoryPicker)
- Step 5 must complete before Step 6 (CalendarLayout matches EventModal's new props)

**Independent Steps:**
- Step 2 can be done in parallel with Step 1 (CalendarHeader doesn't import the modal)
- Step 4 can be done in parallel with Steps 1-3

**Recommended Order:** 1 → 2 → 3 → 4 → 5 → 6

---

### Acceptance Criteria

✅ User can click "Manage categories" button in calendar header  
✅ Manage categories modal opens as a large dialog  
✅ User can create a new category (modal stays open after save)  
✅ User can edit an existing category inline (name and color)  
✅ Only one category can be edited at a time  
✅ Cancel button restores original values  
✅ Errors from API failures are displayed to user  
✅ Save button is disabled during mutations  
✅ EventModal's CategoryPicker has no create/edit UI  
✅ EventModal's CategoryPicker shows newly created categories immediately  
✅ All existing events still display with correct colors  
✅ Modal can be closed via X button or Escape key  
✅ Focus returns to "Manage categories" button after modal closes  
✅ Empty state message appears if no categories exist  
✅ Long category names are truncated with ellipsis  

---

### Out of Scope

- **Category deletion:** Not implemented in this plan (no backend DELETE endpoint, no UI). Can be added in future iteration.
- **Usage count display:** "N activities" requires new backend query (count events by category_id). Can be added later.
- **Drag-and-drop reordering:** Not needed for MVP.
- **Search/filter categories:** Not needed for MVP (small list).
- **Category icons/emojis:** Only color differentiation for now.

---

### Design Decisions

**Q: Should the "Manage categories" modal be a full page or a large dialog?**  
**A:** Large dialog (similar to EventModal) to keep calendar context visible.

**Q: Should the modal auto-close after adding a category?**  
**A:** No, stay open for bulk edits (common use case: setting up multiple categories at once).

**Q: Should we use an icon for the "Manage categories" button?**  
**A:** No icon — just text for clarity and consistency with existing button styles.
