'use client';

import styled from 'styled-components';

export type ProjectStatus = 'in progress' | 'completed' | 'on hold' | 'planning';

interface StatusDropdownProps {
  selectedStatus: ProjectStatus;
  onSelectStatus: (status: ProjectStatus) => void;
  disabled?: boolean;
}

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

export default function StatusDropdown({ selectedStatus, onSelectStatus, disabled }: StatusDropdownProps) {
  return (
    <Select
      value={selectedStatus}
      onChange={(e) => onSelectStatus(e.target.value as ProjectStatus)}
      disabled={disabled}
    >
      <option value="in progress">{statusLabels['in progress']}</option>
      <option value="completed">{statusLabels.completed}</option>
      <option value="on hold">{statusLabels['on hold']}</option>
      <option value="planning">{statusLabels.planning}</option>
    </Select>
  );
}

const Select = styled.select`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  padding: 8px 32px 8px 12px;
  border: 1px solid var(--border-light);
  border-radius: 4px;
  outline: none;
  background: var(--input-bg);
  color: var(--foreground);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a1a1aa' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;

  @media (prefers-color-scheme: light) {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2352525b' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  }

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }

  &:disabled {
    background-color: var(--input-disabled-bg);
    cursor: not-allowed;
    opacity: 0.6;
  }
`;
