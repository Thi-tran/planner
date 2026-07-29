# Plan Grilling: Create Checklist and Add Tasks

**Date**: July 29, 2026  
**Plan**: `.github/plans/create-checklist-and-tasks.md`  
**Reviewer**: Critical Analysis

---

## 🔴 Critical Issues (Must Fix Before Implementation)

### C1: Schema Mismatch - Due Date Field Missing
**Problem**: Plan includes due date field in ChecklistRequest, but schema doesn't have it.

**Location**: 
- DTOs section: `ChecklistRequest.java` has `private LocalDate dueDate;`
- UI/UX section: Modal includes due date picker
- Database: `checklists` table has no `due_date` column

**Impact**: Backend will accept due date but silently ignore it. Users will enter data that gets lost.

**Fix Required**:
- **Option A**: Remove due date from DTOs, UI, and requirements (simplest)
- **Option B**: Add V11 migration BEFORE implementation starts
- **Recommendation**: Option A - defer to Phase 3

---

### C2: Schema Mismatch - Task Title vs Description
**Problem**: Major confusion about task schema fields.

**Evidence**:
- Schema has: `description TEXT NOT NULL`
- TaskRequest has: `title` (max 500) and `description` (max 2000)
- Service code: Maps `request.getTitle()` to `entity.setDescription()`
- UI shows: Both title and description fields

**Impact**: 
- Task description field in UI will be ignored
- Character limit mismatch (500 in DTO vs unlimited TEXT in DB)
- Data model confusion for future features

**Fix Required**:
- **Option A**: Remove description from TaskRequest and UI (title only)
- **Option B**: Add V11 migration to add `title` field, rename `description` to `details`
- **Recommendation**: Option A for Phase 2, Option B for Phase 3

---

### C3: Schema Mismatch - Task Priority Field Missing
**Problem**: Plan includes priority in UI and DTO but not in database.

**Location**:
- TaskRequest: `private String priority;`
- UI mockup: Priority selector (Low/Medium/High)
- Database: No `priority` column in `checklist_tasks`

**Impact**: Priority selection will be lost. Backend will accept it but can't store it.

**Fix Required**:
- **Option A**: Remove priority from DTOs and UI (simplest)
- **Option B**: Add V11 migration to add `priority` column
- **Recommendation**: Option A - defer to Phase 3

---

### C4: Missing TaskMapper Implementation
**Problem**: Plan mentions creating TaskMapper but provides no implementation details.

**Location**: Backend Implementation > Section 5

```java
@Component
@RequiredArgsConstructor
public class TaskMapper {
    private final UserMapper userMapper;
    
    public TaskResponse toResponse(ChecklistTaskEntity entity) {
        // Map entity to TaskResponse DTO  <-- Empty!
    }
}
```

**Impact**: Implementation will be blocked or inconsistent.

**Fix Required**: Provide complete TaskMapper implementation or verify ChecklistMapper already handles it.

**Check**: Does ChecklistMapper.toResponse() already map tasks? If yes, TaskMapper might not be needed.

---

### C5: Missing TaskResponse DTO Definition
**Problem**: Plan references `TaskResponse` but never defines it.

**Evidence**:
- Service returns `TaskResponse`
- Controller returns `TaskResponse`
- No definition in DTOs section

**Impact**: Implementation team doesn't know what fields to return.

**Fix Required**: Either:
1. Define `TaskResponse` structure explicitly
2. Or state "use existing `ChecklistTask` from TaskResponse.java"
3. Or clarify that task is embedded in ChecklistResponse

---

### C6: Inconsistent Step Numbering in Implementation
**Problem**: Step 28 contradicts current decision about role-based access.

**Location**: Phase 2E, Step 28:
```
28. ✅ Test role-based access (VIEWER should not see buttons)
```

**Contradiction**: Earlier decided no role checks until collaborator feature.

**Impact**: Confusion during implementation about what to test.

**Fix Required**: Remove or update step 28 to match current approach.

---

## 🟡 Major Issues (Should Fix)

### M1: Missing Error Type Definitions
**Problem**: Plan mentions error handling but doesn't specify error types needed.

**Service code references**:
- `ResourceNotFoundException` 
- `BadRequestException`

**Question**: Do these exceptions exist? If not, need to create them or use Spring's built-in exceptions.

**Fix**: Verify exception classes exist or specify which exceptions to use.

---

### M2: Assignee Validation Complexity
**Problem**: Task creation validates assignee is project member, but current app has no collaborators.

