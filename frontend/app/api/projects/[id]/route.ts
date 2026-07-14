import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../lib/proxy';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(req, `/api/projects/${id}`, { method: 'GET' });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(req, `/api/projects/${id}`, { method: 'PUT' });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(req, `/api/projects/${id}`, { method: 'DELETE', body: null });
}
