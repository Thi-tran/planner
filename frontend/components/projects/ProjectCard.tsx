'use client';

import styled from 'styled-components';
import { Project } from '@/lib/types';
import { PROJECT_COLORS } from '@/lib/constants';
import { format } from 'date-fns';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onEdit: (project: Project) => void;
}

const statusColors = {
  'in progress': '#6366F1',
  'completed': '#10B981',
  'on hold': '#94A3B8',
  'planning': '#C4B5FD',
} as const;

export default function ProjectCard({ project, onClick, onEdit }: ProjectCardProps) {
  const colorHex = PROJECT_COLORS.find((c) => c.name === project.color)?.hex || '#5EC4CD';
  
  const formatDateRange = () => {
    const start = format(new Date(project.startDate), 'MMM dd, yyyy');
    if (project.endDate) {
      const end = format(new Date(project.endDate), 'MMM dd, yyyy');
      return `${start} - ${end}`;
    }
    return `${start} - Ongoing`;
  };

  return (
    <Card onClick={onClick}>
      <TopBar>
        <ColorDot $color={colorHex} />
        <EditButton
          onClick={(e) => {
            e.stopPropagation();
            onEdit(project);
          }}
          aria-label="Edit project"
        >
          ✏️
        </EditButton>
      </TopBar>
      <Title>{project.name}</Title>
      <DateRange>{formatDateRange()}</DateRange>
      {project.description && <Description>{project.description}</Description>}
      <StatusBadge $color={statusColors[project.status]}>
        {project.status}
      </StatusBadge>
    </Card>
  );
}

const Card = styled.div`
  background: white;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  position: relative;
  transition: box-shadow 0.2s ease;
  border: 1px solid #e5e7eb;

  &:hover {
    box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
  }
`;

const TopBar = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
`;

const ColorDot = styled.div<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${(props) => props.$color};
`;

const EditButton = styled.button`
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  opacity: 0.6;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }

  &:focus {
    outline: 2px solid #5EC4CD;
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

const Title = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
`;

const DateRange = styled.div`
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
`;

const Description = styled.p`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #374151;
  margin: 0 0 12px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StatusBadge = styled.span<{ $color: string }>`
  display: inline-block;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: ${(props) => props.$color}20;
  color: ${(props) => props.$color};
  text-transform: capitalize;
`;
