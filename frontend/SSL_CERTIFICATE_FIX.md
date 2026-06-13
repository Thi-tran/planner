# SSL Certificate Error Solution

## Issue
When running the frontend, you may encounter an error like:
```
Unhandled Rejection: TypeError: fetch failed
  [cause]: Error: self-signed certificate in certificate chain
    code: 'SELF_SIGNED_CERT_IN_CHAIN'
```

## Root Cause
This error occurs when:
1. The Next.js server makes a fetch request to the backend
2. The backend is served over HTTPS with a self-signed SSL certificate
3. Node.js rejects the certificate as invalid/untrusted

## Solutions

### Solution 1: Use HTTP (Recommended for Local Development)
The simplest solution is to ensure your backend is accessible via HTTP:

1. Make sure `API_URL` is set to HTTP:
   ```bash
   export API_URL=http://localhost:8080
   npm run dev
   ```

2. Or create a `.env.local` file in the frontend directory:
   ```env
   API_URL=http://localhost:8080
   ```

### Solution 2: Accept Self-Signed Certificates (Development Only)
If your backend uses HTTPS with a self-signed certificate, the application now automatically handles it.

**How it works:**
- A new utility file `lib/server-fetch.ts` provides a `fetchWithInsecureHttps()` function
- This function creates an HTTPS agent that ignores certificate validation
- All API routes now use this function automatically

**Setup:**
1. Set your API_URL to the HTTPS endpoint:
   ```env
   API_URL=https://localhost:8443
   ```

2. The fetch requests will automatically work with self-signed certificates

**⚠️ WARNING:** This approach is **ONLY for development**. Never use `rejectUnauthorized: false` in production!

### Solution 3: Use Proper SSL Certificates (Production)
For production environments:

1. Obtain valid SSL certificates from a trusted CA
2. Configure your backend/proxy server with the valid certificates
3. Set `API_URL` to your HTTPS endpoint
4. Remove the insecure certificate handling (the code won't use it with valid certificates)

## Files Modified

- `app/api/events/route.ts` - Updated to use `fetchWithInsecureHttps()`
- `app/api/events/[id]/route.ts` - Updated to use `fetchWithInsecureHttps()`
- `lib/server-fetch.ts` - New utility for secure fetch with development fallback
- `.env.local.example` - Configuration template

## How the Fix Works

The `fetchWithInsecureHttps()` utility in `lib/server-fetch.ts`:
1. Checks if the URL is HTTPS
2. If yes, uses an HTTPS agent with `rejectUnauthorized: false`
3. If no (HTTP), uses the default behavior
4. This only affects server-side API routes, not client-side code

## Environment Variables

- `API_URL`: The backend server URL (default: `http://localhost:8080`)
  - Example: `http://localhost:8080` (local development)
  - Example: `https://api.example.com` (production)

## Testing

1. **Local Development (Docker):**
   ```bash
   # Terminal 1: Start the backend
   docker-compose up

   # Terminal 2: Start the frontend
   cd frontend
   npm install
   npm run dev
   ```

2. **Custom Backend:**
   ```bash
   # Set the API URL
   export API_URL=http://your-backend-url:port
   npm run dev
   ```

## Troubleshooting

If you still get SSL errors:
1. Verify `API_URL` is accessible from your machine
2. Check if the backend is running: `curl -I $API_URL/api/events` (or use `-k` flag for self-signed certs)
3. Ensure Node.js is up to date: `node --version` (recommend v18+)
4. Clear Next.js cache: `rm -rf .next && npm run build`

## Related Documentation
- Next.js API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Node.js HTTPS Agent: https://nodejs.org/api/https.html#https_class_https_agent

