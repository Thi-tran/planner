'use client';

import styled from 'styled-components';

interface CreateProjectCardProps {
  onClick: () => void;
}

export default function CreateProjectCard({ onClick }: CreateProjectCardProps) {
  return (
    <Card onClick={onClick}>
      <PlusIcon>+</PlusIcon>
      <Label>Create new project</Label>
    </Card>
  );
}

const Card = styled.div`
  background: var(--surface-subtle);
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  padding: 16px;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: var(--surface-hover);
    border-color: #94a3b8;
  }
`;

const PlusIcon = styled.div`
  font-size: 48px;
  font-weight: 300;
  color: #6366f1;
  line-height: 1;
  margin-bottom: 12px;
`;

const Label = styled.div`
  font-family: 'DM Sans', sans-serif;
  font-size: 16px;
  color: #475569;
  font-weight: 500;
`;
