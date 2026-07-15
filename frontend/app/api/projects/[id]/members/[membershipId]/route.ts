import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../../lib/proxy';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; membershipId: string }> }) {
  const { id, membershipId } = await params;
  return proxyToBackend(req, `/api/projects/${id}/members/${membershipId}`, { method: 'PATCH' });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; membershipId: string }> }) {
  const { id, membershipId } = await params;
  return proxyToBackend(req, `/api/projects/${id}/members/${membershipId}`, { method: 'DELETE', body: null });
}
