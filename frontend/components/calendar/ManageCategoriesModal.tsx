'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import * as Dialog from '@radix-ui/react-dialog';
import type { Category } from '../../lib/types';
import { EVENT_COLORS } from '../../lib/constants';
import ConfirmDialog from './ConfirmDialog';

interface ManageCategoriesModalProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onCreateCategory: (name: string, color: string) => Promise<void>;
  onUpdateCategory: (id: string, name: string, color: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export default function ManageCategoriesModal({
  open,
  onClose,
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: ManageCategoriesModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  useEffect(() => {
    if (open) {
      setEditingId(null);
      setShowNewForm(false);
      setError('');
      setDeletingId(null);
      setShowConfirmDelete(false);
      setCategoryToDelete(null);
    }
  }, [open]);

  async function handleCreate(name: string, color: string) {
    setError('');
    try {
      await onCreateCategory(name, color);
      setShowNewForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
      throw err;
    }
  }

  async function handleUpdate(id: string, name: string, color: string) {
    setError('');
    try {
      await onUpdateCategory(id, name, color);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
      throw err;
    }
  }

  function handleEditStart(id: string) {
    setEditingId(id);
    setShowNewForm(false);
  }

  function handleNewFormStart() {
    setShowNewForm(true);
    setEditingId(null);
  }

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

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Dialog.Portal>
        <Overlay />
        <Content onEscapeKeyDown={(e) => {
          if (showNewForm || editingId) {
            e.preventDefault();
            setShowNewForm(false);
            setEditingId(null);
          }
        }}>
          <Header>
            <Dialog.Title asChild>
              <ModalTitle>Manage Categories</ModalTitle>
            </Dialog.Title>
            <CloseButton onClick={onClose} aria-label="Close">
              ✕
            </CloseButton>
          </Header>

          <InfoBanner>
            Categories help you organize and color-code your events. Click the edit icon to change a category&apos;s name or color.
          </InfoBanner>

          {error && <ErrorBanner>{error}</ErrorBanner>}

          <ScrollableList>
            {categories.length === 0 && !showNewForm && (
              <EmptyState>No categories yet. Create your first one below!</EmptyState>
            )}

            {categories.map((cat) => (
              <React.Fragment key={cat.id}>
                {editingId === cat.id ? (
                  <InlineEditForm
                    category={cat}
                    onSave={(name, color) => handleUpdate(cat.id, name, color)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
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
                )}
              </React.Fragment>
            ))}

            {showNewForm && (
              <InlineCreateForm
                onSave={handleCreate}
                onCancel={() => setShowNewForm(false)}
              />
            )}
          </ScrollableList>

          {!showNewForm && (
            <AddButton onClick={handleNewFormStart}>
              ＋ Add a new category
            </AddButton>
          )}
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
    </Dialog.Root>
  );
}

/* --- Inline Create Form --- */

function InlineCreateForm({
  onSave,
  onCancel,
}: {
  onSave: (name: string, color: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 50) return;
    setSubmitting(true);
    try {
      await onSave(trimmed, color);
    } finally {
      setSubmitting(false);
    }
  }

  const isValid = name.trim().length > 0 && name.trim().length <= 50;

  return (
    <MiniForm onSubmit={handleSubmit}>
      <MiniInput
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name"
        autoFocus
        disabled={submitting}
        maxLength={50}
      />
      <MiniSwatches>
        {EVENT_COLORS.map((c) => (
          <MiniSwatch
            key={c}
            type="button"
            $color={c}
            $selected={color === c}
            onClick={() => setColor(c)}
            disabled={submitting}
          />
        ))}
      </MiniSwatches>
      <MiniActions>
        <MiniSaveBtn type="submit" disabled={submitting || !isValid}>
          {submitting ? 'Saving...' : 'Save'}
        </MiniSaveBtn>
        <MiniCancelBtn type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </MiniCancelBtn>
      </MiniActions>
    </MiniForm>
  );
}

/* --- Inline Edit Form --- */

function InlineEditForm({
  category,
  onSave,
  onCancel,
}: {
  category: Category;
  onSave: (name: string, color: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 50) return;
    setSubmitting(true);
    try {
      await onSave(trimmed, color);
    } finally {
      setSubmitting(false);
    }
  }

  const isValid = name.trim().length > 0 && name.trim().length <= 50;

  return (
    <MiniForm onSubmit={handleSubmit}>
      <MiniInput
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name"
        autoFocus
        disabled={submitting}
        maxLength={50}
      />
      <MiniSwatches>
        {EVENT_COLORS.map((c) => (
          <MiniSwatch
            key={c}
            type="button"
            $color={c}
            $selected={color === c}
            onClick={() => setColor(c)}
            disabled={submitting}
          />
        ))}
      </MiniSwatches>
      <MiniActions>
        <MiniSaveBtn type="submit" disabled={submitting || !isValid}>
          {submitting ? 'Saving...' : 'Save'}
        </MiniSaveBtn>
        <MiniCancelBtn type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </MiniCancelBtn>
      </MiniActions>
    </MiniForm>
  );
}

/* --- Styled Components --- */

const Overlay = styled(Dialog.Overlay)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
`;

const Content = styled(Dialog.Content)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: 540px;
  max-width: 95vw;
  max-height: 80vh;
  z-index: 101;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #64748b;
  padding: 4px;
  line-height: 1;
  &:hover {
    color: #1e293b;
  }
`;

const InfoBanner = styled.div`
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 13px;
  color: #0c4a6e;
  margin-bottom: 16px;
`;

const ErrorBanner = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 13px;
  color: #ef4444;
  margin-bottom: 16px;
`;

const ScrollableList = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  max-height: 400px;
`;

const EmptyState = styled.div`
  text-align: center;
  color: #64748b;
  font-size: 14px;
  padding: 32px 16px;
`;

const CategoryRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  &:hover {
    background: #f8fafc;
  }
`;

const ColorDot = styled.span<{ $color: string }>`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const CategoryName = styled.span`
  font-size: 14px;
  color: #1e293b;
  flex: 1;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 4px;
  margin-left: auto;
`;

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
    background: #fee2e2;
  }
`;

const AddButton = styled.button`
  background: none;
  border: 1px solid #cbd5e1;
  cursor: pointer;
  color: #3b82f6;
  font-size: 14px;
  font-weight: 500;
  padding: 10px 14px;
  border-radius: 6px;
  width: 100%;
  text-align: center;
  &:hover {
    background: #f0f9ff;
    border-color: #3b82f6;
  }
`;

const MiniForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
`;

const MiniInput = styled.input`
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  &:focus {
    border-color: #3b82f6;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MiniSwatches = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const MiniSwatch = styled.button<{ $color: string; $selected: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  border: 2px solid ${({ $selected, $color }) => ($selected ? '#1e293b' : $color)};
  cursor: pointer;
  padding: 0;
  box-shadow: ${({ $selected }) => ($selected ? '0 0 0 1px #fff inset' : 'none')};
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MiniActions = styled.div`
  display: flex;
  gap: 8px;
`;

const MiniSaveBtn = styled.button`
  padding: 6px 14px;
  border: none;
  border-radius: 4px;
  background: #3b82f6;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  &:hover:not(:disabled) { background: #2563eb; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const MiniCancelBtn = styled.button`
  padding: 6px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #fff;
  color: #374151;
  font-size: 13px;
  cursor: pointer;
  &:hover:not(:disabled) { background: #f8fafc; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
