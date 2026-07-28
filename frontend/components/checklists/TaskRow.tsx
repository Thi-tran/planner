import styled from 'styled-components';
import { ChecklistTask } from '@/lib/types';

interface TaskRowProps {
  task: ChecklistTask;
  checklistColor: string;
}

export default function TaskRow({ task, checklistColor }: TaskRowProps) {
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

  return (
    <Row>
      <Checkbox $checked={task.status === 'done'} $color={checklistColor}>
        {task.status === 'done' && <Checkmark>✓</Checkmark>}
      </Checkbox>
      <TaskContent>
        <TaskDescription $isDone={task.status === 'done'}>
          {task.description}
        </TaskDescription>
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

  &:hover {
    background: #f9fafb;
  }
`;

const Checkbox = styled.div<{ $checked: boolean; $color: string }>`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 2px;
  
  ${p => p.$checked ? `
    background: ${p.$color};
    border: 2px solid ${p.$color};
  ` : `
    background: white;
    border: 2px solid ${p.$color};
    
    &:hover {
      background: ${p.$color}10;
    }
  `}
`;

const Checkmark = styled.span`
  color: white;
  font-size: 14px;
  font-weight: bold;
  line-height: 1;
`;

const TaskContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const TaskDescription = styled.div<{ $isDone?: boolean }>`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #1f2937;
  margin-bottom: 6px;
  text-decoration: ${p => p.$isDone ? 'line-through' : 'none'};
  opacity: ${p => p.$isDone ? 0.7 : 1};
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