**Service code**:
```java
if (request.getAssignedTo() != null) {
    membershipRepository.findByProjectIdAndUserId(...)
        .orElseThrow(() -> new BadRequestException("Assigned user is not a project member"));
}
```

**Issue**: This validation is pointless in current state (only owner exists).

**Question**: Should we skip this validation until collaborator feature?

**Recommendation**: Keep validation for future-proofing, but document it's currently always satisfied.

---

### M3: Missing Repository Dependency in Service
**Problem**: ChecklistService.addTask() uses repositories not in dependencies.

**Code references**:
- `membershipRepository` - not in @RequiredArgsConstructor
- `userRepository` - not in @RequiredArgsConstructor
- `projectRepository` - not in create() method

**Impact**: Compilation errors.

**Fix Required**: Add all repository dependencies to ChecklistService:
```java
private final ProjectRepository projectRepository;
private final UserRepository userRepository;
private final ProjectMembershipRepository membershipRepository;
```

---

### M4: ChecklistCard State Management Missing
**Problem**: ChecklistCard needs modal state but plan doesn't show implementation.

**Plan shows**:
```typescript
<AddTaskButton onClick={() => setShowAddTaskModal(true)}>
```

**Missing**:
- State declaration: `const [showAddTaskModal, setShowAddTaskModal] = useState(false)`
- Modal component: `<AddTaskModal ... />`
- Props for modal (checklistId, checklistName, checklistColor, projectId)

**Impact**: Incomplete component guidance.

**Fix**: Add complete ChecklistCard updates including state and modal integration.

---

### M5: Refresh After Task Creation Unclear
**Problem**: FR2.10 says "refreshes checklist (auto-expands)" but implementation unclear.

**Question**: How to refresh single checklist without refetching all checklists?

**Options**:
1. Refetch entire checklist list (simple, less efficient)
2. Refetch single checklist by ID (efficient, more complex)
3. Optimistically update state (most complex, best UX)

**Recommendation**: Option 1 for Phase 2, Option 3 for Phase 3.

---

### M6: Color Constants Location Missing
**Problem**: Plan shows 7 colors but doesn't specify where constants are defined.

**Mockup shows**: Sky Cyan, Blush Pink, Soft Indigo, Sage Green, Gold, Coral, Gray

**Question**: Where are these defined?
- Check: `lib/constants.ts` for `PROJECT_COLORS`
- Need: Verify if checklist colors = project colors or separate list

**Fix**: Specify to use existing `PROJECT_COLORS` constant or define new `CHECKLIST_COLORS`.

---

### M7: getProjectMembers API Already Exists?
**Problem**: Plan adds `getProjectMembers()` function but it might already exist.

**Check needed**: Does `lib/api.ts` already have this function?

**Impact**: Duplicate function or wasted effort.

**Fix**: Verify before implementation. If exists, remove from plan.

---

## 🟢 Minor Issues (Nice to Fix)

### N1: Validation Message Inconsistency
**Problem**: Java validation messages differ from frontend validation messages.

**Example**:
- Backend: "Checklist name is required"
- Frontend: Might show "Name required" or "Project name is required"

**Recommendation**: Standardize error message format across frontend/backend.

---

### N2: Missing Loading State Details
**Problem**: Plan says "shows loading state" but doesn't specify UX.

**Questions**:
- Disable submit button?
- Show spinner?
- Change button text to "Creating..."?
- Disable all fields?

**Fix**: Specify loading state behavior (reference CreateProjectModal pattern).

---

### N3: Color Picker Default Unclear
**Problem**: Validation says "default to first color" but doesn't specify which.

