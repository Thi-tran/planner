export type CalendarView = 'day' | 'week' | 'month';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO 8601 UTC
  endTime: string;   // ISO 8601 UTC
  categoryId?: string;
  resolvedColor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventRequest {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  categoryId?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface CategoryRequest {
  name: string;
  color: string;
}
