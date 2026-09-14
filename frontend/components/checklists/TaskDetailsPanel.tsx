'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { ChecklistTask, TaskRequest, MembershipResponse } from '@/lib/types';
import { getTask, updateTask, deleteTask, addComment, getMembers } from '@/lib/api';
import * as Dialog from '@radix-ui/react-alert-dialog';

interface TaskDetailsPanelProps {
  taskId: string;
  checklistId: string;
  checklistName: string;
  checklistColor: string;
  projectId: string;
  onClose: () => void;
  onTaskDeleted: () => void;
  onTaskUpdated: () => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  canNavigatePrev?: boolean;
  canNavigateNext?: boolean;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type FieldName = 'title' | 'details' | 'status' | 'priority' | 'assignedTo' | 'deadline';

interface SaveRequest {
  field: FieldName;
  payload: Partial<TaskRequest> & { status?: string };
}

export default function TaskDetailsPanel({
  taskId,
  checklistId: _checklistId,
  checklistName,
  checklistColor,
  projectId,
  onClose,
  onTaskDeleted,
  onTaskUpdated,
  onNavigatePrev,
  onNavigateNext,
  canNavigatePrev = false,
  canNavigateNext = false,
}: TaskDetailsPanelProps) {
  const [task, setTask] = useState<ChecklistTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Global save state for header indicator
  const [globalSaveState, setGlobalSaveState] = useState<SaveState>('idle');
  const [lastError, setLastError] = useState<SaveRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Per-field save states
  const [fieldStates, setFieldStates] = useState<Record<FieldName, SaveState>>({
    title: 'idle',
    details: 'idle',
    status: 'idle',
    priority: 'idle',
    assignedTo: 'idle',
    deadline: 'idle',
  });
  
  // Edit states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'todo' | 'done'>('todo');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<string | null>(null);
  
  // Comment state
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  
  // Members for assignee dropdown
  const [members, setMembers] = useState<MembershipResponse[]>([]);
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Close confirmation for unsaved changes
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  
  // Request queue
  const saveQueueRef = useRef<SaveRequest[]>([]);
  const isProcessingRef = useRef(false);
  
  // Debounce timers
  const titleDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const detailsDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Auto-dismiss timer for "saved" state
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fetch task details
  useEffect(() => {
    let mounted = true;
    
    const loadTask = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data = await getTask(taskId);
        
        if (!mounted) return;
        
        setTask(data);
        
        // Initialize edit states
        setTitle(data.title);
        setDescription(data.details || '');
        setStatus(data.status);
        setPriority(data.priority);
        setAssignedTo(data.assignedTo);
        setDeadline(data.deadline);
      } catch (err) {
        if (!mounted) return;
        setLoadError('Failed to load task details');
        console.error('Error loading task:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    loadTask();
    
    return () => {
      mounted = false;
    };
  }, [taskId]);

  // Fetch project members
  useEffect(() => {
    let mounted = true;
    
    const fetchMembers = async () => {
      try {
        const data = await getMembers(projectId);
        if (mounted) {
          setMembers(data);
        }
      } catch (err) {
        if (mounted) {
          console.error('Error loading members:', err);
        }
      }
    };
    
    fetchMembers();
    
    return () => {
      mounted = false;
    };
  }, [projectId]);
  
  // Declare processQueue ref first
  const processQueueRef = useRef<(() => Promise<void>) | null>(null);
  
  // Process save queue - using ref to avoid circular dependencies
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || saveQueueRef.current.length === 0) {
      return;
    }
    
    isProcessingRef.current = true;
    setIsProcessing(true);
    const request = saveQueueRef.current[0];
    
    // Update field state to saving
    setFieldStates(prev => ({ ...prev, [request.field]: 'saving' }));
    setGlobalSaveState('saving');
    
    try {
      await updateTask(taskId, request.payload);
      
      // Success: update field state to saved
      setFieldStates(prev => ({ ...prev, [request.field]: 'saved' }));
      setGlobalSaveState('saved');
      setLastError(null);
      
      // Auto-dismiss "saved" state after 2000ms (global) and 1500ms (field)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => {
        setGlobalSaveState('idle');
      }, 2000);
      
