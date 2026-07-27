# 🔥 Checklist Plan Grilling - Critical Issues & Improvements

## ❌ CRITICAL ISSUES

### 1. **WRONG PACKAGE STRUCTURE FOR REPOSITORIES**

**Issue**: Plan specifies `/backend/src/main/java/com/planner/repository/` but the codebase uses `/backend/src/main/java/com/planner/model/repository/`

**Evidence**:
- Existing: `com.planner.model.repository.ProjectRepository`
- Existing: `com.planner.model.repository.EventRepository`
- Existing: `com.planner.model.repository.CategoryRepository`
- Plan says: `com.planner.repository.ChecklistRepository` ❌

**Fix Required**: All repository files must use `com.planner.model.repository` package

**Impact**: HIGH - Code won't compile, imports will fail

---

### 2. **MISSING ENTITY RELATIONSHIP ANNOTATIONS**

**Issue**: Plan says "UUID projectId" and "UUID checklistId" as fields, but JPA requires @JoinColumn and actual entity references

**Problem in Step 2**:
```java
// ❌ WRONG (from plan)
Fields: UUID projectId, UUID checklistId, UUID assignedTo

// ✅ CORRECT
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "project_id", nullable = false)
private ProjectEntity project;
```

**Why it matters**: 
- JPA won't create proper foreign key relationships
- JOIN FETCH queries in Step 4 will fail
- Repository methods like `findByProjectIdWithTasks` won't work without proper associations

**Fix Required**: 
- ChecklistEntity needs `@ManyToOne ProjectEntity project` (not UUID projectId)
- ChecklistTaskEntity needs `@ManyToOne ChecklistEntity checklist` (not UUID checklistId)
- ChecklistTaskEntity needs `@ManyToOne UserEntity assignedToUser` (not UUID assignedTo)

**Impact**: CRITICAL - Database relationships won't work

---

### 3. **N+1 QUERY PROBLEM IN REPOSITORY**

**Issue**: Step 4 repository query will cause N+1 problem when loading user details

**Problem**:
```sql
-- From plan
SELECT DISTINCT c FROM ChecklistEntity c 
LEFT JOIN FETCH c.tasks t 
LEFT JOIN FETCH t.comments 
WHERE c.id = :id
```

**Missing**: No JOIN FETCH for `t.assignedToUser` and `comment.user`!

**Fix Required**:
```sql
SELECT DISTINCT c FROM ChecklistEntity c 
LEFT JOIN FETCH c.tasks t 
LEFT JOIN FETCH t.assignedToUser
LEFT JOIN FETCH t.comments tc
LEFT JOIN FETCH tc.user
WHERE c.id = :id
```

**Impact**: HIGH - Will cause hundreds of extra queries for user data

---

### 4. **MISSING AUTHORIZATION SERVICE DEPENDENCY**

**Issue**: Plan says inject ProjectService but doesn't mention ProjectAccessService

**Evidence from existing code**:
```java
// ProjectService.java line 22
private final ProjectAccessService projectAccessService;

// Usage
projectAccessService.requireRole(id, userId, Role.VIEWER);
```

**Problem in Step 6**: Says "Verify user has access to project using projectService" but ProjectService doesn't have that method! It uses ProjectAccessService.

**Fix Required**: 
- Inject `ProjectAccessService` in ChecklistService
- Use `projectAccessService.requireRole(projectId, userId, Role.VIEWER)` for authorization

**Impact**: HIGH - Authorization won't work correctly

---

### 5. **MISSING VALIDATION ANNOTATIONS**

**Issue**: DTOs in Step 3 have no validation annotations, but existing code uses @Valid

**Evidence**: ProjectController uses `@Valid @RequestBody ProjectRequest`

**Problem**: Plan doesn't specify validation rules for:
- Checklist name (should be @NotBlank)
- Task description (should be @NotBlank)
- Comment text (should be @NotBlank)

**Impact**: MEDIUM - Can create checklists/tasks with empty names

---

### 6. **INCORRECT REPOSITORY METHOD SIGNATURES**

**Issue**: Step 4 repository methods have wrong navigation paths

**Problem**:
```java
// ❌ Plan says:
long countByChecklistProjectIdAndStatusIn(UUID projectId, List<TaskStatus> statuses);
```

**Why it's wrong**: If ChecklistTaskEntity has a `@ManyToOne ChecklistEntity checklist`, the path should be `checklist.project.id`, not `checklistProjectId`

