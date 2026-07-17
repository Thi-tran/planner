import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.API_URL ?? 'http://localhost:8080';

/**
 * Authenticated proxy helper. Reads the server-side JWT, attaches the Google
 * id_token as a bearer credential, forwards the request to the backend, and
 * streams the response back faithfully (including 204 empty bodies).
 *
 * Returns a 401 response immediately if there is no valid session or if the
 * token refresh has failed (error flag set).
 */
export async function proxyToBackend(
  req: NextRequest,
  backendPath: string,
  options?: { method?: string; body?: BodyInit | null }
): Promise<NextResponse> {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET!,
    secureCookie: !!process.env.VERCEL || process.env.AUTH_URL?.startsWith('https://'),
  });

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (token.error === 'RefreshTokenError') {
    return NextResponse.json({ error: 'Session expired, please sign in again' }, { status: 401 });
  }

  const idToken = token.id_token as string | undefined;
  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const search = req.nextUrl.search;
  const url = `${BACKEND}${backendPath}${search}`;

  const method = options?.method ?? req.method;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  };

  let body: BodyInit | null | undefined = options?.body;
  if (body === undefined && method !== 'GET' && method !== 'HEAD' && method !== 'DELETE') {
    body = await req.text();
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ?? null,
    cache: 'no-store',
  });

  // Pass through 204 / no-content responses without trying to parse the body
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return new NextResponse(null, { status: res.status });
  }

  const contentType = res.headers.get('content-type') ?? '';
  const responseBody = await res.text();

  return new NextResponse(responseBody, {
    status: res.status,
    headers: {
      'content-type': contentType || 'application/json',
    },
  });
}
