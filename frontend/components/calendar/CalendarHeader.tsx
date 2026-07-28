'use client';

import React from 'react';
import styled from 'styled-components';
import { format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from 'date-fns';
import type { CalendarView } from '../../lib/types';

interface CalendarHeaderProps {
  currentDate: Date;
  currentView: CalendarView;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
  onManageCategories: () => void;
}

function getDateLabel(date: Date, view: CalendarView): string {
  switch (view) {
    case 'day':
      return format(date, 'MMMM d, yyyy');
    case 'week': {
      const startOfWeek = new Date(date);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      const endOfWeek = addDays(startOfWeek, 6);
      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${format(startOfWeek, 'MMMM d')} – ${format(endOfWeek, 'd, yyyy')}`;
      }
      return `${format(startOfWeek, 'MMM d')} – ${format(endOfWeek, 'MMM d, yyyy')}`;
    }
    case 'month':
      return format(date, 'MMMM yyyy');
  }
}

function navigateBack(date: Date, view: CalendarView): Date {
  switch (view) {
    case 'day': return subDays(date, 1);
    case 'week': return subWeeks(date, 1);
    case 'month': return subMonths(date, 1);
  }
}

function navigateForward(date: Date, view: CalendarView): Date {
  switch (view) {
    case 'day': return addDays(date, 1);
    case 'week': return addWeeks(date, 1);
    case 'month': return addMonths(date, 1);
  }
}

export default function CalendarHeader({
  currentDate,
  currentView,
  onDateChange,
  onViewChange,
  onManageCategories,
}: CalendarHeaderProps) {
  return (
    <Header>
      <LeftGroup>
        <TodayButton onClick={() => onDateChange(new Date())}>Today</TodayButton>
        <NavButton onClick={() => onDateChange(navigateBack(currentDate, currentView))} aria-label="Previous">
          &#8249;
        </NavButton>
        <NavButton onClick={() => onDateChange(navigateForward(currentDate, currentView))} aria-label="Next">
          &#8250;
        </NavButton>
        <DateLabel>{getDateLabel(currentDate, currentView)}</DateLabel>
      </LeftGroup>
      <ViewSwitcher>
        {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
          <ViewButton key={v} $active={currentView === v} onClick={() => onViewChange(v)}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </ViewButton>
        ))}
      </ViewSwitcher>
      <ManageButton onClick={onManageCategories}>
        Manage categories
      </ManageButton>
    </Header>
  );
}

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
`;

const LeftGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TodayButton = styled.button`
  padding: 6px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
  color: #374151;
  &:hover {
    background: #f8fafc;
  }
`;

const NavButton = styled.button`
  padding: 4px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  color: #374151;
  &:hover {
    background: #f8fafc;
  }
`;

const DateLabel = styled.span`
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin-left: 8px;
`;

const ViewSwitcher = styled.div`
  display: flex;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  overflow: hidden;
`;

const ViewButton = styled.button<{ $active: boolean }>`
  padding: 6px 14px;
  border: none;
  border-right: 1px solid #cbd5e1;
  background: ${({ $active }) => ($active ? '#3b82f6' : '#fff')};
  color: ${({ $active }) => ($active ? '#fff' : '#374151')};
  font-size: 14px;
  cursor: pointer;
  &:last-child {
    border-right: none;
  }
  &:hover {
    background: ${({ $active }) => ($active ? '#2563eb' : '#f8fafc')};
  }
`;

const ManageButton = styled.button`
  padding: 6px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
  color: #374151;
  &:hover {
    background: #f8fafc;
  }
`;