      setTimeout(() => {
        setFieldStates(prev => ({ ...prev, [request.field]: 'idle' }));
      }, 1500);
      
      // Notify parent of update for optimistic list sync
      onTaskUpdated();
      
      // Remove from queue
      saveQueueRef.current.shift();
      
      // Process next item in queue if any using ref
      setTimeout(() => {
        if (saveQueueRef.current.length > 0 && processQueueRef.current) {
          processQueueRef.current();
        }
      }, 0);
      
    } catch (err) {
      console.error('Error saving task:', err);
      
      // Error: update field state to error
      setFieldStates(prev => ({ ...prev, [request.field]: 'error' }));
      setGlobalSaveState('error');
      setLastError(request);
      
      // Don't remove from queue - keep for retry
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [taskId, onTaskUpdated]);
  
  // Store processQueue in ref for recursive calls
  useEffect(() => {
    processQueueRef.current = processQueue;
  }, [processQueue]);
  
  // Queue a save request
  const queueSave = useCallback((field: FieldName, payload: Partial<TaskRequest> & { status?: string }) => {
    // Add to queue
    saveQueueRef.current.push({ field, payload });
    
    // Start processing if not already processing
    setTimeout(() => {
      if (!isProcessingRef.current && saveQueueRef.current.length > 0 && processQueueRef.current) {
        processQueueRef.current();
      }
    }, 0);
  }, []);
  
  // Retry last failed request
  const handleRetry = useCallback(() => {
    if (lastError) {
      setLastError(null);
      // Re-add to front of queue
      saveQueueRef.current.unshift(lastError);
      processQueue();
    }
  }, [lastError, processQueue]);
  
  // Title change with 300ms debounce
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    
    titleDebounceRef.current = setTimeout(() => {
      if (task && newTitle !== task.title && newTitle.trim()) {
        queueSave('title', { 
          title: newTitle, 
          details: description || ''
        });
      }
    }, 300);
  };
  
  // Details change with 300ms debounce
  const handleDetailsChange = (newDetails: string) => {
    setDescription(newDetails);
    
    if (detailsDebounceRef.current) clearTimeout(detailsDebounceRef.current);
    
    detailsDebounceRef.current = setTimeout(() => {
      if (task && newDetails !== (task.details || '')) {
        queueSave('details', { 
          title, 
          details: newDetails || ''
        });
      }
    }, 300);
  };
  
  // Status change (immediate)
  const handleStatusChange = (newStatus: 'todo' | 'done') => {
    setStatus(newStatus);
    queueSave('status', { 
      title, 
      details: description || '', 
      status: newStatus 
    });
  };
  
  // Priority change (immediate)
  const handlePriorityChange = (newPriority: 'low' | 'medium' | 'high') => {
    setPriority(newPriority);
    queueSave('priority', { 
      title, 
      details: description || '', 
      priority: newPriority 
    });
  };
  
  // Assignee change (immediate)
  const handleAssigneeChange = (newAssignedTo: string) => {
    const value = newAssignedTo === 'unassigned' ? null : newAssignedTo;
    setAssignedTo(value);
    queueSave('assignedTo', { 
      title, 
      details: description || '', 
      assignedTo: value || undefined 
    });
  };
  
  // Deadline change (immediate)
  const handleDeadlineChange = (newDeadline: string) => {
    const value = newDeadline || null;
    setDeadline(value);
    queueSave('deadline', { 
      title, 
      details: description || '', 
      deadline: value || undefined 
    });
  };
  
  // Post comment
  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    
    try {
      setPostingComment(true);
      await addComment(taskId, commentText.trim());
      setCommentText('');
      // Refresh task to get new comment
      const refreshedTask = await getTask(taskId);
      setTask(refreshedTask);
    } catch (err) {
      setLoadError('Failed to post comment');
      console.error('Error posting comment:', err);
    } finally {
      setPostingComment(false);
    }
  };
  
  // Delete task
  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteTask(taskId);
      onTaskDeleted();
      onClose();
    } catch (err) {
      setLoadError('Failed to delete task');
      console.error('Error deleting task:', err);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };
  
  // Close panel with unsaved check
  const handleCloseClick = useCallback(() => {
    // Check if save is in flight or if there's an error
    if (isProcessing || lastError) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  }, [isProcessing, lastError, onClose]);
  
  const handleForceClose = () => {
    setShowCloseConfirm(false);
    onClose();
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseClick();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCloseClick]);

  // Comment textarea Enter key handling
  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePostComment();
    }
  };
  
  // Cleanup timers
  useEffect(() => {
    return () => {
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
      if (detailsDebounceRef.current) clearTimeout(detailsDebounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  if (loading) {
    return (
      <>
        <Overlay onClick={handleCloseClick} />
        <Panel>
          <LoadingContainer>
            <LoadingSpinner />
            <LoadingText>Loading task...</LoadingText>
          </LoadingContainer>
        </Panel>
      </>
    );
  }

  if (loadError && !task) {
    const retryLoad = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data = await getTask(taskId);
        setTask(data);
        setTitle(data.title);
        setDescription(data.details || '');
        setStatus(data.status);
        setPriority(data.priority);
        setAssignedTo(data.assignedTo);
        setDeadline(data.deadline);
      } catch (err) {
        setLoadError('Failed to load task details');
        console.error('Error loading task:', err);
      } finally {
        setLoading(false);
      }
    };
    
    return (
      <>
        <Overlay onClick={handleCloseClick} />
        <Panel>
          <ErrorContainer>
            <ErrorText>{loadError}</ErrorText>
            <RetryButton onClick={retryLoad}>Retry</RetryButton>
            <CloseButton onClick={onClose}>Close</CloseButton>
          </ErrorContainer>
        </Panel>
      </>
    );
  }

  if (!task) return null;

  return (
    <>
      <Overlay onClick={handleCloseClick} />
      <Panel>
        {/* Header */}
        <Header>
          <ChecklistInfo>
            <ChecklistDot $color={checklistColor} />
            <ChecklistName>{checklistName}</ChecklistName>
          </ChecklistInfo>
          <HeaderActions>
            {/* Save indicator */}
            {globalSaveState !== 'idle' && (
              <SaveIndicator 
                $state={globalSaveState}
                onClick={globalSaveState === 'error' ? handleRetry : undefined}
              >
                {globalSaveState === 'saving' && (
                  <>
                    <SpinnerIcon />
                    <span>Saving…</span>
                  </>
                )}
                {globalSaveState === 'saved' && (
                  <>
                    <CheckIcon>✓</CheckIcon>
                    <span>Saved</span>
                  </>
                )}
                {globalSaveState === 'error' && (
                  <>
                    <WarningIcon>⚠</WarningIcon>
                    <span>Failed — retry</span>
                  </>
                )}
              </SaveIndicator>
            )}
            <NavButton
              onClick={onNavigatePrev}
              disabled={!canNavigatePrev}
              title="Previous task"
            >
              ←
            </NavButton>
            <NavButton
              onClick={onNavigateNext}
              disabled={!canNavigateNext}
              title="Next task"
            >
              →
            </NavButton>
            <CloseButtonStyled onClick={handleCloseClick} title="Close (Esc)">
              ×
            </CloseButtonStyled>
          </HeaderActions>
        </Header>

        {/* Error banner for failed saves */}
        {lastError && (
          <ErrorBanner>
            <ErrorBannerText>
              This change wasn&apos;t saved. Check your connection and retry.
            </ErrorBannerText>
            <ErrorBannerButton onClick={handleRetry}>Retry</ErrorBannerButton>
          </ErrorBanner>
        )}

        {/* Content */}
        <Content>
          {/* Title */}
          <Section>
            <TitleInput
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={() => {
                if (titleDebounceRef.current) {
                  clearTimeout(titleDebounceRef.current);
                  if (task && title !== task.title && title.trim()) {
                    queueSave('title', { title, details: description || '' });
                  }
                }
              }}
              maxLength={500}
              placeholder="Task title"
              $state={fieldStates.title}
            />
            <CharCounter>{title.length} / 500</CharCounter>
            {fieldStates.title === 'error' && (
              <FieldError>This change wasn&apos;t saved. Fix connection and retry.</FieldError>
            )}
          </Section>

          {/* Description */}
          <Section>
            <SectionLabel>DESCRIPTION</SectionLabel>
            <DescriptionTextarea
              value={description}
              onChange={(e) => handleDetailsChange(e.target.value)}
              onBlur={() => {
                if (detailsDebounceRef.current) {
                  clearTimeout(detailsDebounceRef.current);
                  if (task && description !== (task.details || '')) {
                    queueSave('details', { title, details: description || '' });
                  }
                }
              }}
              maxLength={2000}
              placeholder="Add description..."
              rows={4}
              $state={fieldStates.details}
            />
            <CharCounter>{description.length} / 2000</CharCounter>
            {fieldStates.details === 'error' && (
              <FieldError>This change wasn&apos;t saved. Fix connection and retry.</FieldError>
            )}
          </Section>

          {/* Status */}
          <Section>
            <SectionLabel>STATUS</SectionLabel>
            <ButtonGroup>
              <StatusButton
                $active={status === 'todo'}
                $color="#E5E7EB"
                $state={status === 'todo' ? fieldStates.status : 'idle'}
                onClick={() => handleStatusChange('todo')}
              >
                To do
              </StatusButton>
              <StatusButton
                $active={status === 'done'}
                $color="#10B981"
                $state={status === 'done' ? fieldStates.status : 'idle'}
                onClick={() => handleStatusChange('done')}
              >
                Done
              </StatusButton>
            </ButtonGroup>
            {fieldStates.status === 'error' && (
              <FieldError>This change wasn&apos;t saved. Fix connection and retry.</FieldError>
            )}
          </Section>

          {/* Priority */}
          <Section>
            <SectionLabel>PRIORITY</SectionLabel>
            <ButtonGroup>
              <PriorityButton
                $active={priority === 'low'}
                $color="#10B981"
                $state={priority === 'low' ? fieldStates.priority : 'idle'}
                onClick={() => handlePriorityChange('low')}
              >
                Low
              </PriorityButton>
              <PriorityButton
                $active={priority === 'medium'}
                $color="#F59E0B"
                $state={priority === 'medium' ? fieldStates.priority : 'idle'}
                onClick={() => handlePriorityChange('medium')}
              >
                Medium
              </PriorityButton>
              <PriorityButton
                $active={priority === 'high'}
                $color="#E91E8C"
                $state={priority === 'high' ? fieldStates.priority : 'idle'}
                onClick={() => handlePriorityChange('high')}
              >
                High
              </PriorityButton>
            </ButtonGroup>
            {fieldStates.priority === 'error' && (
              <FieldError>This change wasn&apos;t saved. Fix connection and retry.</FieldError>
            )}
          </Section>

          {/* Assignee */}
          <Section>
            <SectionLabel>ASSIGNED TO</SectionLabel>
            <Select
              value={assignedTo || 'unassigned'}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              $state={fieldStates.assignedTo}
            >
              <option value="unassigned">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.userId || ''}>
                  {member.displayName || member.email}
                </option>
              ))}
            </Select>
            {fieldStates.assignedTo === 'error' && (
              <FieldError>This change wasn&apos;t saved. Fix connection and retry.</FieldError>
            )}
          </Section>

          {/* Deadline */}
          <Section>
            <SectionLabel>DEADLINE</SectionLabel>
            <DateInput
              type="date"
              value={deadline || ''}
              onChange={(e) => handleDeadlineChange(e.target.value)}
              $state={fieldStates.deadline}
            />
            {deadline && (
              <ClearButton onClick={() => handleDeadlineChange('')}>
                Clear
              </ClearButton>
            )}
            {fieldStates.deadline === 'error' && (
              <FieldError>This change wasn&apos;t saved. Fix connection and retry.</FieldError>
            )}
          </Section>

          {/* Comments */}
          <Section>
            <SectionLabel>COMMENTS ({task.comments.length})</SectionLabel>
            <CommentsContainer>
              {task.comments.length === 0 ? (
                <EmptyComments>No comments yet</EmptyComments>
              ) : (
                task.comments.map((comment) => (
                  <Comment key={comment.id}>
                    <CommentHeader>
                      <CommentAuthor>
                        {comment.user.displayName || comment.user.email}
                      </CommentAuthor>
                      <CommentTime>
                        {new Date(comment.createdAt).toLocaleString()}
                      </CommentTime>
                    </CommentHeader>
                    <CommentText>{comment.commentText}</CommentText>
                  </Comment>
                ))
              )}
            </CommentsContainer>
            
            {/* Add comment */}
            <CommentInputContainer>
              <CommentTextarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={handleCommentKeyDown}
                maxLength={2000}
                placeholder="Add a comment... (Enter to post, Shift+Enter for newline)"
                rows={3}
              />
              <PostButton
                onClick={handlePostComment}
                disabled={!commentText.trim() || postingComment}
              >
                {postingComment ? 'Posting...' : 'Post'}
              </PostButton>
            </CommentInputContainer>
          </Section>

          {/* Delete button */}
          <DeleteSection>
            <Dialog.Root open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
              <Dialog.Trigger asChild>
                <DeleteButton>🗑️ Delete task</DeleteButton>
              </Dialog.Trigger>
              <Dialog.Portal>
                <DialogOverlay />
                <DialogContent>
                  <DialogTitle>Delete this task?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. The task and all its comments will be permanently deleted.
                  </DialogDescription>
                  <DialogActions>
                    <Dialog.Cancel asChild>
                      <CancelButton>Cancel</CancelButton>
                    </Dialog.Cancel>
                    <Dialog.Action asChild>
                      <ConfirmDeleteButton onClick={handleDelete} disabled={deleting}>
                        {deleting ? 'Deleting...' : 'Delete'}
                      </ConfirmDeleteButton>
                    </Dialog.Action>
                  </DialogActions>
                </DialogContent>
              </Dialog.Portal>
            </Dialog.Root>
          </DeleteSection>
        </Content>
      </Panel>
      
      {/* Close confirmation dialog */}
      <Dialog.Root open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <Dialog.Portal>
          <DialogOverlay />
          <DialogContent>
            <DialogTitle>You have unsaved changes</DialogTitle>
            <DialogDescription>
              {isProcessing 
                ? 'A save is in progress. Closing now will lose your changes.'
                : 'Some changes failed to save. Closing now will lose those changes.'}
            </DialogDescription>
            <DialogActions>
              <Dialog.Cancel asChild>
                <CancelButton>Keep open</CancelButton>
              </Dialog.Cancel>
              <Dialog.Action asChild>
                <ConfirmDeleteButton onClick={handleForceClose}>
                  Close anyway
                </ConfirmDeleteButton>
              </Dialog.Action>
            </DialogActions>
          </DialogContent>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

