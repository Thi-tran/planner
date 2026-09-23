import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../../../lib/proxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { id, eventId } = await params;
  return proxyToBackend(req, `/api/projects/${id}/events/${eventId}/checklists`);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { id, eventId } = await params;
  return proxyToBackend(req, `/api/projects/${id}/events/${eventId}/checklists`, { method: 'POST' });
}
