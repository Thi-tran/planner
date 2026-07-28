# Requirements Document

## Introduction

This document specifies the requirements for a Project Checklist System that allows users to manage checklists at the project level. Each checklist can contain multiple tasks with detailed tracking capabilities including assignment, deadlines, status, and comments. The initial implementation scope includes a complete backend data model and a frontend view-only interface.

## Glossary

- **Checklist_System**: The feature that manages checklists within projects
- **Checklist**: A named collection of tasks associated with a project, identified by name, description, and color
- **Task**: An individual item within a checklist with description, assignee, deadline, status, and comments
- **Task_Comment**: A comment or note associated with a specific task
- **Project**: An existing entity in the system representing a planning project with users, events, and categories
- **User**: An authenticated user in the system with Google authentication
- **Backend_API**: The Spring Boot REST API layer that provides checklist data
- **Frontend_UI**: The Next.js React interface that displays checklist data
- **Database**: The PostgreSQL database storing checklist data
- **Task_Status**: The state of a task (unchecked, in-progress, or done)
- **Deadline_Color_Coding**: Visual indication based on deadline proximity (amber for soon, red for overdue)
- **Project_Member**: A user with OWNER, EDITOR, or VIEWER role in a project
- **Summary_Metrics**: Aggregate counts displayed at the top of the checklist view

## Requirements

### Requirement 1: Checklist Data Model

**User Story:** As a developer, I want a proper database schema for checklists, so that checklist data is stored reliably and relationships are maintained correctly.

#### Acceptance Criteria

1. THE Database SHALL store a checklists table with columns: id (UUID), project_id (UUID foreign key), name (VARCHAR), description (TEXT), color (VARCHAR), created_at (TIMESTAMP), updated_at (TIMESTAMP)
2. THE Database SHALL enforce a foreign key relationship between checklists.project_id and projects.id with CASCADE delete behavior
3. THE Database SHALL create an index on checklists.project_id for query performance
4. WHEN a project is deleted, THE Database SHALL automatically delete all associated checklists
5. THE Database SHALL generate a unique UUID for each checklist upon creation

### Requirement 2: Task Data Model

**User Story:** As a developer, I want a proper database schema for checklist tasks, so that task data is stored with all required fields and relationships.

#### Acceptance Criteria

1. THE Database SHALL store a checklist_tasks table with columns: id (UUID), checklist_id (UUID foreign key), description (TEXT), assigned_to (UUID foreign key nullable), deadline (DATE nullable), status (VARCHAR), display_order (INTEGER), created_at (TIMESTAMP), updated_at (TIMESTAMP)
2. THE Database SHALL enforce a foreign key relationship between checklist_tasks.checklist_id and checklists.id with CASCADE delete behavior
3. THE Database SHALL enforce a foreign key relationship between checklist_tasks.assigned_to and users.id with SET NULL delete behavior
4. THE Database SHALL create an index on checklist_tasks.checklist_id for query performance
5. THE Database SHALL create an index on checklist_tasks.assigned_to for query performance
6. WHEN a checklist is deleted, THE Database SHALL automatically delete all associated tasks
7. WHEN a user is deleted, THE Database SHALL set assigned_to to NULL for tasks assigned to that user
8. THE Database SHALL enforce a CHECK constraint on status allowing only values: 'unchecked', 'in-progress', 'done'

### Requirement 3: Task Comment Data Model

**User Story:** As a developer, I want a proper database schema for task comments, so that users can add notes and discussion to tasks.

#### Acceptance Criteria

1. THE Database SHALL store a task_comments table with columns: id (UUID), task_id (UUID foreign key), user_id (UUID foreign key), comment_text (TEXT), created_at (TIMESTAMP), updated_at (TIMESTAMP)
2. THE Database SHALL enforce a foreign key relationship between task_comments.task_id and checklist_tasks.id with CASCADE delete behavior
3. THE Database SHALL enforce a foreign key relationship between task_comments.user_id and users.id with CASCADE delete behavior
4. THE Database SHALL create an index on task_comments.task_id for query performance
5. WHEN a task is deleted, THE Database SHALL automatically delete all associated comments
6. WHEN a user is deleted, THE Database SHALL delete all comments created by that user

