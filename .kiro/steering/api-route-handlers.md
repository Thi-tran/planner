---
title: Next.js API Route Handlers Pattern
inclusion: auto
tags: [nextjs, api, frontend, backend-integration]
---

# Next.js API Route Handlers Pattern

## Context

This project uses **Next.js API Route Handlers** (App Router) to proxy frontend requests to the Spring Boot backend, NOT Next.js rewrites in `next.config.ts`.

## Architecture

```
Frontend (localhost:3000)
  ↓
Next.js API Route Handler (/app/api/)
  ↓
Spring Boot Backend (localhost:8080)
```

## Critical Learning: Complete CRUD in API Routes

**When adding a new API endpoint, you MUST implement ALL HTTP methods in BOTH places:**

### Backend (Spring Boot)
Location: `backend/src/main/java/com/planner/controller/`

```java
@RestController
@RequestMapping("/api/resources")
public class ResourceController {
    @GetMapping          // GET /api/resources
    @PostMapping         // POST /api/resources
    @GetMapping("/{id}") // GET /api/resources/{id}
    @PutMapping("/{id}") // PUT /api/resources/{id}
    @DeleteMapping("/{id}") // DELETE /api/resources/{id} ⚠️ DON'T FORGET THIS!
}
```

### Frontend API Route Handlers
Location: `frontend/app/api/resources/`

**Required file structure:**
```
app/api/resources/
  ├── route.ts        # Handles GET, POST for /api/resources
  └── [id]/
      └── route.ts    # Handles GET, PUT, DELETE for /api/resources/{id}
```

**⚠️ CRITICAL: Each HTTP method MUST be exported as a separate function:**

```typescript
// app/api/resources/route.ts
export async function GET(req: NextRequest) { ... }
export async function POST(req: NextRequest) { ... }

// app/api/resources/[id]/route.ts
export async function GET(req: NextRequest, { params }) { ... }
export async function PUT(req: NextRequest, { params }) { ... }
export async function DELETE(req: NextRequest, { params }) { ... } // ⚠️ DON'T FORGET THIS!
```

## Common Mistake: Missing DELETE Handler

### ❌ What Happened (Bug Pattern)

When implementing the "Delete Category" feature:

1. ✅ Added backend `@DeleteMapping` in `CategoryController`
2. ✅ Added backend `delete()` method in `CategoryService`
3. ✅ Added frontend `deleteCategory()` API client function
4. ❌ **FORGOT** to add `export async function DELETE()` in `/app/api/categories/[id]/route.ts`

**Result:** 405 Method Not Allowed error because Next.js couldn't find the DELETE export.

### ✅ Correct Pattern

When adding DELETE functionality:

**Backend checklist:**
- [ ] Add `@DeleteMapping("/{id}")` to Controller
- [ ] Add `delete(UUID id)` method to Service
- [ ] Verify CORS config includes "DELETE" method (already done in this project)

**Frontend checklist:**
- [ ] Add `deleteResource(id: string)` to `lib/api.ts`
- [ ] **Add `export async function DELETE()` to `/app/api/resources/[id]/route.ts`** ⚠️
- [ ] Test the endpoint with curl or browser DevTools before UI testing

## DELETE Handler Template

Copy this template when adding DELETE to API route handlers:

```typescript
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await fetch(`${BACKEND}/api/resources/${id}`, { 
    method: 'DELETE' 
  });
  
  // Important: 204 No Content has no body
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

## Debugging 405 Errors

If you get a **405 Method Not Allowed** error:

1. **Check the frontend API route handler FIRST**
   - Does `/app/api/{resource}/[id]/route.ts` export the method?
   - Example: For DELETE, look for `export async function DELETE()`

2. **Then check the backend**
   - Does the Controller have the `@DeleteMapping` annotation?
   - Is the backend server running with the latest code?

3. **Verify the request path**
   - Frontend calls: `http://localhost:3000/api/resources/{id}`
   - This proxies to: `http://localhost:8080/api/resources/{id}`

## Reference Implementation

See existing implementations:
- ✅ **Events API**: `/app/api/events/[id]/route.ts` (has GET, PUT, DELETE)
- ✅ **Categories API**: `/app/api/categories/[id]/route.ts` (now has PUT, DELETE)

## Quick Verification Command

After implementing a DELETE endpoint, verify it works:

```bash
# Test backend directly
curl -X DELETE http://localhost:8080/api/resources/{id} -v

# Test through Next.js proxy
curl -X DELETE http://localhost:3000/api/resources/{id} -v

# Both should return: HTTP/1.1 204 No Content
```

## Prevention Checklist

When implementing ANY new CRUD endpoint:

1. [ ] List all HTTP methods needed (GET, POST, PUT, DELETE)
2. [ ] Implement backend Controller with ALL methods
3. [ ] Implement backend Service with ALL methods
4. [ ] Create/update frontend API client with ALL methods
5. [ ] Create/update Next.js route handlers with ALL exported functions
6. [ ] Test each method with curl before UI testing
7. [ ] Verify 405 errors don't appear in browser DevTools Network tab

---

**Last Updated:** 2026-06-22  
**Incident:** Missing DELETE handler in categories API route caused 405 error  
**Resolution:** Added `export async function DELETE()` to `/app/api/categories/[id]/route.ts`
