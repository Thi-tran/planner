'use client';

import React from 'react';
import TimeGrid, { type SlotClickPayload } from './TimeGrid';
import type { CalendarEvent } from '../../lib/types';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  todayDate: Date;
  onSlotClick: (payload: SlotClickPayload) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export default function DayView({
  currentDate,
  events,
  todayDate,
  onSlotClick,
  onEventClick,
}: DayViewProps) {
  return (
    <TimeGrid
      columns={[currentDate]}
      events={events}
      todayDate={todayDate}
      onSlotClick={onSlotClick}
      onEventClick={onEventClick}
    />
  );
}