**Fix Required**:
```java
// ✅ Correct
@Query("SELECT COUNT(t) FROM ChecklistTaskEntity t WHERE t.checklist.project.id = :projectId AND t.status IN :statuses")
long countByProjectIdAndStatusIn(@Param("projectId") UUID projectId, @Param("statuses") List<TaskStatus> statuses);
```

**Impact**: HIGH - Queries won't compile

---

## ⚠️ MAJOR ISSUES

### 7. **MISSING LOMBOCK ANNOTATIONS**

**Issue**: Plan doesn't specify Lombok annotations consistently

**Missing from entities**:
- @Getter, @Setter
- @NoArgsConstructor, @AllArgsConstructor
- @Builder

**Evidence**: ProjectEntity.java uses all these annotations

**Fix Required**: Add to all entity specifications in Step 2

**Impact**: MEDIUM - Boilerplate code needed

---

### 8. **INCONSISTENT TIMESTAMP HANDLING**

**Issue**: Plan uses Instant but existing migrations use TIMESTAMP

**From V4 migration**:
```sql
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

**From ProjectEntity**:
```java
private Instant createdAt;
```

**Problem**: PostgreSQL TIMESTAMP vs TIMESTAMPTZ inconsistency

**Fix Required**: Clarify whether to use TIMESTAMP or TIMESTAMPTZ in migration

**Impact**: LOW - Works but inconsistent with events table

---

### 9. **MISSING INDEX ON display_order**

**Issue**: Tasks will be ordered by display_order but there's no index

**Problem**: Step 1 creates indexes on checklist_id and assigned_to, but not display_order

**Query from requirements**: "THE Backend_API SHALL return tasks ordered by display_order ascending"

**Fix Required**: Add index:
```sql
CREATE INDEX idx__checklist_tasks__checklist_id_display_order 
ON checklist_tasks(checklist_id, display_order);
```

**Impact**: MEDIUM - Slow queries when checklist has many tasks

---

### 10. **NO UNIQUE CONSTRAINT ON CHECKLIST NAMES**

**Issue**: Multiple checklists can have same name in same project

**Problem**: Unlike categories table which has `UNIQUE (project_id, name)`, checklists table doesn't

**From V6 migration**:
```sql
ALTER TABLE categories
    ADD CONSTRAINT uq__categories__project_name UNIQUE (project_id, name);
```

**Should checklists be unique per project?** Requirements don't say, but it's inconsistent with category pattern

**Fix Required**: Decide if checklist names should be unique per project

**Impact**: LOW - UX inconsistency

---

### 11. **MISSING TRANSACTION BOUNDARIES**

**Issue**: Step 6 doesn't specify @Transactional annotations

**Evidence from ProjectService**: All methods have @Transactional or @Transactional(readOnly = true)

**Fix Required**: Add transaction annotations to ChecklistService methods:
- `@Transactional(readOnly = true)` for list and find methods
- `@Transactional` for any future create/update/delete methods

**Impact**: MEDIUM - Risk of transaction issues

---

## ⚡ PERFORMANCE ISSUES

### 12. **CARTESIAN PRODUCT IN DUAL LEFT JOIN FETCH**

**Issue**: Step 4 query with multiple LEFT JOIN FETCH can cause Cartesian product

**Problem**:
```sql
LEFT JOIN FETCH c.tasks t 
LEFT JOIN FETCH t.comments
```

**Result**: If checklist has 10 tasks with 5 comments each, returns 50 rows instead of 1!

**Fix Required**: Use two separate queries or @EntityGraph with sub-graphs

**Impact**: HIGH - Memory explosion with large data

---

### 13. **MISSING PAGINATION**

**Issue**: GET /api/projects/{projectId}/checklists has no pagination

**Problem**: What if project has 1000 checklists? Frontend will freeze.

**From requirements**: "THE Frontend_UI SHALL provide an instant overview even with 10+ checklists — you just scroll"

**10+ is fine, but what about 100+?**

**Fix Required**: Consider adding optional pagination parameters

**Impact**: MEDIUM - Scalability concern

---

## 🎨 FRONTEND ISSUES

### 14. **INCORRECT NEXT.JS ROUTE STRUCTURE**

**Issue**: Step 11 creates `/frontend/app/api/projects/[id]/checklists/route.ts` but this conflicts with page route

**Problem**: You can't have both:
- `/app/projects/[id]/checklists/page.tsx` (page)
- `/app/api/projects/[id]/checklists/route.ts` (API route)

**They're different paths!** One is `/projects/...`, other is `/api/projects/...`

**Fix Required**: Verify directory structure is correct

**Impact**: LOW - Just clarification needed

---

### 15. **MISSING LOADING SUSPENSE FOR ASYNC PARAMS**

**Issue**: Step 12 mentions async params but doesn't wrap in Suspense

**From your recent bugfix** (BUGFIX-SUSPENSE-BOUNDARY.md):
```typescript
// Required for useSearchParams
<Suspense fallback={<Loading />}>
  <Component />
