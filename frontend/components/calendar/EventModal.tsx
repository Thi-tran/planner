'use client';

import React, { useState, useEffect, startTransition } from 'react';
import styled from 'styled-components';
import * as Dialog from '@radix-ui/react-dialog';
import { format, addHours, parseISO } from 'date-fns';
import type { CalendarEvent, EventRequest, Category, Checklist } from '../../lib/types';
import CategoryPicker from './CategoryPicker';
import ChecklistCard from '../checklists/ChecklistCard';
import { getChecklistsByEvent, createChecklistForEvent } from '../../lib/api';

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
  categories: Category[];
  activeProjectId: string | null;
}

export default function EventModal({
  state,
  onClose,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  categories,
  activeProjectId,
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
  const [categoryId, setCategoryId] = useState<string | null>(state.initialEvent?.categoryId ?? null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [checklistsLoading, setChecklistsLoading] = useState(false);
  const [expandedChecklistId, setExpandedChecklistId] = useState<string | null>(null);
  const [showChecklistInput, setShowChecklistInput] = useState(false);
  const [newChecklistName, setNewChecklistName] = useState('');
  const [creatingChecklist, setCreatingChecklist] = useState(false);

  const eventId = state.initialEvent?.id;

  async function loadChecklists() {
    if (!activeProjectId || !eventId) return;
    setChecklistsLoading(true);
    try {
      const data = await getChecklistsByEvent(activeProjectId, eventId);
      setChecklists(data);
    } catch {
      // Silently ignore — checklist section is supplementary to the event form
    } finally {
      setChecklistsLoading(false);
    }
  }

  useEffect(() => {
    if (state.open && eventId) {
      loadChecklists();
    } else {
      setChecklists([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, eventId]);

  async function handleNewChecklistSubmit(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setShowChecklistInput(false);
      setNewChecklistName('');
      return;
    }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const name = newChecklistName.trim();
    if (!name || !activeProjectId || !eventId || creatingChecklist) return;
    setCreatingChecklist(true);
    try {
      await createChecklistForEvent(activeProjectId, eventId, { name, color: 'Sky Cyan' });
      await loadChecklists();
      setNewChecklistName('');
      setShowChecklistInput(false);
    } catch {
      setError('Failed to create checklist. Please try again.');
    } finally {
      setCreatingChecklist(false);
    }
  }

  useEffect(() => {
    if (state.open) {
      startTransition(() => {
        setTitle(state.initialEvent?.title ?? '');
        setDescription(state.initialEvent?.description ?? '');
        setStartTime(getDefaultStart());
        setEndTime(getDefaultEnd());
        setCategoryId(state.initialEvent?.categoryId ?? null);
        setError('');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, state.initialEvent, state.initialSlot]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!title.trim()) { setError('Title is required'); return; }
    if (!activeProjectId) { setError('No active project selected'); return; }
    
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
      categoryId: categoryId || undefined,
      projectId: activeProjectId,
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
              <Label>Category</Label>
              <CategoryPicker
                categories={categories}
                selectedId={categoryId}
                onSelect={(id) => setCategoryId(id)}
              />
            </Field>

            {isEdit && eventId && (
              <Field>
                <ChecklistSectionHeader>
                  <Label>Checklists</Label>
                  {!showChecklistInput && (
                    <AddChecklistButton type="button" onClick={() => setShowChecklistInput(true)}>
                      + Add checklist
                    </AddChecklistButton>
                  )}
                </ChecklistSectionHeader>
                {showChecklistInput && (
                  <Input
                    type="text"
                    autoFocus
                    placeholder="Type a name and press Enter…"
                    value={newChecklistName}
                    disabled={creatingChecklist}
                    onChange={(e) => setNewChecklistName(e.target.value)}
                    onKeyDown={handleNewChecklistSubmit}
                    onBlur={() => {
                      if (!newChecklistName.trim()) setShowChecklistInput(false);
                    }}
                  />
                )}
                {checklistsLoading ? (
                  <ChecklistEmptyText>Loading checklists…</ChecklistEmptyText>
                ) : checklists.length === 0 ? (
                  !showChecklistInput && <ChecklistEmptyText>No checklists yet for this event.</ChecklistEmptyText>
                ) : (
                  <ChecklistList>
                    {checklists.map((checklist) => (
                      <ChecklistCard
                        key={checklist.id}
                        checklist={checklist}
                        expanded={expandedChecklistId === checklist.id}
                        onToggle={() =>
                          setExpandedChecklistId((prev) => (prev === checklist.id ? null : checklist.id))
                        }
                        onTaskAdded={loadChecklists}
                      />
                    ))}
                  </ChecklistList>
                )}
              </Field>
            )}

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
  background: rgba(0, 0, 0, 0.7);
  z-index: 100;
`;

const Content = styled(Dialog.Content)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  width: 460px;
  max-width: 95vw;
  z-index: 101;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const ModalTitle = styled.h2`
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 600;
  color: var(--foreground);
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
  color: var(--text-tertiary);
`;

const Input = styled.input`
  padding: 8px 10px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  font-size: 14px;
  color: var(--foreground);
  background: var(--input-bg);
  outline: none;
  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
  }
`;

const Textarea = styled.textarea`
  padding: 8px 10px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  font-size: 14px;
  color: var(--foreground);
  background: var(--input-bg);
  resize: vertical;
  outline: none;
  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
  }
`;

const ErrorMsg = styled.p`
  color: var(--danger-text);
  font-size: 13px;
  margin: 0;
`;

const ChecklistSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const AddChecklistButton = styled.button`
  padding: 4px 10px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  background: var(--surface-alt);
  font-size: 12px;
  font-weight: 500;
  color: var(--foreground);
  cursor: pointer;
  &:hover { background: var(--sidebar-border); }
`;

const ChecklistEmptyText = styled.p`
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0;
`;

const ChecklistList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 260px;
  overflow-y: auto;
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
  border: 1px solid var(--border-light);
  border-radius: 6px;
  background: var(--surface-alt);
  font-size: 14px;
  cursor: pointer;
  color: var(--text-tertiary);
  &:hover:not(:disabled) { background: var(--sidebar-border); }
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
