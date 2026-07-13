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
  projectId: string;
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

export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate: string; // ISO date string
  endDate?: string;
  color: 'Sky Cyan' | 'Blush Pink' | 'Soft Indigo' | 'Sage Green';
  status: 'in progress' | 'completed' | 'on hold' | 'planning';
  lastAccessedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRequest {
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  color: string;
  status?: string;
}
