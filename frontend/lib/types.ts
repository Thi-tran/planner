export type CalendarView = 'day' | 'week' | 'month';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO 8601 UTC
  endTime: string;   // ISO 8601 UTC
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventRequest {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  color?: string;
}
