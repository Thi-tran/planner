import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.API_URL ?? 'http://localhost:8080';

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.toString();
  const url = `${BACKEND}/api/events${search ? `?${search}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${BACKEND}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
