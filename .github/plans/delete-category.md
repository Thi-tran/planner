---
status: completed
feature: Delete Category
---

## Feature: Delete Category

### Requirements Summary

- Add a delete button next to the edit button in each category row in the Manage Categories Modal
- When a category is deleted, all events associated with that category should display with the default color (blue #3b82f6)
- Show confirmation dialog before deletion to prevent accidental deletions
- Handle errors gracefully if deletion fails

### Current Behavior

- Categories can be created and edited
- Database already has `ON DELETE SET NULL` constraint on `events.category_id`
- When category is deleted, events' `category_id` is automatically set to NULL
- `EventEntity.resolvedColor()` already returns default blue (#3b82f6) when category is null

### User Flow

**Happy Path:**
1. User opens "Manage categories" modal
2. User clicks delete button (🗑️) next to a category
3. Confirmation dialog appears: "Delete category 'Travel'? Events using this category will show the default color."
4. User confirms deletion
5. Category is removed from the list
6. Events previously using that category now show with default blue color
7. Success message appears briefly (optional)

**Error Path:**
1. User clicks delete button
2. Confirmation dialog appears
3. User confirms deletion
4. Backend returns error (e.g., database error)
5. Error message displays in the modal: "Failed to delete category: [error message]"
6. Category remains in the list

### Implementation Steps

#### Step 0: Install required dependency
- **What:** Install @radix-ui/react-alert-dialog package
- **Where:** Frontend root directory
- **How:**
  ```bash
  cd frontend
  npm install @radix-ui/react-alert-dialog
  ```
- **Why:** Step 4 requires AlertDialog for the confirmation dialog component

#### Step 1: Add delete method to CategoryService
- **What:** Implement business logic for category deletion
- **Where:** `backend/src/main/java/com/planner/service/CategoryService.java`
- **How:**
  ```java
  /**
   * Deletes a category by ID.
   * Events associated with this category will have their category_id set to NULL
   * automatically by the database ON DELETE SET NULL constraint.
   * 
   * @param id the UUID of the category to delete
   * @throws ResourceNotFoundException if the category does not exist
   */
  @Transactional
  public void delete(UUID id) {
      if (!repository.existsById(id)) {
          throw new ResourceNotFoundException("Category not found: " + id);
      }
      repository.deleteById(id);
  }
  ```
- **Note:** The `ON DELETE SET NULL` constraint in V2 migration automatically sets `category_id` to NULL for all events using this category

#### Step 2: Add DELETE endpoint to CategoryController
- **What:** Create DELETE endpoint in CategoryController
- **Where:** `backend/src/main/java/com/planner/controller/CategoryController.java`
- **How:**
  ```java
  /**
   * Deletes a category by ID.
   * Events associated with this category will have their category_id set to NULL
   * automatically by the database ON DELETE SET NULL constraint.
   * 
   * DELETE /api/categories/{id}
   *
   * @param id the UUID of the category to delete
   * @return 204 No Content on success
   * @throws ResourceNotFoundException if category not found (returns 404)
   */
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
      service.delete(id);
      return ResponseEntity.noContent().build();
  }
  ```
- **Error Responses:**
  - 204 No Content: Successful deletion
  - 404 Not Found: Category doesn't exist (handled by GlobalExceptionHandler)
  - 500 Internal Server Error: Database error (uses Spring Boot default error format)

#### Step 3: Add deleteCategory API function to frontend
- **What:** Add API client function for DELETE request
- **Where:** `frontend/lib/api.ts`
- **How:**
  ```typescript
  export async function deleteCategory(id: string): Promise<void> {
    return request<void>(`/api/categories/${id}`, { method: 'DELETE' });
  }
  ```
- **Error Handling:** The existing `request()` function already handles errors correctly:
  - Parses error response: `{ "error": "Category not found: <id>" }`
  - Throws Error with message for catch blocks to handle

#### Step 4: Create ConfirmDialog component
- **What:** Create a reusable confirmation dialog using Radix UI AlertDialog
- **Where:** `frontend/components/calendar/ConfirmDialog.tsx` (new file)
- **How:**
  ```typescript
  'use client';

  import React from 'react';
  import styled from 'styled-components';
  import * as AlertDialog from '@radix-ui/react-alert-dialog';

  interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    variant?: 'danger' | 'default';
    loading?: boolean;
  }

  export default function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    variant = 'default',
    loading = false,
  }: ConfirmDialogProps) {
    return (
      <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
        <AlertDialog.Portal>
          <Overlay />
          <Content>
            <AlertDialog.Title asChild>
              <Title>{title}</Title>
            </AlertDialog.Title>
            <AlertDialog.Description asChild>
              <Description>{description}</Description>
            </AlertDialog.Description>
            <Actions>
              <AlertDialog.Cancel asChild>
                <CancelButton disabled={loading}>{cancelText}</CancelButton>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <ConfirmButton
                  $variant={variant}
                  onClick={(e) => {
                    e.preventDefault();
                    onConfirm();
                  }}
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : confirmText}
                </ConfirmButton>
              </AlertDialog.Action>
            </Actions>
          </Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    );
  }

  const Overlay = styled(AlertDialog.Overlay)`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 102;
  `;

  const Content = styled(AlertDialog.Content)`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #fff;
    border-radius: 8px;
    padding: 24px;
    width: 400px;
    max-width: 90vw;
    z-index: 103;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  `;

  const Title = styled.h2`
    margin: 0 0 12px;
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
  `;

  const Description = styled.p`
    margin: 0 0 20px;
    font-size: 14px;
    color: #64748b;
    line-height: 1.5;
  `;

  const Actions = styled.div`
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  `;

  const CancelButton = styled.button`
    padding: 8px 16px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #fff;
    font-size: 14px;
    cursor: pointer;
    color: #374151;
    &:hover:not(:disabled) {
      background: #f8fafc;
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  const ConfirmButton = styled.button<{ $variant: 'danger' | 'default' }>`
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    background: ${({ $variant }) => ($variant === 'danger' ? '#ef4444' : '#3b82f6')};
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    &:hover:not(:disabled) {
      background: ${({ $variant }) => ($variant === 'danger' ? '#dc2626' : '#2563eb')};
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
  ```
- **Features:**
  - Uses `@radix-ui/react-alert-dialog` for accessibility (keyboard navigation, focus trap, ESC to close)
  - Variant 'danger': red confirm button (for destructive actions)
  - Variant 'default': blue confirm button
  - Loading prop: shows "Deleting..." text and disables buttons during operation
  - Focus management: Cancel button gets focus by default (safer for destructive actions)
  - Higher z-index (102-103) than ManageCategoriesModal (100-101) to appear on top

#### Step 5: Add delete button and handler to ManageCategoriesModal
- **What:** Add delete button next to edit button in category rows
- **Where:** `frontend/components/calendar/ManageCategoriesModal.tsx`
- **How:**
  - **Add Import:**
    ```typescript
    import ConfirmDialog from './ConfirmDialog';
    ```
  - **Update Props Interface:**
    ```typescript
    interface ManageCategoriesModalProps {
      open: boolean;
      onClose: () => void;
      categories: Category[];
      onCreateCategory: (name: string, color: string) => Promise<void>;
      onUpdateCategory: (id: string, name: string, color: string) => Promise<void>;
      onDeleteCategory: (id: string) => Promise<void>; // NEW
    }
    ```
  - **Add State:**
    ```typescript
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    ```
  - **Update useEffect (cleanup on modal close):**
    ```typescript
    useEffect(() => {
      if (open) {
        setEditingId(null);
        setShowNewForm(false);
        setError('');
        // NEW: Reset delete state
        setDeletingId(null);
        setShowConfirmDelete(false);
        setCategoryToDelete(null);
      }
    }, [open]);
    ```
  - **Add Handlers:**
    ```typescript
    async function handleDelete() {
      if (!categoryToDelete) return;
      setError('');
      setDeletingId(categoryToDelete.id);
      try {
        await onDeleteCategory(categoryToDelete.id);
        // Success: close dialog and clear state
        setShowConfirmDelete(false);
        setCategoryToDelete(null);
      } catch (err) {
        // Error: close dialog to show error in main modal
        setShowConfirmDelete(false);
        setError(err instanceof Error ? err.message : 'Failed to delete category');
      } finally {
        setDeletingId(null);
      }
    }

    function handleDeleteStart(category: Category) {
      setCategoryToDelete(category);
      setShowConfirmDelete(true);
    }
    ```
  - **Update CategoryRow (add ButtonGroup and delete button):**
    ```typescript
    <CategoryRow>
      <ColorDot $color={cat.color} />
      <CategoryName>{cat.name}</CategoryName>
      <ButtonGroup>
        <IconButton
          onClick={() => handleEditStart(cat.id)}
          title="Edit category"
          aria-label={`Edit ${cat.name}`}
        >
          <span aria-hidden="true">✏️</span>
        </IconButton>
        <DeleteIconButton
          onClick={() => handleDeleteStart(cat)}
          title="Delete category"
          aria-label={`Delete ${cat.name}`}
          disabled={deletingId === cat.id}
        >
          <span aria-hidden="true">🗑️</span>
        </DeleteIconButton>
      </ButtonGroup>
    </CategoryRow>
    ```
  - **Render ConfirmDialog (AFTER Content closing tag, BEFORE Dialog.Portal closing):**
    ```typescript
    </Content>
    <ConfirmDialog
      open={showConfirmDelete}
      onOpenChange={setShowConfirmDelete}
      title={`Delete category "${categoryToDelete?.name}"?`}
      description="Events in this category will continue to exist but will be shown in the default blue color."
      confirmText="Delete"
      cancelText="Cancel"
      variant="danger"
      loading={deletingId !== null}
      onConfirm={handleDelete}
    />
  </Dialog.Portal>
    ```
  - **Add/Update Styled Components:**
    ```typescript
    const ButtonGroup = styled.div`
      display: flex;
      gap: 4px;
      margin-left: auto; // Push buttons to the right
    `;

    // Rename EditIconButton to IconButton (shared base)
    const IconButton = styled.button`
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
      padding: 4px 6px;
      border-radius: 4px;
      opacity: 0.5;
      &:hover:not(:disabled) {
        opacity: 1;
        background: #e2e8f0;
      }
      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
    `;

    const DeleteIconButton = styled(IconButton)`
      &:hover:not(:disabled) {
        background: #fee2e2; // Light red on hover
      }
    `;
    ```
  - **Update existing EditIconButton usage:** Rename all `EditIconButton` references to `IconButton` in the JSX

#### Step 6: Wire up delete handler in CalendarLayout
- **What:** Connect delete functionality to API and refresh data
- **Where:** `frontend/components/calendar/CalendarLayout.tsx`
- **How:**
  - **Import (update existing import):**
    ```typescript
    import { getCategories, createCategory, updateCategory, deleteCategory } from '../../lib/api';
    ```
  - **Add Handler:**
    ```typescript
    async function handleDeleteCategory(id: string) {
      await deleteCategory(id);
      const updated = await getCategories();
      setCategories(updated);
      // Refetch events to show updated colors immediately
      refetch();
    }
    ```
  - **Pass to Modal:**
    ```typescript
    <ManageCategoriesModal
      open={showManageCategories}
      onClose={() => setShowManageCategories(false)}
      categories={categories}
      onCreateCategory={handleCreateCategory}
      onUpdateCategory={handleUpdateCategory}
      onDeleteCategory={handleDeleteCategory}
    />
    ```
- **Why refetch():** Without refetching events, users won't see color changes until they navigate away and back. The refetch() ensures events immediately display with default blue color after category deletion.

---

### Dependencies & Prerequisites

**Execution Order:**
- Step 0 must complete first (install dependency required for Step 4)
- Step 1 must complete before Step 2 (CategoryController depends on CategoryService.delete())
- Step 2 must complete before Step 3 (frontend API calls backend endpoint)
- Step 3 must complete before Step 6 (CalendarLayout uses deleteCategory API function)
- Step 4 can be done in parallel with Steps 1-3 (independent component)
- Step 5 depends on Step 4 (ManageCategoriesModal imports ConfirmDialog)
- Step 5 must complete before Step 6 (CalendarLayout passes handler to modal)

**Recommended Order:** 0 → 1 → 2 → 3 → 4 → 5 → 6

**Why this order:**
1. Install dependency first (needed for Step 4)
2. Implement backend service layer (business logic)
3. Implement backend controller layer (API endpoint)
4. Implement frontend API client (calls backend)
5. Create reusable confirmation dialog component
6. Add delete functionality to modal (uses dialog)
7. Wire up handler in parent component (connects everything)

---

### Acceptance Criteria

✅ Delete button appears next to edit button in each category row  
✅ Clicking delete button shows confirmation dialog  
✅ Confirmation dialog shows category name and warning message  
✅ Canceling confirmation closes dialog without deleting  
✅ Confirming deletion removes category from list  
✅ Events using deleted category display with default blue color  
✅ Delete button is disabled during deletion operation  
✅ Error message displays if deletion fails  
✅ Backend returns 204 No Content on successful deletion  
✅ Backend returns 404 if category doesn't exist  
✅ Database constraint automatically sets `category_id` to NULL for affected events  

---

### Technical Notes

**Database Behavior:**
- The `ON DELETE SET NULL` constraint in V2 migration handles event updates automatically:
  ```sql
  ALTER TABLE events
      ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
  ```
- No manual update of events table needed in the backend

**Frontend Color Resolution:**
- `EventEntity.resolvedColor()` already handles null category:
  ```java
  public String resolvedColor() {
      if (this.category != null) return this.category.getColor();
      return "#3b82f6"; // Default blue
  }
  ```
- When category is deleted, events automatically use default color on next fetch

**Error Handling:**
- 404 if category not found
- 500 if database error
- Frontend displays error in existing error banner

**UI/UX Decisions:**
- Delete button uses 🗑️ emoji (trash can)
- Hover state: light red background (#fee2e2)
- Confirmation dialog prevents accidental deletion
- Focus on Cancel button by default (safer)
- Delete button disabled during operation (prevents double-click)

---

### Out of Scope

- **Undo deletion:** No undo functionality (can be added in future)
- **Bulk deletion:** Delete one category at a time
- **Archive categories:** True deletion only (no soft delete)
- **Event count warning:** Don't show "This category is used by X events" (requires backend query)
- **Prevent deletion of last category:** Allow deleting all categories
- **Keyboard shortcut:** No Delete key shortcut (mouse/touch only)
- **Fade-out animation:** Category disappears instantly (can add animation later)
- **Protect seeded categories:** The 6 default categories (Travel, Meeting, etc.) can be deleted

---

### Security Considerations

- Authorization: Assumes all users can delete categories (no auth implemented yet)
- Validation: Backend validates category exists before deletion
- Cascade behavior: `ON DELETE SET NULL` is safe (no data loss, just color change)

---

### Testing Checklist

**Backend:**
- ✅ DELETE /api/categories/{id} returns 204 on success
- ✅ DELETE /api/categories/{invalid-id} returns 404
- ✅ Events using deleted category have category_id set to NULL
- ✅ Events using deleted category return default color in resolvedColor

**Frontend:**
- ✅ Delete button appears in each category row
- ✅ Clicking delete opens confirmation dialog
- ✅ Canceling confirmation closes dialog
- ✅ Confirming deletion removes category from list
- ✅ Error displays if deletion fails
- ✅ Delete button disabled during operation
- ✅ Events refresh and show default color after category deletion

**Integration:**
- ✅ Create category → delete it → verify events show default color
- ✅ Delete non-existent category → verify error handling
- ✅ Delete category while editing another → verify edit state preserved