### Requirement 4: Backend Checklist Entity

**User Story:** As a developer, I want JPA entities for checklists, so that the backend can interact with checklist data using object-relational mapping.

#### Acceptance Criteria

1. THE Backend_API SHALL define a Checklist entity class with fields: id, projectId, name, description, color, createdAt, updatedAt
2. THE Backend_API SHALL define a relationship between Checklist and Project entities using @ManyToOne annotation
3. THE Backend_API SHALL define a relationship between Checklist and Task entities using @OneToMany annotation with cascade ALL and orphan removal
4. THE Backend_API SHALL use @CreatedDate and @LastModifiedDate annotations for timestamp management
5. THE Backend_API SHALL validate that name is not null or empty

### Requirement 5: Backend Task Entity

**User Story:** As a developer, I want JPA entities for tasks, so that the backend can interact with task data using object-relational mapping.

#### Acceptance Criteria

1. THE Backend_API SHALL define a ChecklistTask entity class with fields: id, checklistId, description, assignedTo, deadline, status, displayOrder, createdAt, updatedAt
2. THE Backend_API SHALL define a relationship between ChecklistTask and Checklist entities using @ManyToOne annotation
3. THE Backend_API SHALL define a relationship between ChecklistTask and User entities for assignedTo using @ManyToOne annotation with optional=true
4. THE Backend_API SHALL define a relationship between ChecklistTask and TaskComment entities using @OneToMany annotation with cascade ALL and orphan removal
5. THE Backend_API SHALL use an enum for status field with values: UNCHECKED, IN_PROGRESS, DONE
6. THE Backend_API SHALL validate that description is not null or empty

### Requirement 6: Backend Task Comment Entity

**User Story:** As a developer, I want JPA entities for task comments, so that the backend can interact with comment data using object-relational mapping.

#### Acceptance Criteria

1. THE Backend_API SHALL define a TaskComment entity class with fields: id, taskId, userId, commentText, createdAt, updatedAt
2. THE Backend_API SHALL define a relationship between TaskComment and ChecklistTask entities using @ManyToOne annotation
3. THE Backend_API SHALL define a relationship between TaskComment and User entities using @ManyToOne annotation
4. THE Backend_API SHALL validate that commentText is not null or empty

### Requirement 7: Retrieve Checklists for Project

**User Story:** As a user, I want to retrieve all checklists for a project, so that I can view the checklists associated with my project.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/projects/{projectId}/checklists, THE Backend_API SHALL return all checklists for the specified project
2. THE Backend_API SHALL include all tasks for each checklist in the response
3. THE Backend_API SHALL include all comments for each task in the response
4. THE Backend_API SHALL verify the requesting user has access to the project (OWNER, EDITOR, or VIEWER role)
5. IF the requesting user does not have access to the project, THEN THE Backend_API SHALL return HTTP 403 Forbidden
6. IF the project does not exist, THEN THE Backend_API SHALL return HTTP 404 Not Found
7. THE Backend_API SHALL return checklists ordered by created_at ascending
8. THE Backend_API SHALL return tasks ordered by display_order ascending

### Requirement 8: Retrieve Single Checklist

**User Story:** As a user, I want to retrieve a single checklist with all its details, so that I can view the complete information for that checklist.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/checklists/{checklistId}, THE Backend_API SHALL return the specified checklist with all tasks and comments
2. THE Backend_API SHALL verify the requesting user has access to the project containing the checklist
3. IF the requesting user does not have access, THEN THE Backend_API SHALL return HTTP 403 Forbidden
4. IF the checklist does not exist, THEN THE Backend_API SHALL return HTTP 404 Not Found
5. THE Backend_API SHALL include user details (display name, email) for task assignees
6. THE Backend_API SHALL include user details for comment authors

