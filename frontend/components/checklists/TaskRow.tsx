import { useState } from 'react';
import styled from 'styled-components';
import { ChecklistTask } from '@/lib/types';
import { updateTaskStatus } from '@/lib/api';

interface TaskRowProps {
  task: ChecklistTask;
  checklistColor: string;
  onStatusChange: () => void;
  onTaskClick: (taskId: string) => void;
  isSelected?: boolean;
}

export default function TaskRow({ task, checklistColor, onStatusChange, onTaskClick, isSelected = false }: TaskRowProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const getDeadlineColor = () => {
    if (!task.deadline || task.status === 'done') return '#94A3B8';
    
    const deadlineDate = new Date(task.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return '#E91E8C'; // Overdue - red
    if (diffDays <= 3) return '#F59E0B'; // Soon - amber
    return '#94A3B8'; // Normal - gray
  };

  const formatDeadline = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleCheckboxClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isUpdating) return;
    
    setIsUpdating(true);
    setError(null);
    
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    
    try {
      await updateTaskStatus(task.id, newStatus);
      onStatusChange();
    } catch (err) {
      setError('Failed to update task status');
      console.error('Error updating task status:', err);
      // Auto-dismiss error after 3 seconds
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't open panel if clicking checkbox
    if ((e.target as HTMLElement).closest('[data-checkbox]')) {
      return;
    }
    onTaskClick(task.id);
  };

  return (
    <Row 
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={handleRowClick}
    >
      <Checkbox 
        data-checkbox
        $checked={task.status === 'done'} 
        $color={checklistColor}
        $disabled={isUpdating}
        $isSelected={isSelected}
        onClick={handleCheckboxClick}
      >
        {isSelected ? (
          <SelectionIndicator>−</SelectionIndicator>
        ) : task.status === 'done' ? (
          <Checkmark>✓</Checkmark>
        ) : null}
      </Checkbox>
      <TaskContent>
        <TitleRow>
          <TaskDescription $isDone={task.status === 'done'}>
            {task.title}
          </TaskDescription>
          {isHovering && <ViewButton>View →</ViewButton>}
        </TitleRow>
        <TaskMeta>
          {task.assignedToUser ? (
            <Assignee>👤 {task.assignedToUser.displayName}</Assignee>
          ) : (
            <Assignee>Unassigned</Assignee>
          )}
          {task.deadline && (
            <DeadlinePill $color={getDeadlineColor()}>
              {formatDeadline(task.deadline)}
            </DeadlinePill>
          )}
          {task.comments.length > 0 && (
            <CommentCount>💬 {task.comments.length}</CommentCount>
          )}
        </TaskMeta>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </TaskContent>
    </Row>
  );
}

const Row = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  transition: background 0.15s;
  cursor: pointer;

  &:hover {
    background: #f9fafb;
  }
`;

const Checkbox = styled.div<{ $checked: boolean; $color: string; $disabled: boolean; $isSelected: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  margin-top: 2px;
  opacity: ${p => p.$disabled ? 0.5 : 1};
  
  ${p => p.$isSelected ? `
    background: ${p.$color};
    border: 2px solid ${p.$color};
  ` : p.$checked ? `
    background: ${p.$color};
    border: 2px solid ${p.$color};
  ` : `
    background: white;
    border: 2px solid ${p.$color};
    
    &:hover {
      background: ${p.$disabled ? 'white' : `${p.$color}10`};
    }
  `}
`;

const Checkmark = styled.span`
  color: white;
  font-size: 14px;
  font-weight: bold;
  line-height: 1;
`;

const SelectionIndicator = styled.span`
  color: white;
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
`;

const TaskContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
`;

const TaskDescription = styled.div<{ $isDone?: boolean }>`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #1f2937;
  text-decoration: ${p => p.$isDone ? 'line-through' : 'none'};
  opacity: ${p => p.$isDone ? 0.7 : 1};
  flex: 1;
`;

const ViewButton = styled.button`
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #6366F1;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;

  &:hover {
    background: #f0f9ff;
    border-color: #6366F1;
  }
`;

const TaskMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const Assignee = styled.span`
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: #6b7280;
`;

const DeadlinePill = styled.span<{ $color: string }>`
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: white;
  background: ${p => p.$color};
  padding: 2px 8px;
  border-radius: 4px;
`;

const CommentCount = styled.span`
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: #6b7280;
`;

const ErrorMessage = styled.div`
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: #ef4444;
  margin-top: 4px;
`;
