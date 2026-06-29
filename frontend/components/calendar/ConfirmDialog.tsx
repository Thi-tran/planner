'use client';

import React from 'react';
import styled from 'styled-components';
import * as AlertDialog from '@radix-ui/react-alert-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: 'danger' | 'default';
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <Overlay />
        <Content>
          <AlertDialog.Title asChild>
            <Title>{title}</Title>
          </AlertDialog.Title>
          <AlertDialog.Description asChild>
            <Description>{description}</Description>
          </AlertDialog.Description>
          <Actions>
            <AlertDialog.Cancel asChild>
              <CancelButton disabled={loading}>{cancelText}</CancelButton>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <ConfirmButton
                $variant={variant}
                onClick={(e) => {
                  e.preventDefault();
                  onConfirm();
                }}
                disabled={loading}
              >
                {loading ? 'Deleting...' : confirmText}
              </ConfirmButton>
            </AlertDialog.Action>
          </Actions>
        </Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

const Overlay = styled(AlertDialog.Overlay)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 102;
`;

const Content = styled(AlertDialog.Content)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  width: 400px;
  max-width: 90vw;
  z-index: 103;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
`;

const Title = styled.h2`
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
`;

const Description = styled.p`
  margin: 0 0 20px;
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const CancelButton = styled.button`
  padding: 8px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
  color: #374151;
  &:hover:not(:disabled) {
    background: #f8fafc;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ConfirmButton = styled.button<{ $variant: 'danger' | 'default' }>`
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: ${({ $variant }) => ($variant === 'danger' ? '#ef4444' : '#3b82f6')};
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  &:hover:not(:disabled) {
    background: ${({ $variant }) => ($variant === 'danger' ? '#dc2626' : '#2563eb')};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