### Requirement 9: Calculate Summary Metrics

**User Story:** As a user, I want to see summary metrics for all checklists in a project, so that I can quickly understand the overall progress.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/projects/{projectId}/checklists/summary, THE Backend_API SHALL calculate and return total checklists count
2. THE Backend_API SHALL calculate and return total tasks count across all checklists
3. THE Backend_API SHALL calculate and return completed tasks count (status = 'done')
4. THE Backend_API SHALL calculate and return overdue tasks count (deadline < current_date AND status != 'done')
5. THE Backend_API SHALL verify the requesting user has access to the project
6. IF the requesting user does not have access, THEN THE Backend_API SHALL return HTTP 403 Forbidden

### Requirement 10: Checklist Response DTOs

**User Story:** As a developer, I want properly structured response DTOs, so that the frontend receives consistent and complete data.

#### Acceptance Criteria

1. THE Backend_API SHALL define a ChecklistResponse DTO with fields: id, projectId, name, description, color, tasks, createdAt, updatedAt
2. THE Backend_API SHALL define a TaskResponse DTO with fields: id, checklistId, description, assignedTo, assignedToUser, deadline, status, displayOrder, comments, createdAt, updatedAt
3. THE Backend_API SHALL define a TaskCommentResponse DTO with fields: id, taskId, userId, user, commentText, createdAt, updatedAt
4. THE Backend_API SHALL define a UserSummary DTO with fields: id, displayName, email, pictureUrl
5. THE Backend_API SHALL define a ChecklistSummaryResponse DTO with fields: totalChecklists, totalTasks, completedTasks, overdueTasks
6. THE Backend_API SHALL map User entities to UserSummary DTOs in task and comment responses

### Requirement 11: Frontend Checklist Tab

**User Story:** As a user, I want a dedicated Checklists tab in the project view, so that I can access checklist functionality from the project interface.

#### Acceptance Criteria

1. WHEN viewing a project, THE Frontend_UI SHALL display a "Checklists" tab alongside existing project tabs
2. WHEN the Checklists tab is clicked, THE Frontend_UI SHALL navigate to the checklists view for that project
3. THE Frontend_UI SHALL use the route /projects/{projectId}/checklists for the checklist view
4. THE Frontend_UI SHALL maintain the project context (active project) when navigating to the checklists tab

### Requirement 12: Display Summary Metrics

**User Story:** As a user, I want to see summary metrics at the top of the checklist view, so that I can quickly understand the overall status.

#### Acceptance Criteria

1. WHEN the checklists view loads, THE Frontend_UI SHALL fetch summary metrics from the API
2. THE Frontend_UI SHALL display total checklists count in a metric card
3. THE Frontend_UI SHALL display total tasks count in a metric card
4. THE Frontend_UI SHALL display completed tasks count in a metric card
5. THE Frontend_UI SHALL display overdue tasks count in a metric card
6. THE Frontend_UI SHALL arrange metric cards in a horizontal row at the top of the view
7. THE Frontend_UI SHALL style metric cards consistently with the existing design system

### Requirement 13: Display Checklist Cards

**User Story:** As a user, I want to see each checklist as a card with visual identification, so that I can distinguish between different checklists easily.

#### Acceptance Criteria

1. WHEN the checklists view loads, THE Frontend_UI SHALL fetch all checklists for the project from the API
2. THE Frontend_UI SHALL display each checklist as a card with a colored left border matching the checklist color
3. THE Frontend_UI SHALL display the checklist name as the card title
4. THE Frontend_UI SHALL display the checklist description below the title
5. THE Frontend_UI SHALL display an expand/collapse control (chevron icon) on each card
6. THE Frontend_UI SHALL calculate and display a progress bar showing completion percentage (completed tasks / total tasks)
7. THE Frontend_UI SHALL display the progress percentage as text next to the progress bar
8. THE Frontend_UI SHALL initially render cards in collapsed state

