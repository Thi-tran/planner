'use client';

import styled from 'styled-components';
import * as Dialog from '@radix-ui/react-dialog';

interface DeleteConfirmDialogProps {
  open: boolean;
  projectName: string;
  eventCount?: number;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export default function DeleteConfirmDialog({ 
  open, 
  projectName, 
  eventCount,
  onConfirm, 
  onCancel,
  isDeleting 
}: DeleteConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(open) => !open && !isDeleting && onCancel()}>
      <Dialog.Portal>
        <Overlay />
        <Content>
          <Header>
            <WarningIcon>⚠️</WarningIcon>
            <Dialog.Title asChild>
              <Title>Delete &quot;{projectName}&quot;?</Title>
            </Dialog.Title>
          </Header>

          <Message>
            {eventCount !== undefined && eventCount > 0 ? (
              <>Deleting this project will permanently delete all {eventCount} associated event{eventCount !== 1 ? 's' : ''}. This action cannot be undone.</>
            ) : (
              <>Deleting this project will permanently delete all associated events. This action cannot be undone.</>
            )}
          </Message>

          <Actions>
            <CancelButton onClick={onCancel} disabled={isDeleting}>
              Cancel
            </CancelButton>
            <DeleteButton onClick={onConfirm} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Project'}
            </DeleteButton>
          </Actions>
        </Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const Overlay = styled(Dialog.Overlay)`
  background: rgba(0, 0, 0, 0.5);
  position: fixed;
  inset: 0;
  z-index: 52;
`;

const Content = styled(Dialog.Content)`
  background: white;
  border-radius: 12px;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90vw;
  max-width: 440px;
  padding: 24px;
  z-index: 53;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

const WarningIcon = styled.div`
  font-size: 24px;
`;

const Title = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: #1f2937;
`;

const Message = styled.p`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 24px 0;
  line-height: 1.5;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
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

const DeleteButton = styled.button`
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  background: #ef4444;
  color: white;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover:not(:disabled) {
    background: #dc2626;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
