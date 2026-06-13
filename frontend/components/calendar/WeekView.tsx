'use client';

import React from 'react';
import { startOfWeek, eachDayOfInterval, addDays } from 'date-fns';
import TimeGrid, { type SlotClickPayload } from './TimeGrid';
import type { CalendarEvent } from '../../lib/types';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  todayDate: Date;
  onSlotClick: (payload: SlotClickPayload) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export default function WeekView({
  currentDate,
  events,
  todayDate,
  onSlotClick,
  onEventClick,
}: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const columns = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  return (
    <TimeGrid
      columns={columns}
      events={events}
      todayDate={todayDate}
      onSlotClick={onSlotClick}
      onEventClick={onEventClick}
    />
  );
}
