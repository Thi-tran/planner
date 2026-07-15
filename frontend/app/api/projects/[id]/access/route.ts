import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../lib/proxy';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(req, `/api/projects/${id}/access`, { method: 'PATCH', body: null });
}