// Styled components
const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1000;
  animation: fadeIn 200ms ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Panel = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 480px;
  background: white;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  animation: slideIn 200ms ease-out;

  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
`;

const ChecklistInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ChecklistDot = styled.div<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${p => p.$color};
  flex-shrink: 0;
`;

const ChecklistName = styled.span`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SaveIndicator = styled.div<{ $state: SaveState }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 12px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: ${p => p.$state === 'error' ? 'pointer' : 'default'};
  transition: all 0.2s;
  
  ${p => {
    if (p.$state === 'saving') {
      return `
        background: #EEF2FF;
        color: #6366F1;
        border: 1px solid #C7D2FE;
      `;
    }
    if (p.$state === 'saved') {
      return `
        background: #ECFDF5;
        color: #10B981;
        border: 1px solid #A7F3D0;
      `;
    }
    if (p.$state === 'error') {
      return `
        background: #FEF2F2;
        color: #EF4444;
        border: 1px solid #FECACA;
        &:hover {
          background: #FEE2E2;
        }
      `;
    }
  }}
`;

const SpinnerIcon = styled.div`
  width: 12px;
  height: 12px;
  border: 2px solid #C7D2FE;
  border-top-color: #6366F1;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const CheckIcon = styled.span`
  font-size: 14px;
  line-height: 1;
