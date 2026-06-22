'use client';

import React, { useState, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import {
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import type { CalendarView, CalendarEvent, Category } from '../../lib/types';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../lib/api';
import CalendarHeader from './CalendarHeader';
import DayView from './DayView';
import WeekView from './WeekView';
import MonthView from './MonthView';
import EventModal from './EventModal';
import ManageCategoriesModal from './ManageCategoriesModal';
import type { SlotClickPayload } from './TimeGrid';

interface ModalState {
  open: boolean;
  initialSlot?: { date: Date; time: string };
  initialEvent?: CalendarEvent;
}

function getRange(date: Date, view: CalendarView): { from: Date; to: Date } {
  switch (view) {
    case 'day': {
      const from = startOfDay(date);
      const to = endOfDay(date);
      return { from, to };
    }
    case 'week': {
      const from = startOfWeek(date, { weekStartsOn: 1 });
      const to = endOfWeek(date, { weekStartsOn: 1 });
      return { from, to };
    }
    case 'month': {
      const from = startOfMonth(date);
      const to = endOfMonth(date);
      return { from, to };
    }
  }
}

export default function CalendarLayout() {
  const [currentView, setCurrentView] = useState<CalendarView>('week');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [modalState, setModalState] = useState<ModalState>({ open: false });
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const today = useMemo(() => new Date(), []);
  const range = useMemo(() => getRange(currentDate, currentView), [currentDate, currentView]);

  const { events, isLoading, error, createEvent, updateEvent, deleteEvent, refetch } =
    useCalendarEvents({ from: range.from, to: range.to });

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  async function handleCreateCategory(name: string, color: string) {
    await createCategory({ name, color });
    const updated = await getCategories();
    setCategories(updated);
  }

  async function handleUpdateCategory(id: string, name: string, color: string) {
    await updateCategory(id, { name, color });
    const updated = await getCategories();
    setCategories(updated);
  }

  async function handleDeleteCategory(id: string) {
    await deleteCategory(id);
    const updated = await getCategories();
    setCategories(updated);
    // Refetch events to show updated colors immediately
    refetch();
  }

  function handleSlotClick(payload: SlotClickPayload) {
    setModalState({ open: true, initialSlot: { date: payload.date, time: payload.time } });
  }

  function handleEventClick(event: CalendarEvent) {
    setModalState({ open: true, initialEvent: event });
  }

  function handleDayClick(date: Date) {
    setCurrentDate(date);
    setCurrentView('day');
  }

  return (
    <LayoutRoot>
      <CalendarHeader
        currentDate={currentDate}
        currentView={currentView}
        onDateChange={setCurrentDate}
        onViewChange={setCurrentView}
        onManageCategories={() => setShowManageCategories(true)}
      />

      {isLoading && (
        <LoadingOverlay>
          <Spinner />
        </LoadingOverlay>
      )}

      {error && (
        <ErrorBanner>
          {error}
          <RetryButton onClick={refetch}>Retry</RetryButton>
        </ErrorBanner>
      )}

      <ViewArea>
        {currentView === 'day' && (
          <DayView
            currentDate={currentDate}
            events={events}
            todayDate={today}
            onSlotClick={handleSlotClick}
            onEventClick={handleEventClick}
          />
        )}
        {currentView === 'week' && (
          <WeekView
            currentDate={currentDate}
            events={events}
            todayDate={today}
            onSlotClick={handleSlotClick}
            onEventClick={handleEventClick}
          />
        )}
        {currentView === 'month' && (
          <MonthView
            currentDate={currentDate}
            events={events}
            onSlotClick={handleSlotClick}
            onEventClick={handleEventClick}
            onDayClick={handleDayClick}
          />
        )}
      </ViewArea>

      <EventModal
        state={modalState}
        onClose={() => setModalState({ open: false })}
        onCreateEvent={createEvent}
        onUpdateEvent={updateEvent}
        onDeleteEvent={deleteEvent}
        categories={categories}
      />

      <ManageCategoriesModal
        open={showManageCategories}
        onClose={() => setShowManageCategories(false)}
        categories={categories}
        onCreateCategory={handleCreateCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
      />
    </LayoutRoot>
  );
}

const LayoutRoot = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

const ViewArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const LoadingOverlay = styled.div`
  display: flex;
  justify-content: center;
  padding: 8px;
`;

const Spinner = styled.div`
  width: 24px;
  height: 24px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ErrorBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fef2f2;
  color: #ef4444;
  padding: 8px 16px;
  font-size: 14px;
  border-bottom: 1px solid #fecaca;
`;

const RetryButton = styled.button`
  padding: 4px 10px;
  border: 1px solid #ef4444;
  border-radius: 4px;
  background: transparent;
  color: #ef4444;
  font-size: 13px;
  cursor: pointer;
  &:hover { background: #fef2f2; }
`;
