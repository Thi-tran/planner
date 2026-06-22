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
