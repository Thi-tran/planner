'use client';

import { useState } from 'react';
import styled from 'styled-components';
import * as Dialog from '@radix-ui/react-dialog';
import { ChecklistRequest } from '@/lib/types';
import { PROJECT_COLORS } from '@/lib/constants';

interface CreateChecklistModalProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onCreateChecklist: (data: ChecklistRequest) => Promise<void>;
}

export default function CreateChecklistModal({ open, onClose, onCreateChecklist }: CreateChecklistModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('Sky Cyan');
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Checklist name is required';
    } else if (name.length > 255) {
      newErrors.name = 'Checklist name must not exceed 255 characters';
    }

    if (description.length > 2000) {
      newErrors.description = 'Description must not exceed 2000 characters';
    }

    if (!color) {
      newErrors.color = 'Please select a color';
    }

    if (dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(dueDate);
      if (selectedDate < today) {
        newErrors.dueDate = 'Due date must be today or later';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onCreateChecklist({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        dueDate: dueDate || undefined,
      });
      handleClose();
    } catch {
      setErrors({ submit: 'Failed to create checklist. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setColor('Sky Cyan');
    setDueDate('');
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  const isFormValid = name.trim() && color;

  return (
    <Dialog.Root open={open} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Overlay />
        <Content>
          <Header>
            <Dialog.Title asChild>
              <Title>New checklist</Title>
            </Dialog.Title>
            <Dialog.Close asChild>
              <CloseButton>&times;</CloseButton>
            </Dialog.Close>
          </Header>

          <Form onSubmit={handleSubmit}>
            <Field>
              <Label>
                Checklist name <Required>*</Required>
              </Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 255))}
                onBlur={validateForm}
                placeholder="Enter checklist name"
                maxLength={255}
              />
              <CharCounter>{name.length}/255</CharCounter>
              {errors.name && <ErrorText>{errors.name}</ErrorText>}
            </Field>

            <Field>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                placeholder="Enter checklist description"
                maxLength={2000}
                rows={3}
              />
              <CharCounter>{description.length}/2000</CharCounter>
              {errors.description && <ErrorText>{errors.description}</ErrorText>}
            </Field>

            <Field>
              <Label>
                Color <Required>*</Required>
              </Label>
              <ColorSwatches>
                {PROJECT_COLORS.map((c) => (
                  <ColorSwatch
                    key={c.name}
                    $color={c.hex}
                    $selected={color === c.name}
                    onClick={() => setColor(c.name)}
                    type="button"
                  />
                ))}
              </ColorSwatches>
              <ColorHint>Used as the checklist color bar and progress indicator.</ColorHint>
              {errors.color && <ErrorText>{errors.color}</ErrorText>}
            </Field>

            <Field>
              <Label>Due date (optional)</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                onBlur={validateForm}
              />
              {errors.dueDate && <ErrorText>{errors.dueDate}</ErrorText>}
            </Field>

            {errors.submit && <ErrorText>{errors.submit}</ErrorText>}

            <Actions>
              <CancelButton type="button" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </CancelButton>
              <CreateButton type="submit" disabled={!isFormValid || isSubmitting}>
                {isSubmitting ? 'Creating...' : '+ Create checklist'}
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
  padding: 24px;
  z-index: 51;
  overflow-y: auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px;
  font-weight: 700;
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

const CharCounter = styled.span`
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: #9ca3af;
  text-align: right;
`;

const ColorSwatches = styled.div`
  display: flex;
  gap: 12px;
`;

const ColorSwatch = styled.button<{ $color: string; $selected: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${(props) => props.$color};
  border: 3px solid ${(props) => (props.$selected ? '#374151' : 'transparent')};
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }
`;

const ColorHint = styled.p`
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: #9ca3af;
  margin: 0;
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
