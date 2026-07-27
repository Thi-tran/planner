# ✅ Project Progress Bar - Complete

**Date**: July 27, 2026  
**Status**: Fully Implemented

---

## Summary

Added progress bars to each project card in the "My projects" list view, showing completion percentage based on checklist tasks.

---

## Visual Design

Matching the checklist design pattern:

```
┌─────────────────────────────────────────┐
│ Anna's Wedding              In progress │
│ Sep 20, 2026                            │
│ Wedding planning — venue, catering...   │
│                                         │
│ ████████████████░░░░░░░░░░ (65%)       │
│ 65% complete            4 tasks left    │
└─────────────────────────────────────────┘
```

### Features
- **Progress bar**: Colored to match project color
- **Percentage**: "65% complete"
- **Tasks remaining**: "4 tasks left"
- **Only shows if project has tasks** (gracefully hidden if no tasks)

---

## Backend Changes

### 1. New DTO: `ProjectProgressResponse.java`
```java
public record ProjectProgressResponse(
        int totalTasks,
        int completedTasks,
        int percentage,
        int tasksLeft
) {}
```

### 2. New Endpoint: `GET /api/projects/{id}/progress`
- Returns project progress based on all checklist tasks
- Requires VIEWER role or higher
- Calculates percentage: `(completedTasks / totalTasks) * 100`

### 3. Updated `ProjectService.java`
```java
@Transactional(readOnly = true)
public ProjectProgressResponse getProgress(UUID id, UUID userId) {
    projectAccessService.requireRole(id, userId, Role.VIEWER);
    
    long totalTasks = checklistTaskRepository.countByProjectId(id);
    long completedTasks = checklistTaskRepository.countByProjectIdAndStatusIn(
        id, List.of(TaskStatus.DONE)
    );
    
    int percentage = totalTasks > 0 
        ? (int) Math.round((completedTasks * 100.0) / totalTasks) 
        : 0;
    int tasksLeft = (int) (totalTasks - completedTasks);
    
    return new ProjectProgressResponse(
        (int) totalTasks,
        (int) completedTasks,
        percentage,
        tasksLeft
    );
}
```

### 4. Updated `ProjectController.java`
Added endpoint mapping:
```java
@GetMapping("/{id}/progress")
public ResponseEntity<ProjectProgressResponse> getProjectProgress(
    @PathVariable UUID id, 
    @AuthenticationPrincipal Jwt jwt
) {
    UserEntity user = currentUserService.resolveCurrentUser(jwt);
    return ResponseEntity.ok(projectService.getProgress(id, user.getId()));
}
```

---

## Frontend Changes

### 1. New Type: `ProjectProgress`
```typescript
export interface ProjectProgress {
  totalTasks: number;
  completedTasks: number;
  percentage: number;
  tasksLeft: number;
}
```

### 2. New API Function
```typescript
export async function getProjectProgress(id: string): Promise<ProjectProgress> {
  return request<ProjectProgress>(`/api/projects/${id}/progress`);
}
```

### 3. New API Route: `/api/projects/[id]/progress/route.ts`
Next.js API route that proxies to backend

### 4. Updated `ProjectCard.tsx`
**Added**:
- `useState` for progress data
- `useEffect` to fetch progress on mount
- Progress bar UI (only shows if `totalTasks > 0`)
- Color-matched progress bar (uses project color)

**Layout Changes**:
- Status badge moved to top-right (next to edit button)
- Progress section added at bottom
- Card uses `flex-direction: column` with `margin-top: auto` for progress

**Visual Components**:
```tsx
<ProgressContainer>
  <ProgressBar>
    <ProgressFill $percentage={progress.percentage} $color={colorHex} />
  </ProgressBar>
  <ProgressInfo>
    <ProgressText>{progress.percentage}% complete</ProgressText>
    <TasksLeft>{progress.tasksLeft} tasks left</TasksLeft>
  </ProgressInfo>
</ProgressContainer>
```

---

## Example Calculation

**Scenario**: "General" project with 2 checklists, 6 tasks
- Task 1: Todo
- Task 2: Todo
- Task 3: Todo
- Task 4: Done ✓
- Task 5: Done ✓
- Task 6: Todo

**Result**:
```json
{
  "totalTasks": 6,
  "completedTasks": 2,
  "percentage": 33,
  "tasksLeft": 4
}
```

**Display**: 
```
████░░░░░░░░░░ (33%)
33% complete     4 tasks left
```

---

## Design Consistency

Progress bars are consistent across the app:

| Location | Color | Width | Height |
|----------|-------|-------|--------|
| **Checklist cards** | Checklist color | Full width | 6px |
| **Project cards** | Project color | Full width | 8px |

Both use the same visual pattern:
- Background: #e2e8f0 (light gray)
- Fill: Matches parent color
- Smooth transition on change

---

## Error Handling

- **No tasks**: Progress section hidden (card looks normal)
- **API error**: Silently fails, progress section hidden
- **Auth error**: Handled by API layer (401 redirect)

---

## Files Changed

### Backend (3 files)
1. `backend/src/main/java/com/planner/domain/ProjectProgressResponse.java` - **NEW**
2. `backend/src/main/java/com/planner/service/ProjectService.java` - **UPDATED**
3. `backend/src/main/java/com/planner/controller/ProjectController.java` - **UPDATED**

### Frontend (4 files)
1. `frontend/lib/types.ts` - **UPDATED** (added ProjectProgress)
2. `frontend/lib/api.ts` - **UPDATED** (added getProjectProgress)
3. `frontend/app/api/projects/[id]/progress/route.ts` - **NEW**
4. `frontend/components/projects/ProjectCard.tsx` - **MAJOR UPDATE**

---

## Testing

### Backend API
```bash
# Get progress for project (replace {id} with actual UUID)
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/projects/{id}/progress

# Expected response:
{
  "totalTasks": 6,
  "completedTasks": 2,
  "percentage": 33,
  "tasksLeft": 4
}
```

### Frontend
1. Navigate to http://localhost:3000/projects
2. Verify each project card shows:
   - Progress bar (if has tasks)
   - Percentage text
   - Tasks left count
3. Progress bar color matches project color
4. Cards without tasks show no progress section

---

## Benefits

✅ **Visual feedback**: See project completion at a glance  
✅ **Motivation**: Progress bars encourage task completion  
✅ **Consistency**: Matches checklist progress bar design  
✅ **Color harmony**: Progress bar matches project color  
✅ **Non-intrusive**: Only shows when relevant (has tasks)  
✅ **Real-time**: Updates on each page load

---

## Future Enhancements

Potential improvements (not in this phase):
- Real-time updates (WebSocket or polling)
- Click progress bar to go to checklists page
- Show completion sparkle/animation at 100%
- Breakdown by checklist (tooltip on hover)
- Historical progress chart

---

**Status**: ✅ COMPLETE - Ready for use!

Backend is running on port 8080  
Frontend will hot-reload automatically at http://localhost:3000
