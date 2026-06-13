'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import * as Dialog from '@radix-ui/react-dialog';
import { format, addHours, parseISO } from 'date-fns';
import type { CalendarEvent, EventRequest } from '../../lib/types';
import { EVENT_COLORS } from '../../lib/constants';

function toLocalDatetimeValue(isoString: string): string {
  const d = parseISO(isoString);
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

function buildDefaultStart(date: Date, time: string): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

interface ModalState {
  open: boolean;
  initialSlot?: { date: Date; time: string };
  initialEvent?: CalendarEvent;
}

interface EventModalProps {
  state: ModalState;
  onClose: () => void;
  onCreateEvent: (data: EventRequest) => Promise<void>;
  onUpdateEvent: (id: string, data: EventRequest) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
}

export default function EventModal({
  state,
  onClose,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
}: EventModalProps) {
  const isEdit = !!state.initialEvent;

  const getDefaultStart = () => {
    if (state.initialEvent) return toLocalDatetimeValue(state.initialEvent.startTime);
    if (state.initialSlot) {
      const iso = buildDefaultStart(state.initialSlot.date, state.initialSlot.time);
      return toLocalDatetimeValue(iso);
    }
    return format(new Date(), "yyyy-MM-dd'T'HH:mm");
  };

  const getDefaultEnd = () => {
    if (state.initialEvent) return toLocalDatetimeValue(state.initialEvent.endTime);
    if (state.initialSlot) {
      const start = buildDefaultStart(state.initialSlot.date, state.initialSlot.time);
      return toLocalDatetimeValue(addHours(parseISO(start), 1).toISOString());
    }
    return format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm");
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(getDefaultStart());
  const [endTime, setEndTime] = useState(getDefaultEnd());
  const [color, setColor] = useState(state.initialEvent?.color ?? EVENT_COLORS[0]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (state.open) {
      setTitle(state.initialEvent?.title ?? '');
      setDescription(state.initialEvent?.description ?? '');
      setStartTime(getDefaultStart());
      setEndTime(getDefaultEnd());
      setColor(state.initialEvent?.color ?? EVENT_COLORS[0]);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, state.initialEvent, state.initialSlot]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!title.trim()) { setError('Title is required'); return; }
    const startISO = new Date(startTime).toISOString();
    const endISO = new Date(endTime).toISOString();
    if (new Date(endISO) <= new Date(startISO)) {
      setError('End time must be after start time');
      return;
    }

    const data: EventRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      startTime: startISO,
      endTime: endISO,
      color: color || undefined,
    };

    setSubmitting(true);
    try {
      if (isEdit && state.initialEvent) {
        await onUpdateEvent(state.initialEvent.id, data);
      } else {
        await onCreateEvent(data);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!state.initialEvent) return;
    setSubmitting(true);
    try {
      await onDeleteEvent(state.initialEvent.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={state.open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Overlay />
        <Content>
          <Dialog.Title asChild>
            <ModalTitle>{isEdit ? 'Edit Event' : 'New Event'}</ModalTitle>
          </Dialog.Title>

          <Form onSubmit={handleSubmit}>
            <Field>
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event title"
                required
              />
            </Field>

            <Field>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={2}
              />
            </Field>

            <Row>
              <Field>
                <Label>Start</Label>
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <Label>End</Label>
                <Input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </Field>
            </Row>

            <Field>
              <Label>Color</Label>
              <ColorSwatches>
                {EVENT_COLORS.map((c) => (
                  <Swatch
                    key={c}
                    type="button"
                    $color={c}
                    $selected={color === c}
                    onClick={() => setColor(c)}
                    aria-label={c}
                  />
                ))}
              </ColorSwatches>
            </Field>

            {error && <ErrorMsg>{error}</ErrorMsg>}

            <Actions>
              {isEdit && (
                <DeleteButton type="button" onClick={handleDelete} disabled={submitting}>
                  Delete
                </DeleteButton>
              )}
              <RightActions>
                <CancelButton type="button" onClick={onClose} disabled={submitting}>
                  Cancel
                </CancelButton>
                <SaveButton type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : isEdit ? 'Save' : 'Create'}
                </SaveButton>
              </RightActions>
            </Actions>
          </Form>
        </Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const Overlay = styled(Dialog.Overlay)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
`;

const Content = styled(Dialog.Content)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: 460px;
  max-width: 95vw;
  z-index: 101;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
`;

const ModalTitle = styled.h2`
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: #475569;
`;

const Input = styled.input`
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
  color: #1e293b;
  outline: none;
  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
`;

const Textarea = styled.textarea`
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
  color: #1e293b;
  resize: vertical;
  outline: none;
  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
`;

const ColorSwatches = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Swatch = styled.button<{ $color: string; $selected: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  border: 3px solid ${({ $selected, $color }) => ($selected ? '#1e293b' : $color)};
  cursor: pointer;
  padding: 0;
  outline: none;
  box-shadow: ${({ $selected }) => ($selected ? '0 0 0 2px #fff inset' : 'none')};
`;

const ErrorMsg = styled.p`
  color: #ef4444;
  font-size: 13px;
  margin: 0;
`;

const Actions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
`;

const RightActions = styled.div`
  display: flex;
  gap: 8px;
  margin-left: auto;
`;

const CancelButton = styled.button`
  padding: 8px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
  color: #374151;
  &:hover:not(:disabled) { background: #f8fafc; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SaveButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #3b82f6;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  &:hover:not(:disabled) { background: #2563eb; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const DeleteButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #ef4444;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  &:hover:not(:disabled) { background: #dc2626; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