### Requirement 14: Expand and Collapse Checklists

**User Story:** As a user, I want to expand and collapse checklists, so that I can focus on the checklists I'm currently interested in.

#### Acceptance Criteria

1. WHEN a collapsed checklist card is clicked, THE Frontend_UI SHALL expand the card to show all tasks
2. WHEN an expanded checklist card is clicked, THE Frontend_UI SHALL collapse the card to hide tasks
3. THE Frontend_UI SHALL rotate the chevron icon to indicate expanded/collapsed state
4. THE Frontend_UI SHALL maintain the expanded/collapsed state for each checklist independently
5. THE Frontend_UI SHALL animate the expand/collapse transition smoothly

### Requirement 15: Display Task Rows

**User Story:** As a user, I want to see each task with all its details, so that I can understand what needs to be done and by when.

#### Acceptance Criteria

1. WHEN a checklist is expanded, THE Frontend_UI SHALL display all tasks for that checklist
2. THE Frontend_UI SHALL display tasks in order of display_order ascending
3. THE Frontend_UI SHALL display a checkbox state indicator for each task showing status (unchecked, in-progress, done)
4. THE Frontend_UI SHALL display the task description text
5. THE Frontend_UI SHALL display the assignee's display name or "Unassigned" if no assignee
6. WHEN a task has a deadline, THE Frontend_UI SHALL display the deadline as a date pill
7. THE Frontend_UI SHALL display the task status as a badge
8. WHEN a task has comments, THE Frontend_UI SHALL display a comment count indicator showing the number of comments

### Requirement 16: Deadline Color Coding

**User Story:** As a user, I want visual indicators for task deadlines, so that I can quickly identify urgent or overdue tasks.

#### Acceptance Criteria

1. WHEN a task deadline is within 3 days from today, THE Frontend_UI SHALL display the deadline pill with amber background color
2. WHEN a task deadline is before today AND status is not 'done', THE Frontend_UI SHALL display the deadline pill with red background color
3. WHEN a task deadline is more than 3 days away, THE Frontend_UI SHALL display the deadline pill with default gray background color
4. WHEN a task status is 'done', THE Frontend_UI SHALL display the deadline pill with default gray background color regardless of date
5. WHEN a task has no deadline, THE Frontend_UI SHALL not display a deadline pill

### Requirement 17: Task Status Visual Indicators

**User Story:** As a user, I want clear visual indicators for task status, so that I can quickly understand the state of each task.

#### Acceptance Criteria

1. WHEN a task status is 'unchecked', THE Frontend_UI SHALL display an empty checkbox icon
2. WHEN a task status is 'in-progress', THE Frontend_UI SHALL display a partially filled checkbox icon with blue color
3. WHEN a task status is 'done', THE Frontend_UI SHALL display a filled checkbox icon with green color and checkmark
4. THE Frontend_UI SHALL display the status as a text badge next to the checkbox
5. THE Frontend_UI SHALL use distinct colors for each status badge (gray for unchecked, blue for in-progress, green for done)

### Requirement 18: Comment Count Display

**User Story:** As a user, I want to see how many comments each task has, so that I can identify tasks with discussion or notes.

#### Acceptance Criteria

1. WHEN a task has one or more comments, THE Frontend_UI SHALL display a comment icon with the count number
2. WHEN a task has zero comments, THE Frontend_UI SHALL not display a comment indicator
3. THE Frontend_UI SHALL position the comment indicator at the right side of the task row
4. THE Frontend_UI SHALL use a subtle gray color for the comment indicator

### Requirement 19: Error Handling for API Failures

**User Story:** As a user, I want clear error messages when something goes wrong, so that I understand what happened and can take appropriate action.

#### Acceptance Criteria

