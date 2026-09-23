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
  background: var(--surface);
  border: 2px dashed var(--border-light);
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
    background: var(--surface-alt);
    border-color: #3b82f6;
  }
`;

const PlusIcon = styled.div`
  font-size: 48px;
  font-weight: 300;
  color: var(--nav-blue);
  line-height: 1;
  margin-bottom: 12px;
`;

const Label = styled.div`
  font-family: 'DM Sans', sans-serif;
  font-size: 16px;
  color: var(--text-secondary);
  font-weight: 500;
`;
