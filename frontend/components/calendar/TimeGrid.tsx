'use client';

import React, { useRef } from 'react';
import styled from 'styled-components';
import { format, isSameDay } from 'date-fns';
import { GRID_START_HOUR, GRID_END_HOUR } from '../../lib/constants';
import type { CalendarEvent } from '../../lib/types';
import EventBlock from './EventBlock';

const PX_PER_MINUTE = 1;
const HOUR_COUNT = GRID_END_HOUR - GRID_START_HOUR;
const GRID_HEIGHT = HOUR_COUNT * 60 * PX_PER_MINUTE;

export interface SlotClickPayload {
  date: Date;
  time: string; // HH:mm
}

interface OverlappedEvent extends CalendarEvent {
  columnIndex: number;
  totalColumns: number;
}

function computeOverlaps(events: CalendarEvent[]): OverlappedEvent[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const result: OverlappedEvent[] = [];
  const groups: CalendarEvent[][] = [];

  for (const event of sorted) {
    let placed = false;
    for (const group of groups) {
      const overlaps = group.some(
        (g) =>
          new Date(g.startTime) < new Date(event.endTime) &&
          new Date(event.startTime) < new Date(g.endTime)
      );
      if (overlaps) {
        group.push(event);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([event]);
  }

  for (const group of groups) {
    group.forEach((event, idx) => {
      result.push({ ...event, columnIndex: idx, totalColumns: group.length });
    });
  }

  return result;
}

interface TimeGridProps {
  columns: Date[];
  events: CalendarEvent[];
  todayDate?: Date;
  onSlotClick: (payload: SlotClickPayload) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export default function TimeGrid({ columns, events, todayDate, onSlotClick, onEventClick }: TimeGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  const hours = Array.from({ length: HOUR_COUNT }, (_, i) => GRID_START_HOUR + i);

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, date: Date) {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top + gridRef.current.scrollTop;
    const totalMinutes = Math.floor(y / PX_PER_MINUTE) + GRID_START_HOUR * 60;
    const clampedMinutes = Math.max(
      GRID_START_HOUR * 60,
      Math.min(GRID_END_HOUR * 60 - 1, totalMinutes)
    );
    const h = Math.floor(clampedMinutes / 60);
    const m = clampedMinutes % 60;
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    onSlotClick({ date, time });
  }

  return (
    <GridContainer ref={gridRef}>
      <TimeGutter>
        {hours.map((h) => (
          <HourLabel key={h} style={{ height: 60 }}>
            {format(new Date(2000, 0, 1, h), 'h a')}
          </HourLabel>
        ))}
      </TimeGutter>

      <ColumnsArea>
        {columns.map((colDate) => {
          const isToday = todayDate ? isSameDay(colDate, todayDate) : false;
          const colEvents = events.filter((ev) => isSameDay(new Date(ev.startTime), colDate));
          const overlapped = computeOverlaps(colEvents);

          return (
            <Column key={colDate.toISOString()} $isToday={isToday}>
              <ColumnHeader $isToday={isToday}>
                <span>{format(colDate, 'EEE')}</span>
                <DayNumber $isToday={isToday}>{format(colDate, 'd')}</DayNumber>
              </ColumnHeader>
              <ColumnBody
                style={{ height: GRID_HEIGHT }}
                onClick={(e) => handleColumnClick(e, colDate)}
              >
                {hours.map((h) => (
                  <HourRow key={h} style={{ top: (h - GRID_START_HOUR) * 60 }} />
                ))}
                {overlapped.map((ev) => {
                  const start = new Date(ev.startTime);
                  const end = new Date(ev.endTime);
                  const startMin = start.getHours() * 60 + start.getMinutes();
                  const endMin = end.getHours() * 60 + end.getMinutes();
                  const topPx = (startMin - GRID_START_HOUR * 60) * PX_PER_MINUTE;
                  const heightPx = Math.max((endMin - startMin) * PX_PER_MINUTE, 20);

                  return (
                    <EventBlock
                      key={ev.id}
                      event={ev}
                      topPx={topPx}
                      heightPx={heightPx}
                      columnIndex={ev.columnIndex}
                      totalColumns={ev.totalColumns}
                      onEventClick={onEventClick}
                    />
                  );
                })}
              </ColumnBody>
            </Column>
          );
        })}
      </ColumnsArea>
    </GridContainer>
  );
}

const GridContainer = styled.div`
  display: flex;
  overflow-y: auto;
  flex: 1;
  position: relative;
`;

const TimeGutter = styled.div`
  width: 56px;
  flex-shrink: 0;
  border-right: 1px solid #e2e8f0;
  padding-top: 40px;
`;

const HourLabel = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding-right: 8px;
  font-size: 11px;
  color: #94a3b8;
  box-sizing: border-box;
`;

const ColumnsArea = styled.div`
  display: flex;
  flex: 1;
`;

const Column = styled.div<{ $isToday: boolean }>`
  flex: 1;
  border-right: 1px solid #e2e8f0;
  background: ${({ $isToday }) => ($isToday ? '#eff6ff' : '#fff')};
  &:last-child {
    border-right: none;
  }
`;

const ColumnHeader = styled.div<{ $isToday: boolean }>`
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  color: ${({ $isToday }) => ($isToday ? '#2563eb' : '#64748b')};
  font-weight: ${({ $isToday }) => ($isToday ? '700' : '400')};
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  background: inherit;
  z-index: 2;
`;

const DayNumber = styled.span<{ $isToday: boolean }>`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${({ $isToday }) => ($isToday ? '#2563eb' : 'transparent')};
  color: ${({ $isToday }) => ($isToday ? '#fff' : 'inherit')};
  font-size: 13px;
`;

const ColumnBody = styled.div`
  position: relative;
  cursor: pointer;
`;

const HourRow = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: 60px;
  border-top: 1px solid #e2e8f0;
  pointer-events: none;
`;