1. WHEN the checklist API request fails with 403, THE Frontend_UI SHALL display an error message "You don't have permission to view these checklists"
2. WHEN the checklist API request fails with 404, THE Frontend_UI SHALL display an error message "Project not found"
3. WHEN the checklist API request fails with 500 or network error, THE Frontend_UI SHALL display an error message "Failed to load checklists"
4. THE Frontend_UI SHALL provide a "Retry" button on error messages
5. WHEN the Retry button is clicked, THE Frontend_UI SHALL attempt to fetch the data again

### Requirement 20: Loading States

**User Story:** As a user, I want to see loading indicators when data is being fetched, so that I know the system is working.

#### Acceptance Criteria

1. WHEN the checklists view is initially loading, THE Frontend_UI SHALL display a loading spinner with text "Loading checklists..."
2. WHEN summary metrics are being fetched, THE Frontend_UI SHALL display placeholder metric cards with loading animation
3. THE Frontend_UI SHALL hide loading indicators when data is successfully loaded
4. THE Frontend_UI SHALL hide loading indicators when an error occurs

### Requirement 21: Authentication and Authorization Integration

**User Story:** As a system, I want to enforce proper authentication and authorization, so that only authorized users can access checklist data.

#### Acceptance Criteria

1. THE Backend_API SHALL extract the authenticated user from the security context for all checklist endpoints
2. THE Backend_API SHALL verify the user has an active membership (status = 'ACTIVE') in the project
3. THE Backend_API SHALL allow OWNER, EDITOR, and VIEWER roles to view checklists
4. IF the user is not authenticated, THEN THE Backend_API SHALL return HTTP 401 Unauthorized
5. THE Frontend_UI SHALL redirect to the signin page when receiving a 401 response

### Requirement 22: Responsive Design

**User Story:** As a user, I want the checklist view to work well on different screen sizes, so that I can use it on desktop, tablet, or mobile devices.

#### Acceptance Criteria

1. WHEN viewing on desktop (width >= 768px), THE Frontend_UI SHALL display checklist cards in a two-column grid
2. WHEN viewing on mobile (width < 768px), THE Frontend_UI SHALL display checklist cards in a single column
3. THE Frontend_UI SHALL ensure task rows are readable on small screens by wrapping or scrolling appropriately
4. THE Frontend_UI SHALL maintain proper spacing and touch targets on mobile devices

### Requirement 23: Empty State Display

**User Story:** As a user, I want helpful messaging when there are no checklists, so that I understand the state and what I can do next.

#### Acceptance Criteria

1. WHEN a project has zero checklists, THE Frontend_UI SHALL display an empty state message "No checklists yet"
2. THE Frontend_UI SHALL display a subtitle "Checklists will appear here once created"
3. THE Frontend_UI SHALL still display the summary metrics bar with all zero counts
4. THE Frontend_UI SHALL use a friendly icon (e.g., checklist icon) in the empty state

### Requirement 24: Database Migration

**User Story:** As a developer, I want a Flyway migration script for the checklist schema, so that the database schema is versioned and deployable.

#### Acceptance Criteria

1. THE Database SHALL provide a migration script named V6__add_checklists.sql
2. THE Database SHALL create the checklists table in the migration
3. THE Database SHALL create the checklist_tasks table in the migration
4. THE Database SHALL create the task_comments table in the migration
5. THE Database SHALL create all required indexes in the migration
6. THE Database SHALL apply the migration idempotently (safe to run multiple times in development)

### Requirement 25: API Response Performance

**User Story:** As a user, I want checklist data to load quickly, so that I can work efficiently without waiting.

#### Acceptance Criteria

1. WHEN fetching checklists for a project, THE Backend_API SHALL use JOIN FETCH or entity graphs to load tasks in a single query
2. THE Backend_API SHALL use JOIN FETCH or entity graphs to load comments in a single query
3. THE Backend_API SHALL avoid N+1 query problems when loading related entities
4. THE Backend_API SHALL use indexed columns for query filtering and sorting
5. THE Backend_API SHALL return responses within 500ms for projects with up to 50 checklists

