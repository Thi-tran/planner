'use client';

import React from 'react';
import styled from 'styled-components';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import type { CalendarEvent } from '../../lib/types';
import type { SlotClickPayload } from './TimeGrid';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onSlotClick: (payload: SlotClickPayload) => void;
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
}

export default function MonthView({
  currentDate,
  events,
  onSlotClick,
  onEventClick,
  onDayClick,
}: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Container>
      <WeekHeader>
        {WEEK_DAYS.map((d) => <WeekDayLabel key={d}>{d}</WeekDayLabel>)}
      </WeekHeader>
      <Grid>
        {days.map((day) => {
          const dayEvents = events.filter((ev) => isSameDay(new Date(ev.startTime), day));
          const outside = !isSameMonth(day, currentDate);
          const today = isToday(day);

          return (
            <DayCell
              key={day.toISOString()}
              $outside={outside}
              onClick={() => onSlotClick({ date: day, time: '09:00' })}
            >
              <DayCellHeader onClick={(e) => { e.stopPropagation(); onDayClick(day); }}>
                <DayNum $today={today}>{format(day, 'd')}</DayNum>
              </DayCellHeader>
              <EventList>
                {dayEvents.slice(0, 3).map((ev) => (
                  <EventChip
                    key={ev.id}
                    $color={ev.resolvedColor ?? '#3b82f6'}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    title={ev.title}
                  >
                    {ev.title}
                  </EventChip>
                ))}
                {dayEvents.length > 3 && (
                  <MoreLabel onClick={(e) => { e.stopPropagation(); onDayClick(day); }}>
                    +{dayEvents.length - 3} more
                  </MoreLabel>
                )}
              </EventList>
            </DayCell>
          );
        })}
      </Grid>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: auto;
`;

const WeekHeader = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid #e2e8f0;
`;

const WeekDayLabel = styled.div`
  text-align: center;
  padding: 8px 0;
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  flex: 1;
`;

const DayCell = styled.div<{ $outside: boolean }>`
  border-right: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  min-height: 100px;
  padding: 4px;
  background: ${({ $outside }) => ($outside ? '#f8fafc' : '#fff')};
  cursor: pointer;
  &:nth-child(7n) {
    border-right: none;
  }
  &:hover {
    background: #f1f5f9;
  }
`;

const DayCellHeader = styled.div`
  display: flex;
  justify-content: flex-end;
  padding-bottom: 2px;
`;

const DayNum = styled.span<{ $today: boolean }>`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 13px;
  font-weight: ${({ $today }) => ($today ? '700' : '400')};
  background: ${({ $today }) => ($today ? '#2563eb' : 'transparent')};
  color: ${({ $today }) => ($today ? '#fff' : '#1e293b')};
`;

const EventList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const EventChip = styled.div<{ $color: string }>`
  background: ${({ $color }) => $color};
  color: #fff;
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
`;

const MoreLabel = styled.div`
  font-size: 11px;
  color: #64748b;
  padding: 1px 4px;
  cursor: pointer;
`;
