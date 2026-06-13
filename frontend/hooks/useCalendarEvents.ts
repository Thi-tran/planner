'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CalendarEvent, EventRequest } from '../lib/types';
import * as api from '../lib/api';

interface UseCalendarEventsOptions {
  from: Date;
  to: Date;
}

interface UseCalendarEventsResult {
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  createEvent: (data: EventRequest) => Promise<void>;
  updateEvent: (id: string, data: EventRequest) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useCalendarEvents({ from, to }: UseCalendarEventsOptions): UseCalendarEventsResult {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromISO = from.toISOString();
  const toISO = to.toISOString();

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getEvents(new Date(fromISO), new Date(toISO));
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, [fromISO, toISO]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = useCallback(async (data: EventRequest) => {
    await api.createEvent(data);
    await fetchEvents();
  }, [fetchEvents]);

  const updateEvent = useCallback(async (id: string, data: EventRequest) => {
    await api.updateEvent(id, data);
    await fetchEvents();
  }, [fetchEvents]);

  const deleteEvent = useCallback(async (id: string) => {
    await api.deleteEvent(id);
    await fetchEvents();
  }, [fetchEvents]);

  return { events, isLoading, error, createEvent, updateEvent, deleteEvent, refetch: fetchEvents };
}
