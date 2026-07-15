import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../lib/proxy';

export async function GET(req: NextRequest) {
  return proxyToBackend(req, '/api/events');
}

export async function POST(req: NextRequest) {
  return proxyToBackend(req, '/api/events', { method: 'POST' });
}