</Suspense>
```

**Problem**: If page uses async params, might need Suspense boundary

**Fix Required**: Check if Next.js 16 requires Suspense for async params

**Impact**: LOW - Might cause build warnings

---

### 16. **NO OPTIMISTIC UPDATES**

**Issue**: View-only is fine, but what about Phase 2?

**Problem**: When user clicks checkbox to mark task done, will it wait for API?

**Consider**: Even in view-only, should we handle expand/collapse state optimistically?

**Fix Required**: Document state management strategy for Phase 2

**Impact**: LOW - Future consideration

---

### 17. **MISSING ERROR BOUNDARY**

**Issue**: No React Error Boundary mentioned

**Problem**: If ChecklistCard throws error, entire page crashes

**Fix Required**: Add Error Boundary wrapper in Step 12

**Impact**: MEDIUM - Poor error handling

---

## 📝 DOCUMENTATION ISSUES

### 18. **NO DATABASE SEEDING STRATEGY**

**Issue**: How do you test the view without data?

**Problem**: Plan says "view-only" but doesn't explain how to create test data

**Options**:
1. Manually insert SQL
2. Create seed script
3. Wait for Phase 2 CRUD

**Fix Required**: Add Step 8.5: "Create seed data script for testing"

**Impact**: MEDIUM - Testing friction

---

### 19. **UNCLEAR COLOR VALIDATION**

**Issue**: Step 1 says `color VARCHAR(50)` but what are valid values?

**From ProjectEntity**: Uses constraint with specific colors

**Question**: Should checklists use same color palette as projects? Or custom hex colors?

**Fix Required**: Specify color validation rules

**Impact**: LOW - UX clarity

---

### 20. **NO ROLLBACK STRATEGY**

**Issue**: What if V7 migration fails mid-way?

**Problem**: If `checklist_tasks` table creation fails, `checklists` table already exists

**Fix Required**: Document rollback procedure

**Impact**: MEDIUM - Production safety

---

## ✅ WHAT'S ACTUALLY GOOD

1. ✅ Overall architecture is solid
2. ✅ Phase separation (view-only first) is smart
3. ✅ Authorization checks are present
4. ✅ Responsive design considered
5. ✅ Error handling planned
6. ✅ Uses existing patterns (mappers, services, DTOs)
7. ✅ SQL migration provided
8. ✅ Clear step-by-step structure

---

## 🔧 PRIORITY FIXES

### Must Fix Before Implementation:
1. ❌ Fix repository package structure (model.repository)
2. ❌ Fix entity relationships (use @ManyToOne, not UUID fields)
3. ❌ Fix repository JOIN FETCH queries (include user fetches)
4. ❌ Add ProjectAccessService dependency
5. ❌ Fix repository method signatures (use proper navigation)
6. ❌ Add composite index on (checklist_id, display_order)

### Should Fix:
7. ⚠️ Add Lombok annotations to entity specs
8. ⚠️ Add @Transactional annotations
9. ⚠️ Add validation annotations to DTOs
10. ⚠️ Document database seeding strategy

### Nice to Have:
11. 💡 Consider pagination
12. 💡 Add error boundary
13. 💡 Document color validation rules
14. 💡 Add rollback strategy

---

## 📊 REVISED ESTIMATE

**Original**: 2-3 days
**Realistic with fixes**: 3-4 days

- Backend fixes: +0.5 day
- Testing with seed data: +0.5 day
- Frontend refinements: +0.5 day

---

## 🎯 RECOMMENDATION

**DO NOT START IMPLEMENTATION** until these critical issues are fixed:

1. Update all file paths to use correct package structure
2. Rewrite Step 2 with proper JPA annotations
3. Rewrite Step 4 with complete JOIN FETCH queries
4. Add ProjectAccessService to Step 6
5. Create seed data script

After these fixes, the plan will be solid and ready for implementation.
