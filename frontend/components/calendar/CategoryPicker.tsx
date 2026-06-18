'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import type { Category } from '../../lib/types';
import { EVENT_COLORS } from '../../lib/constants';

interface CategoryPickerProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreateCategory: (name: string, color: string) => Promise<void>;
  onUpdateCategory: (id: string, name: string, color: string) => Promise<void>;
}

export default function CategoryPicker({
  categories,
  selectedId,
  onSelect,
  onCreateCategory,
  onUpdateCategory,
}: CategoryPickerProps) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Container>
      <CategoryRow
        $selected={selectedId === null}
        onClick={() => onSelect(null)}
      >
        <ColorDot $color="#94a3b8" />
        <CategoryName>None</CategoryName>
        {selectedId === null && <Checkmark>✓</Checkmark>}
      </CategoryRow>

      {categories.map((cat) => (
        <React.Fragment key={cat.id}>
          {editingId === cat.id ? (
            <InlineEditForm
              category={cat}
              onSave={async (name, color) => {
                await onUpdateCategory(cat.id, name, color);
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <CategoryRow
              $selected={selectedId === cat.id}
              onClick={() => onSelect(cat.id)}
            >
              <ColorDot $color={cat.color} />
              <CategoryName>{cat.name}</CategoryName>
              {selectedId === cat.id && <Checkmark>✓</Checkmark>}
              <EditIcon
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(cat.id);
                }}
                title="Edit category"
              >
                ✏️
              </EditIcon>
            </CategoryRow>
          )}
        </React.Fragment>
      ))}

      {showNewForm ? (
        <InlineCreateForm
          onSave={async (name, color) => {
            await onCreateCategory(name, color);
            setShowNewForm(false);
          }}
          onCancel={() => setShowNewForm(false)}
        />
      ) : (
        <AddButton onClick={() => setShowNewForm(true)}>＋ New category</AddButton>
      )}
    </Container>
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
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSave(name.trim(), color);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MiniForm onSubmit={handleSubmit}>
      <MiniInput
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name"
        autoFocus
      />
      <MiniSwatches>
        {EVENT_COLORS.map((c) => (
          <MiniSwatch
            key={c}
            type="button"
            $color={c}
            $selected={color === c}
            onClick={() => setColor(c)}
          />
        ))}
      </MiniSwatches>
      <MiniActions>
        <MiniSaveBtn type="submit" disabled={submitting || !name.trim()}>
          Add
        </MiniSaveBtn>
        <MiniCancelBtn type="button" onClick={onCancel}>
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
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSave(name.trim(), color);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MiniForm onSubmit={handleSubmit}>
      <MiniInput
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name"
        autoFocus
      />
      <MiniSwatches>
        {EVENT_COLORS.map((c) => (
          <MiniSwatch
            key={c}
            type="button"
            $color={c}
            $selected={color === c}
            onClick={() => setColor(c)}
          />
        ))}
      </MiniSwatches>
      <MiniActions>
        <MiniSaveBtn type="submit" disabled={submitting || !name.trim()}>
          Save
        </MiniSaveBtn>
        <MiniCancelBtn type="button" onClick={onCancel}>
          Cancel
        </MiniCancelBtn>
      </MiniActions>
    </MiniForm>
  );
}

/* --- Styled Components --- */

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 4px;
`;

const CategoryRow = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  background: ${({ $selected }) => ($selected ? '#eff6ff' : 'transparent')};
  border: 1px solid ${({ $selected }) => ($selected ? '#bfdbfe' : 'transparent')};
  &:hover {
    background: ${({ $selected }) => ($selected ? '#eff6ff' : '#f8fafc')};
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
  font-size: 13px;
  color: #1e293b;
  flex: 1;
`;

const Checkmark = styled.span`
  font-size: 14px;
  color: #2563eb;
  font-weight: 600;
`;

const EditIcon = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 4px;
  opacity: 0.5;
  &:hover {
    opacity: 1;
    background: #e2e8f0;
  }
`;

const AddButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #3b82f6;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 8px;
  text-align: left;
  border-radius: 6px;
  &:hover {
    background: #f0f9ff;
  }
`;

const MiniForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
`;

const MiniInput = styled.input`
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  &:focus {
    border-color: #3b82f6;
  }
`;

const MiniSwatches = styled.div`
  display: flex;
  gap: 6px;
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
`;

const MiniActions = styled.div`
  display: flex;
  gap: 6px;
`;

const MiniSaveBtn = styled.button`
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  background: #3b82f6;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  &:hover:not(:disabled) { background: #2563eb; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const MiniCancelBtn = styled.button`
  padding: 4px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #fff;
  color: #374151;
  font-size: 12px;
  cursor: pointer;
  &:hover { background: #f8fafc; }
`;
