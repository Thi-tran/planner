import { NextRequest, NextResponse } from 'next/server';
import { fetchWithInsecureHttps } from '@/lib/server-fetch';

const BACKEND = process.env.API_URL ?? 'http://localhost:8080';

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.toString();
  const url = `${BACKEND}/api/events${search ? `?${search}` : ''}`;
  const res = await fetchWithInsecureHttps(url, { cache: 'no-store' });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetchWithInsecureHttps(`${BACKEND}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