`;

const WarningIcon = styled.span`
  font-size: 14px;
  line-height: 1;
`;

const NavButton = styled.button`
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  color: #6b7280;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #cbd5e1;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const CloseButtonStyled = styled.button`
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  color: #6b7280;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &:hover {
    background: #f9fafb;
    border-color: #cbd5e1;
  }
`;

const ErrorBanner = styled.div`
  padding: 12px 24px;
  background: #FEF2F2;
  border-bottom: 1px solid #FECACA;
  font-family: 'DM Sans', sans-serif;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
`;

const ErrorBannerText = styled.span`
  font-size: 13px;
  color: #991B1B;
  flex: 1;
`;

const ErrorBannerButton = styled.button`
  font-size: 13px;
  font-weight: 500;
  color: #EF4444;
  background: white;
  border: 1px solid #EF4444;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.15s;
  
  &:hover {
    background: #FEF2F2;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
`;

const Section = styled.div`
  margin-bottom: 24px;
`;

const SectionLabel = styled.label`
  display: block;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: #6b7280;
  margin-bottom: 8px;
  letter-spacing: 0.05em;
`;

const getFieldStyles = (state: SaveState) => {
  const baseStyles = `
    transition: all 0.2s;
  `;
  
  if (state === 'saving') {
    return baseStyles + `
      border-color: #9E96D9;
      background: #FAFAFE;
    `;
  }
  if (state === 'saved') {
    return baseStyles + `
      border-color: #85D4A0;
      background: #FAFFFE;
    `;
  }
  if (state === 'error') {
    return baseStyles + `
      border-color: #E88F8F;
      background: #FDF0F0;
    `;
  }
  return baseStyles;
};

const TitleInput = styled.input<{ $state: SaveState }>`
  width: 100%;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 8px 0;
  outline: none;
  ${p => getFieldStyles(p.$state)}

  &:focus {
    border-bottom-color: ${p => p.$state === 'idle' ? '#6366F1' : 'inherit'};
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const DescriptionTextarea = styled.textarea<{ $state: SaveState }>`
  width: 100%;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #1f2937;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
  outline: none;
  resize: vertical;
  ${p => getFieldStyles(p.$state)}

  &:focus {
    border-color: ${p => p.$state === 'idle' ? '#6366F1' : 'inherit'};
    box-shadow: ${p => p.$state === 'idle' ? '0 0 0 2px rgba(99, 102, 241, 0.1)' : 'none'};
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const CharCounter = styled.div`
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: #9ca3af;
  text-align: right;
  margin-top: 4px;
`;

const FieldError = styled.div`
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: #EF4444;
  margin-top: 4px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const StatusButton = styled.button<{ $active: boolean; $color: string; $state: SaveState }>`
  flex: 1;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid ${p => p.$active ? p.$color : '#e2e8f0'};
  background: ${p => p.$active ? p.$color : 'white'};
  color: ${p => p.$active ? (p.$color === '#E5E7EB' ? '#1f2937' : 'white') : '#6b7280'};
  ${p => p.$active ? getFieldStyles(p.$state) : ''}

  &:hover {
    border-color: ${p => p.$color};
  }
`;

const PriorityButton = styled.button<{ $active: boolean; $color: string; $state: SaveState }>`
  flex: 1;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid ${p => p.$active ? p.$color : '#e2e8f0'};
  background: ${p => p.$active ? p.$color : 'white'};
  color: ${p => p.$active ? 'white' : '#6b7280'};
  ${p => p.$active ? getFieldStyles(p.$state) : ''}

  &:hover {
    border-color: ${p => p.$color};
  }
`;

const Select = styled.select<{ $state: SaveState }>`
  width: 100%;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #1f2937;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 10px 12px;
  outline: none;
  cursor: pointer;
  background: white;
  ${p => getFieldStyles(p.$state)}

  &:focus {
    border-color: ${p => p.$state === 'idle' ? '#6366F1' : 'inherit'};
    box-shadow: ${p => p.$state === 'idle' ? '0 0 0 2px rgba(99, 102, 241, 0.1)' : 'none'};
  }
`;

const DateInput = styled.input<{ $state: SaveState }>`
  width: 100%;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #1f2937;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 10px 12px;
  outline: none;
  ${p => getFieldStyles(p.$state)}

  &:focus {
    border-color: ${p => p.$state === 'idle' ? '#6366F1' : 'inherit'};
    box-shadow: ${p => p.$state === 'idle' ? '0 0 0 2px rgba(99, 102, 241, 0.1)' : 'none'};
  }
`;

const ClearButton = styled.button`
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  color: #6b7280;
  background: none;
  border: none;
  cursor: pointer;
  margin-top: 4px;
  padding: 4px;
  text-decoration: underline;

  &:hover {
    color: #1f2937;
  }
`;

const CommentsContainer = styled.div`
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 16px;
`;

const EmptyComments = styled.div`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #9ca3af;
  text-align: center;
  padding: 32px 0;
`;

const Comment = styled.div`
  padding: 12px;
  border-bottom: 1px solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }
`;

const CommentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

const CommentAuthor = styled.span`
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
`;

const CommentTime = styled.span`
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: #9ca3af;
`;

const CommentText = styled.p`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #4b5563;
  margin: 0;
  white-space: pre-wrap;
`;

const CommentInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CommentTextarea = styled.textarea`
  width: 100%;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #1f2937;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
  outline: none;
  resize: vertical;
  transition: border-color 0.15s;

  &:focus {
    border-color: #6366F1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const PostButton = styled.button`
  align-self: flex-end;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: white;
  background: #6366F1;
  border: none;
  border-radius: 6px;
  padding: 10px 24px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: #4f46e5;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DeleteSection = styled.div`
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
`;

const DeleteButton = styled.button`
  width: 100%;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #EF4444;
  background: white;
  border: 1px solid #EF4444;
  border-radius: 6px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #FEF2F2;
  }
`;

// Dialog components
const DialogOverlay = styled(Dialog.Overlay)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 2000;
`;

const DialogContent = styled(Dialog.Content)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  z-index: 2001;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
`;

const DialogTitle = styled(Dialog.Title)`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px 0;
`;

const DialogDescription = styled(Dialog.Description)`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 24px 0;
  line-height: 1.5;
`;

const DialogActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const CancelButton = styled.button`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 10px 20px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #f9fafb;
    border-color: #cbd5e1;
  }
`;

const ConfirmDeleteButton = styled.button`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: white;
  background: #EF4444;
  border: none;
  border-radius: 6px;
  padding: 10px 20px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: #DC2626;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #6366F1;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const LoadingText = styled.div`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #6b7280;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  padding: 24px;
`;

const ErrorText = styled.div`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #EF4444;
  text-align: center;
`;

const RetryButton = styled.button`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: white;
  background: #6366F1;
  border: none;
  border-radius: 6px;
  padding: 10px 24px;
  cursor: pointer;

  &:hover {
    background: #4f46e5;
  }
`;

const CloseButton = styled.button`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 10px 24px;
  cursor: pointer;

  &:hover {
    background: #f9fafb;
  }
`;
