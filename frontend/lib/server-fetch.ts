import https from 'https';

/**
 * Create an HTTPS agent that ignores self-signed certificates
 * ⚠️ WARNING: Use ONLY for development!
 * Never use in production - this is a security risk
 */
const insecureHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * Fetch with support for self-signed HTTPS certificates (development only)
 * 
 * This is useful when:
 * - Backend is behind an HTTPS proxy with self-signed certificate
 * - API_URL environment variable points to an HTTPS endpoint with self-signed cert
 * 
 * For production, ensure proper SSL/TLS certificates are installed
 * 
 * @param url - The URL to fetch from
 * @param options - Standard fetch options
 * @returns Promise<Response>
 */
export async function fetchWithInsecureHttps(url: string, options?: RequestInit): Promise<Response> {
  const isHttps = url.startsWith('https');
  
  return fetch(url, {
    ...options,
    // @ts-ignore - agent is not officially part of fetch but Node.js supports it
    agent: isHttps ? insecureHttpsAgent : undefined,
  });
}

