import { NextRequest, NextResponse } from 'next/server';
import { fetchWithInsecureHttps } from '@/lib/server-fetch';

const BACKEND = process.env.API_URL ?? 'http://localhost:8080';

export async function GET() {
  const res = await fetchWithInsecureHttps(`${BACKEND}/api/categories`, { cache: 'no-store' });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetchWithInsecureHttps(`${BACKEND}/api/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
