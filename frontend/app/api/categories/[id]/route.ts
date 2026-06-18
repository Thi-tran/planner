import { NextRequest, NextResponse } from 'next/server';
import { fetchWithInsecureHttps } from '@/lib/server-fetch';

const BACKEND = process.env.API_URL ?? 'http://localhost:8080';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const res = await fetchWithInsecureHttps(`${BACKEND}/api/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
