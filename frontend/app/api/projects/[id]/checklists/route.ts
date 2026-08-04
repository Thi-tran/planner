import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../lib/proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(req, `/api/projects/${id}/checklists`);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(req, `/api/projects/${id}/checklists`, { method: 'POST' });
}
