'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import * as Dialog from '@radix-ui/react-dialog';
import { TaskRequest, MembershipResponse } from '@/lib/types';
import { getMembers } from '@/lib/api';

interface AddTaskModalProps {
  checklistId: string;
  checklistName: string;
  checklistColor: string;
  projectId: string;
  open: boolean;
  onClose: () => void;
  onAddTask: (data: TaskRequest) => Promise<void>;
}

export default function AddTaskModal({
  checklistName,
  checklistColor,
  projectId,
  open,
  onClose,
  onAddTask,
}: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [members, setMembers] = useState<MembershipResponse[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && projectId) {
      getMembers(projectId)
        .then(setMembers)
        .catch(() => setMembers([]));
    }
  }, [open, projectId]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Task title is required';
    } else if (title.length > 500) {
      newErrors.title = 'Task title must not exceed 500 characters';
    }

    if (details.length > 2000) {
      newErrors.details = 'Details must not exceed 2000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onAddTask({
        title: title.trim(),
        details: details.trim() || undefined,
        assignedTo: assignedTo || undefined,
        deadline: deadline || undefined,
        priority,
      });
      handleClose();
    } catch {
      setErrors({ submit: 'Failed to add task. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDetails('');
    setAssignedTo('');
    setDeadline('');
    setPriority('medium');
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  const isFormValid = title.trim();

  return (
    <Dialog.Root open={open} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Overlay />
        <Content>
          <Header $borderColor={checklistColor}>
            <HeaderContent>
              <Dialog.Title asChild>
                <Title>Add task</Title>
              </Dialog.Title>
              <ChecklistName>{checklistName}</ChecklistName>
            </HeaderContent>
            <Dialog.Close asChild>
              <CloseButton>&times;</CloseButton>
            </Dialog.Close>
          </Header>

          <Form onSubmit={handleSubmit}>
            <Field>
              <Label>
                Task title <Required>*</Required>
              </Label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 500))}
                onBlur={validateForm}
                placeholder="Enter task title"
                maxLength={500}
              />
              <CharCounter>{title.length}/500</CharCounter>
              {errors.title && <ErrorText>{errors.title}</ErrorText>}
            </Field>

            <Field>
              <Label>Description (optional)</Label>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 2000))}
                placeholder="Enter task details"
                maxLength={2000}
                rows={3}
              />
              <CharCounter>{details.length}/2000</CharCounter>
              {errors.details && <ErrorText>{errors.details}</ErrorText>}
            </Field>

            <TwoColumnRow>
              <Field>
                <Label>Assigned to</Label>
                <Select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.userId || ''}>
                      {member.displayName || member.email}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field>
                <Label>Deadline</Label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </Field>
            </TwoColumnRow>

            <Field>
              <Label>Priority</Label>
              <PriorityGroup>
                <PriorityButton
                  type="button"
                  $priority="low"
                  $selected={priority === 'low'}
                  onClick={() => setPriority('low')}
                >
                  Low
                </PriorityButton>
                <PriorityButton
                  type="button"
                  $priority="medium"
                  $selected={priority === 'medium'}
                  onClick={() => setPriority('medium')}
                >
                  Medium
                </PriorityButton>
                <PriorityButton
                  type="button"
                  $priority="high"
                  $selected={priority === 'high'}
                  onClick={() => setPriority('high')}
                >
                  High
                </PriorityButton>
              </PriorityGroup>
            </Field>

            {errors.submit && <ErrorText>{errors.submit}</ErrorText>}

            <Actions>
              <CancelButton type="button" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </CancelButton>
              <CreateButton type="submit" disabled={!isFormValid || isSubmitting}>
                {isSubmitting ? 'Adding...' : '+ Add task'}
              </CreateButton>
            </Actions>
          </Form>
        </Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const Overlay = styled(Dialog.Overlay)`
  background: rgba(0, 0, 0, 0.5);
  position: fixed;
  inset: 0;
  z-index: 50;
`;

const Content = styled(Dialog.Content)`
  background: white;
  border-radius: 12px;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90vw;
  max-width: 600px;
  max-height: 85vh;
  padding: 0;
  z-index: 51;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div<{ $borderColor: string }>`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  border-left: 4px solid ${(props) => props.$borderColor};
  background: #f9fafb;
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const Title = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px 0;
`;

const ChecklistName = styled.p`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #6b7280;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 32px;
  line-height: 1;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #374151;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  overflow-y: auto;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
`;

const Required = styled.span`
  color: #ef4444;
`;

const Input = styled.input`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  outline: none;

  &:focus {
    border-color: #5EC4CD;
    box-shadow: 0 0 0 3px rgba(94, 196, 205, 0.1);
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const Textarea = styled.textarea`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  outline: none;
  resize: vertical;

  &:focus {
    border-color: #5EC4CD;
    box-shadow: 0 0 0 3px rgba(94, 196, 205, 0.1);
  }
`;

const Select = styled.select`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  outline: none;
  background: white;
  cursor: pointer;

  &:focus {
    border-color: #5EC4CD;
    box-shadow: 0 0 0 3px rgba(94, 196, 205, 0.1);
  }
`;

const CharCounter = styled.span`
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: #9ca3af;
  text-align: right;
`;

const TwoColumnRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const PriorityGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const PriorityButton = styled.button<{ $priority: string; $selected: boolean }>`
  flex: 1;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;

  ${(props) => {
    const colors = {
      low: { bg: '#10B981', hover: '#059669' },
      medium: { bg: '#F59E0B', hover: '#D97706' },
      high: { bg: '#EF4444', hover: '#DC2626' },
    };
    const color = colors[props.$priority as keyof typeof colors];

    if (props.$selected) {
      return `
        background: ${color.bg};
        color: white;
        border: 2px solid ${color.bg};
      `;
    }
    return `
      background: white;
      color: ${color.bg};
      border: 2px solid ${color.bg};
      
      &:hover {
        background: ${color.bg}10;
      }
    `;
  }}
`;

const ErrorText = styled.span`
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: #ef4444;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
`;

const CancelButton = styled.button`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  padding: 10px 20px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover:not(:disabled) {
    background: #f9fafb;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CreateButton = styled.button`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  background: #5EC4CD;
  color: white;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover:not(:disabled) {
    background: #4da9b8;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
