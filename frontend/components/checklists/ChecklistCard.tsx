import { useState } from 'react';
import styled from 'styled-components';
import { Checklist, TaskRequest } from '@/lib/types';
import TaskRow from './TaskRow';
import AddTaskModal from './AddTaskModal';
import { PROJECT_COLORS } from '@/lib/constants';

interface ChecklistCardProps {
  checklist: Checklist;
  expanded: boolean;
  onToggle: () => void;
  onTaskAdded: () => void;
}

export default function ChecklistCard({ checklist, expanded, onToggle, onTaskAdded }: ChecklistCardProps) {
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const completedCount = checklist.tasks.filter(t => t.status === 'done').length;
  const totalTasks = checklist.tasks.length;
  const percentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  
  const colorHex = PROJECT_COLORS.find(c => c.name === checklist.color)?.hex || '#5EC4CD';

  const handleAddTask = async (data: TaskRequest) => {
    const response = await fetch(`/api/checklists/${checklist.id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to add task');
    }

    onTaskAdded();
  };

  const handleAddTaskClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAddTaskModal(true);
  };

  return (
    <Card $borderColor={colorHex} onClick={onToggle}>
      <CardHeader>
        <HeaderContent>
          <ChecklistName>{checklist.name}</ChecklistName>
          {checklist.description && (
            <ChecklistDescription>{checklist.description}</ChecklistDescription>
          )}
        </HeaderContent>
        <ExpandIcon $expanded={expanded}>
          {expanded ? '⌄' : '⌃'}
        </ExpandIcon>
      </CardHeader>

      <ProgressSection>
        <ProgressInfo>
          <ProgressText>{completedCount}/{totalTasks} done</ProgressText>
          <ProgressPercentage>{percentage}%</ProgressPercentage>
        </ProgressInfo>
        <ProgressBar>
          <ProgressFill $percentage={percentage} $color={colorHex} />
        </ProgressBar>
      </ProgressSection>

      {expanded && (
        <>
          {checklist.tasks.length > 0 && (
            <TaskList>
              {checklist.tasks
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map(task => (
                  <TaskRow key={task.id} task={task} checklistColor={colorHex} />
                ))}
            </TaskList>
          )}
          <AddTaskButton onClick={handleAddTaskClick}>
            + Add task
          </AddTaskButton>
        </>
      )}

      <AddTaskModal
        checklistId={checklist.id}
        checklistName={checklist.name}
        checklistColor={colorHex}
        projectId={checklist.projectId}
        open={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        onAddTask={handleAddTask}
      />
    </Card>
  );
}

const Card = styled.div<{ $borderColor: string }>`
  background: white;
  border: 1px solid #e2e8f0;
  border-left: 4px solid ${p => p.$borderColor};
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 0.15s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
  cursor: pointer;
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const ChecklistName = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
`;

const ChecklistDescription = styled.p`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #6b7280;
  margin: 0;
`;

const ExpandIcon = styled.span<{ $expanded: boolean }>`
  font-size: 14px;
  line-height: 1;
  color: #94a3b8;
  flex-shrink: 0;
  transition: color 0.2s ease;
  margin-top: 2px;
  
  ${Card}:hover & {
    color: #64748b;
  }
`;

const ProgressSection = styled.div`
  margin-bottom: 12px;
`;

const ProgressInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const ProgressText = styled.span`
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  color: #6b7280;
`;

const ProgressPercentage = styled.span`
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
`;

const ProgressBar = styled.div`
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $percentage: number; $color: string }>`
  height: 100%;
  width: ${p => p.$percentage}%;
  background: ${p => p.$color};
  transition: width 0.3s ease;
`;

const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
`;

const AddTaskButton = styled.button`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #5EC4CD;
  background: none;
  border: 1px dashed #cbd5e1;
  border-radius: 4px;
  padding: 10px;
  margin-top: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;

  &:hover {
    background: #f0f9fa;
    border-color: #5EC4CD;
  }
`;
