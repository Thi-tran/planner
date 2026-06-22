import type { CalendarEvent, EventRequest, Category, CategoryRequest } from './types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function getEvents(from?: Date, to?: Date): Promise<CalendarEvent[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from.toISOString());
  if (to) params.set('to', to.toISOString());
  const query = params.toString() ? `?${params.toString()}` : '';
  return request<CalendarEvent[]>(`/api/events${query}`);
}

export async function getEvent(id: string): Promise<CalendarEvent> {
  return request<CalendarEvent>(`/api/events/${id}`);
}

export async function createEvent(data: EventRequest): Promise<CalendarEvent> {
  return request<CalendarEvent>('/api/events', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateEvent(id: string, data: EventRequest): Promise<CalendarEvent> {
  return request<CalendarEvent>(`/api/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteEvent(id: string): Promise<void> {
  return request<void>(`/api/events/${id}`, { method: 'DELETE' });
}


export async function getCategories(): Promise<Category[]> {
  return request<Category[]>('/api/categories');
}

export async function createCategory(data: CategoryRequest): Promise<Category> {
  return request<Category>('/api/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCategory(id: string, data: CategoryRequest): Promise<Category> {
  return request<Category>(`/api/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
