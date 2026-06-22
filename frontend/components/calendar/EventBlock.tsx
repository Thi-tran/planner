'use client';

import React from 'react';
import styled from 'styled-components';
import { format } from 'date-fns';
import type { CalendarEvent } from '../../lib/types';

interface EventBlockProps {
  event: CalendarEvent;
  topPx: number;
  heightPx: number;
  columnIndex: number;
  totalColumns: number;
  onEventClick: (event: CalendarEvent) => void;
}

export default function EventBlock({
  event,
  topPx,
  heightPx,
  columnIndex,
  totalColumns,
  onEventClick,
}: EventBlockProps) {
  const color = event.resolvedColor ?? '#3b82f6';
  const widthPct = 100 / totalColumns;
  const leftPct = (columnIndex / totalColumns) * 100;

  const start = new Date(event.startTime);
  const end = new Date(event.endTime);

  return (
    <Block
      $color={color}
      style={{
        top: topPx,
        height: heightPx,
        width: `calc(${widthPct}% - 4px)`,
        left: `${leftPct}%`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onEventClick(event);
      }}
      title={event.title}
    >
      <EventTitle>{event.title}</EventTitle>
      {heightPx > 30 && (
        <EventTime>
          {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
        </EventTime>
      )}
    </Block>
  );
}

const Block = styled.div<{ $color: string }>`
  position: absolute;
  background: ${({ $color }) => $color};
  color: #fff;
  border-radius: 4px;
  padding: 2px 4px;
  overflow: hidden;
  cursor: pointer;
  box-sizing: border-box;
  margin-left: 2px;
  z-index: 1;
  opacity: 0.92;
  &:hover {
    opacity: 1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
`;

const EventTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const EventTime = styled.div`
  font-size: 11px;
  opacity: 0.9;
`;
