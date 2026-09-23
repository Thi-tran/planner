'use client';

import React from 'react';
import styled from 'styled-components';
import type { Category } from '../../lib/types';

interface CategoryPickerProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function CategoryPicker({
  categories,
  selectedId,
  onSelect,
}: CategoryPickerProps) {
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
        <CategoryRow
          key={cat.id}
          $selected={selectedId === cat.id}
          onClick={() => onSelect(cat.id)}
        >
          <ColorDot $color={cat.color} />
          <CategoryName>{cat.name}</CategoryName>
          {selectedId === cat.id && <Checkmark>✓</Checkmark>}
        </CategoryRow>
      ))}
    </Container>
  );
}

/* --- Styled Components --- */

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid var(--border);
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
  background: ${({ $selected }) => ($selected ? 'rgba(59, 130, 246, 0.15)' : 'transparent')};
  border: 1px solid ${({ $selected }) => ($selected ? 'rgba(59, 130, 246, 0.4)' : 'transparent')};
  &:hover {
    background: ${({ $selected }) => ($selected ? 'rgba(59, 130, 246, 0.15)' : 'var(--surface-hover)')};
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
  color: var(--foreground);
  flex: 1;
`;

const Checkmark = styled.span`
  font-size: 14px;
  color: var(--nav-blue);
  font-weight: 600;
`;
