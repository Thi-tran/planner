import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../lib/proxy';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(req, `/api/categories/${id}`, { method: 'PUT' });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(req, `/api/categories/${id}`, { method: 'DELETE', body: null });
}