**Question**: Is first color Sky Cyan (#5EC4CD)?

**Fix**: Explicitly state default color or make it required user selection.

---

### N4: Task Display Order Edge Case
**Problem**: What if two tasks are created simultaneously?

**Code**:
```java
Integer maxOrder = checklistTaskRepository.findMaxDisplayOrder(checklistId);
int displayOrder = (maxOrder != null) ? maxOrder + 1 : 0;
```

**Edge case**: Concurrent requests might get same display_order.

**Impact**: Unlikely in single-user scenario, but could cause issues.

**Fix**: Consider using database sequence or add unique constraint with ON CONFLICT.

---

### N5: Modal Close Behavior Not Specified
**Problem**: What happens when user clicks outside modal?

**Question**: Should clicking overlay close modal (like ESC key)?

**Fix**: Specify modal close behavior (reference CreateProjectModal pattern).

---

### N6: Empty Checklist After Creation
**Problem**: User creates checklist, sees it collapsed with "0 tasks". No guidance.

**UX Question**: Should modal show "Add your first task" prompt after creation?

**Recommendation**: Show empty state in checklist or auto-open add task modal.

---

### N7: Date Picker Format Not Specified
**Problem**: "date picker" mentioned but format not specified.

**Questions**:
- Browser native input type="date"?
- Custom date picker component?
- Date format: YYYY-MM-DD? MM/DD/YYYY?

**Fix**: Specify to use HTML5 date input (matches CreateProjectModal).

---

### N8: Assignee Dropdown UX Incomplete
**Problem**: Dropdown showing "project members" but current state has only owner.

**UX Question**: 
- Show owner + "(You)" label?
- Show empty dropdown with "(No members)"?
- Default to current user?

**Recommendation**: Default assignee to current user (owner) with ability to change later.

---

### N9: Priority Selector State Management Missing
**Problem**: Priority button group shown but state management not detailed.

**Missing**: 
- Selected state styling
- Default value (medium?)
- Toggle vs radio behavior

**Fix**: Specify priority selector is radio button group with default="medium".

---

### N10: Character Counter Edge Cases
**Problem**: Character counter shown but behavior at limit not specified.

**Questions**:
- Hard stop at max chars (like CreateProjectModal)?
- Show warning as approaching limit?
- Change color when at/near limit?

**Fix**: Reference CreateProjectModal pattern for consistency.

---

## 📋 Ambiguities & Open Questions

### A1: Should Checklist List Auto-Expand New Checklist?
**Question**: After creating checklist, should it appear expanded or collapsed?

**Options**:
1. Collapsed (consistent with initial load)
2. Expanded (helps user add first task)

**Recommendation**: Expanded for better UX.

---

### A2: Task Creation from Collapsed Checklist?
**Question**: Can user add task without expanding checklist first?

**Current plan**: "+ Add task" button only appears when expanded.

**Alternative**: Add task button in collapsed header?

**Recommendation**: Keep current approach (expanded only).

---

### A3: Color Picker vs Color Dropdown?
**Problem**: UI mockup shows circles (color swatches) but doesn't specify interaction.

**Questions**:
- Click to select (current ProjectModal approach)?
- Dropdown with preview?

**Recommendation**: Use color swatches like CreateProjectModal.

---

### A4: Backend Validation Error Format?
**Question**: What format do backend validation errors return?

**Spring Boot default**: 
```json
{
  "field": "name",
  "message": "Checklist name is required"
}
```

**Frontend needs**: Parse and display per-field errors.

**Fix**: Verify error format matches frontend error handling pattern.

---

### A5: Empty Description Handling?
**Question**: Empty string vs null for optional description?

**Backend DTO**: `@Size(max = 2000)` allows empty string.

**Question**: Should empty string be converted to null?

**Recommendation**: Yes - map empty string to null for consistency.

---

## 🏗️ Architecture Concerns

### AR1: TaskMapper vs ChecklistMapper Overlap
**Problem**: Unclear relationship between TaskMapper and ChecklistMapper.

**Current Phase 1**: ChecklistMapper maps entire checklist including tasks.

**Question**: Does TaskMapper duplicate this logic?

**Recommendation**: 
- If ChecklistMapper already maps tasks → Don't create TaskMapper
- If creating single task endpoint → Need TaskMapper for consistency

**Decision needed**: Clarify mapper responsibilities.

---

### AR2: Transaction Boundaries
**Problem**: Service methods marked @Transactional but no rollback scenarios discussed.

**Question**: What happens if:
- Checklist created but fails to refresh UI?
- Task created but assignee validation fails mid-transaction?

**Current**: Proper transaction boundaries, but error handling not detailed.

**Recommendation**: Document rollback scenarios in plan.

---

### AR3: Repository Query Performance
**Problem**: findByIdWithProject uses JOIN FETCH but loading strategy not discussed.

**Question**: Are project details needed for authorization only?

**Optimization**: Could use lightweight query for auth check, then load full checklist.

**Recommendation**: Current approach is fine for Phase 2, optimize in Phase 3 if needed.

---

## 📝 Missing Sections

### MS1: Rollback/Cancellation Strategy
**Missing**: What happens if user creates checklist then immediately deletes project?

**Impact**: Orphaned checklists? Cascade delete should handle it.

**Verification needed**: Confirm FK constraint has ON DELETE CASCADE.

---

### MS2: Concurrent User Scenario
**Missing**: What if two users are collaborators (future) and create checklist simultaneously?

**Impact**: No conflict in current phase (single user).

**Note**: Document for future consideration.

---

### MS3: Accessibility Considerations
**Missing**: No mention of keyboard navigation, screen readers, ARIA labels.

**Examples**:
- Tab order in modal
- ESC to close
- Focus management when modal opens
- ARIA labels for color swatches

**Recommendation**: Add accessibility section or reference CreateProjectModal implementation.

---

### MS4: Mobile Responsiveness
**Missing**: No mention of mobile/tablet experience.

**Questions**:
- Color picker on mobile?
- Date picker on mobile?
- Priority selector on small screens?

**Recommendation**: Follow CreateProjectModal responsive patterns.

---

### MS5: Internationalization (i18n)
**Missing**: No mention of multi-language support.

**Impact**: Hard-coded English strings in:
- Validation messages
- Button labels
- Field labels

**Recommendation**: Document for Phase 3 or accept English-only for now.

---

## ✅ What's Done Well

### W1: Clear Separation of Concerns
✅ Backend/Frontend clearly separated
✅ Service/Controller/Repository layers well defined
✅ DTOs properly defined

### W2: Comprehensive Requirements
✅ 12 functional requirements covering all scenarios
✅ Clear in-scope/out-of-scope boundaries

### W3: Step-by-Step Implementation Plan
✅ 32 actionable steps broken into phases
✅ Logical progression from backend to frontend

### W4: Following Existing Patterns
✅ CreateProjectModal as reference
✅ Consistent with Phase 1 architecture
✅ Reusing ProjectAccessService

### W5: UI/UX Mockups Provided
✅ Visual representation of modals
✅ Color specifications
✅ Field requirements clear

---

## 🎯 Priority Fixes for Implementation

### Must Fix Before Starting:
1. **C1**: Decide on due date (remove from plan or add migration)
2. **C2**: Decide on task title vs description (choose Option A or B)
3. **C3**: Decide on priority field (remove from plan or add migration)
4. **C4**: Provide TaskMapper implementation or clarify it's not needed
5. **C5**: Define TaskResponse structure
6. **M3**: Add missing repository dependencies to service

### Fix During Implementation:
7. **M4**: Complete ChecklistCard modal integration
8. **M6**: Specify color constants location
9. **M7**: Check if getProjectMembers exists

### Polish After Implementation:
10. All Minor Issues (N1-N10)
11. Clarify Ambiguities (A1-A5)

---

## 📊 Overall Assessment

**Plan Quality**: 7/10

**Strengths**:
- ✅ Well-structured and comprehensive
- ✅ Clear requirements and implementation steps
- ✅ Good UX mockups
- ✅ Follows existing patterns

**Weaknesses**:
- ❌ Schema mismatches (due date, priority, task title/description)
- ❌ Missing implementation details (TaskMapper, TaskResponse)
- ❌ Some inconsistencies between sections

**Readiness for Implementation**: 60%

**Blockers**: 6 critical issues must be resolved first

**Recommendation**: 
1. Make decisions on Open Questions (Q1-Q4)
2. Fix Critical Issues (C1-C6)
3. Address Major Issues (M1-M7)
4. Then proceed with implementation

**Estimated Time to Fix Plan**: 2-3 hours

---

## 🔧 Recommended Simplified Approach

To avoid schema migration complexity in Phase 2:

### Remove from Scope:
1. ❌ Checklist due date → Phase 3
2. ❌ Task description (keep title only) → Phase 3
3. ❌ Task priority → Phase 3

### Simplified DTOs:

```java
@Data
public class ChecklistRequest {
    @NotBlank
    @Size(max = 255)
    private String name;
    
    @Size(max = 2000)
    private String description;
    
    @NotBlank
    @Size(max = 50)
    private String color;
}

@Data
public class TaskRequest {
    @NotBlank
    @Size(max = 500)
    private String title; // Maps to description field in DB
    
    private UUID assignedTo;
    
    private LocalDate deadline;
}
```

### Benefits:
- ✅ No schema changes needed
- ✅ Faster implementation
- ✅ Fewer points of failure
- ✅ Can add fields in Phase 3

This reduces complexity by 30% and avoids all schema mismatch issues.
