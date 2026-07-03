# Requirements Document

## Introduction

The Project Management System adds a multi-project organizational layer to the existing planning application. Users can create and manage multiple projects, where each project contains a single planning that holds multiple calendar events. The system provides a project overview dashboard, sidebar navigation for quick access to recent projects, and project-scoped event management.

## Glossary

- **System**: The Project Management System feature
- **User**: A single authenticated user of the planning application
- **Project**: A container with metadata (name, description, dates, color) that organizes a planning
- **Planning**: A collection of events that belong to a specific project, displayed in calendar view
- **Event**: A calendar item with title, description, time range, and category (existing feature)
- **Project_Card**: A visual representation of a project showing its key metadata
- **My_Projects_Page**: The main dashboard displaying all user projects with summary metrics
- **Sidebar**: The navigation panel showing recently accessed projects and planning links
- **Project_Modal**: A form dialog for creating new projects
- **Calendar_View**: The existing event display interface, now scoped to a project's planning
- **Category**: An existing classification for events with name and color
- **Recent_Projects_List**: The 5 most recently opened projects displayed in the sidebar

## Requirements

### Requirement 1: Project Creation

**User Story:** As a user, I want to create new projects with metadata, so that I can organize my planning activities into distinct project contexts.

#### Acceptance Criteria

1. THE System SHALL provide a project creation modal accessible from the My_Projects_Page
2. THE System SHALL require a project name (non-empty string, maximum 255 characters)
3. THE System SHALL accept an optional project description (maximum 2000 characters)
4. THE System SHALL require a project start date
5. THE System SHALL accept an optional project end date
6. IF an end date is provided AND the end date is not after the start date, THEN THE System SHALL reject the submission and display an error message stating "End date must be after start date"
7. THE System SHALL require a project color selection from the predefined color set (Sky Cyan, Blush Pink, Soft Indigo, Sage Green)
8. IF a required field is empty OR field content exceeds maximum length, THEN THE System SHALL display an error message indicating which field validation failed
9. WHEN a user submits the project creation form with all required fields populated and all validations passing, THE System SHALL create a new project with a unique identifier
10. WHEN a project is created, THE System SHALL initialize the project status as "in progress"
11. WHEN a project is created, THE System SHALL create an associated planning for that project
12. WHEN a project is successfully created, THE System SHALL display a confirmation message to the user

### Requirement 2: Project Listing and Display

**User Story:** As a user, I want to view all my projects on a central dashboard, so that I can see an overview of my work and access specific projects.

#### Acceptance Criteria

1. THE System SHALL display a My_Projects_Page as the default landing page when the application loads
2. THE System SHALL display all user projects as project cards on the My_Projects_Page
3. FOR EACH project card, THE System SHALL display the project name, project status, description, and color
4. FOR EACH project card, THE System SHALL display the date range formatted as "MMM DD, YYYY - MMM DD, YYYY" where start date is displayed first and end date is displayed second
5. IF a project has no end date, THEN THE System SHALL display the date range as "MMM DD, YYYY - Ongoing"
6. THE System SHALL display summary metrics at the top of the My_Projects_Page showing total project count
7. THE System SHALL display summary metrics showing project counts grouped by status
8. THE System SHALL display a "Create new project" button on the My_Projects_Page
9. WHEN a user clicks on a project card, THE System SHALL set that project as the active project context and navigate to that project's calendar view
10. THE System SHALL sort projects by most recently accessed timestamp in descending order
11. IF the user has no projects, THEN THE System SHALL display an empty state message indicating no projects exist with a prompt to create the first project
12. IF project retrieval fails, THEN THE System SHALL display an error message indicating projects cannot be loaded

### Requirement 3: Sidebar Navigation with Recent Projects

**User Story:** As a user, I want to see my recently accessed projects in the sidebar, so that I can quickly navigate between active projects.

#### Acceptance Criteria

1. THE System SHALL display a "My Projects" menu item in the sidebar
2. THE System SHALL display the 5 most recently opened projects under the "My Projects" menu item
3. IF fewer than 5 projects exist, THEN THE System SHALL display all existing projects under the "My Projects" menu item
4. FOR EACH recent project in the sidebar, THE System SHALL display the project name (truncated to 30 characters with ellipsis if longer) and a colored dot indicator using the project's assigned color
5. WHEN a user selects a project from the sidebar, THE System SHALL set that project as the active project context (storing project ID and planning ID)
6. WHEN a project is selected, THE System SHALL display a "Planning" submenu item indented under that project in the sidebar
7. WHEN a user clicks the "Planning" submenu item, THE System SHALL navigate to the calendar view for that project's planning
8. WHEN a user selects a project, THE System SHALL update the project's last_accessed_at timestamp to the current timestamp
9. THE System SHALL order recent projects by last_accessed_at timestamp in descending order
10. IF no projects have been accessed, THEN THE System SHALL order projects by created_at timestamp in descending order
11. IF a project's color is not set, THEN THE System SHALL display a default gray colored dot indicator

### Requirement 4: Project-to-Planning Relationship

**User Story:** As a user, I want each project to contain exactly one planning, so that events are organized within project boundaries.

#### Acceptance Criteria

1. WHEN a project is created, THE System SHALL create exactly one planning for that project
2. IF planning creation fails during project creation, THEN THE System SHALL rollback the project creation and return an error message indicating that project creation failed
3. THE System SHALL associate each planning with exactly one project
4. THE System SHALL ensure each event belongs to exactly one planning
5. WHEN a user views a project's calendar, THE System SHALL display only events where the event's planning_id matches the project's planning ID
6. WHEN a user creates an event AND a project is set as the active project context, THE System SHALL associate the event with that project's planning ID
7. IF a user attempts to create an event AND no project is set as active, THEN THE System SHALL reject the event creation and return an error message indicating that a project must be selected
8. IF a user or system process attempts to delete a planning directly, THEN THE System SHALL reject the deletion request and return an error message indicating that plannings can only be deleted through project deletion
9. WHEN a project is deleted, THE System SHALL delete the associated planning and all its events
10. IF cascade deletion of planning or events fails, THEN THE System SHALL rollback the project deletion and return an error message indicating that project deletion failed

### Requirement 5: Project Metadata Management

**User Story:** As a user, I want to update project information, so that I can keep project metadata current as circumstances change.

#### Acceptance Criteria

1. WHEN a user opens an edit form for a project, THE System SHALL allow editing of the project name
2. WHEN a user opens an edit form for a project, THE System SHALL allow editing of the project description
3. WHEN a user opens an edit form for a project, THE System SHALL allow editing of the project start date
4. WHEN a user opens an edit form for a project, THE System SHALL allow editing of the project end date
5. WHEN a user opens an edit form for a project, THE System SHALL allow changing the project color
6. WHEN a user opens an edit form for a project, THE System SHALL allow updating the project status
7. WHEN a user submits updated project metadata, THE System SHALL validate that the project name is a non-empty string with maximum 255 characters
8. WHEN a user submits updated project metadata, THE System SHALL validate that the project description does not exceed 2000 characters
9. WHEN a user submits updated project metadata with an end date, THE System SHALL validate that the end date is after the start date
10. IF any validation fails, THEN THE System SHALL reject the update and return an error message indicating which field failed validation
11. WHEN a user submits valid updated project metadata, THE System SHALL persist the changes to the database
12. IF database persistence fails, THEN THE System SHALL return an error message indicating that the update could not be saved
13. WHEN a project is successfully updated, THE System SHALL update the displayed project metadata in the Project_Card, Sidebar, and My_Projects_Page within 500 milliseconds

### Requirement 6: Project Color System

**User Story:** As a user, I want to assign colors to projects, so that I can visually distinguish between different projects throughout the application.

#### Acceptance Criteria

1. THE System SHALL provide a color selector displaying the predefined project colors (Sky Cyan, Blush Pink, Soft Indigo, Sage Green) as selectable swatches during project creation
2. THE System SHALL accept only color values from the predefined set (Sky Cyan, Blush Pink, Soft Indigo, Sage Green)
3. IF a user submits a color value not in the predefined set, THEN THE System SHALL reject the submission and return an error message indicating the invalid color value
4. THE System SHALL display the project color as a colored dot visual indicator with 12px diameter on project cards
5. THE System SHALL display the project color as a colored dot visual indicator with 8px diameter next to project names in the sidebar
6. WHEN a project's color is displayed in multiple locations, THE System SHALL use the same hex color code value in all locations
7. WHEN a user changes a project's color, THE System SHALL persist the new color value to the database
8. IF color persistence fails, THEN THE System SHALL return an error message indicating the color could not be updated
9. WHEN a project's color is successfully updated, THE System SHALL refresh all displayed instances of that project's color indicator within 500 milliseconds
10. THE System SHALL provide a color selector displaying the predefined project colors as selectable swatches during project editing
11. IF a project color is not set (null value), THEN THE System SHALL display a default gray (#9CA3AF) colored dot
12. WHEN a user selects a color from the color selector, THE System SHALL highlight the selected color with a border or checkmark indicator

### Requirement 7: Project Status Tracking

**User Story:** As a user, I want to track project status, so that I can understand which projects are active, completed, or on hold.

#### Acceptance Criteria

1. THE System SHALL accept only the following project status values: "in progress", "completed", "on hold", and "planning"
2. WHEN a project is created, THE System SHALL set the initial status to "in progress"
3. WHEN a user submits a status change request for a project, THE System SHALL update the project status to the requested value
4. IF a user submits a status value not in the allowed set, THEN THE System SHALL reject the update and return an error message indicating the invalid status value
5. THE System SHALL display the current project status on project cards
6. THE System SHALL display a count of projects for each status value in the summary metrics on the My_Projects_Page
7. THE System SHALL allow users to filter the project list to show only projects with a selected status value
8. THE System SHALL allow users to group the project list by status value

### Requirement 8: Project Deletion

**User Story:** As a user, I want to delete projects I no longer need, so that I can keep my project list relevant and organized.

#### Acceptance Criteria

1. THE System SHALL provide a delete action accessible from the Project_Card and from the project edit view
2. WHEN a user initiates project deletion, THE System SHALL display a confirmation dialog warning that deleting a project will delete its planning and all associated events
3. THE System SHALL provide "Confirm deletion" and "Cancel" buttons in the confirmation dialog
4. WHEN a user clicks "Cancel" in the confirmation dialog, THE System SHALL close the dialog without deleting the project
5. WHEN a user confirms project deletion, THE System SHALL delete the project from the database
6. WHEN a project is deleted, THE System SHALL delete the associated planning
7. WHEN a project is deleted, THE System SHALL delete all events associated with that project's planning
8. WHEN a project is deleted, THE System SHALL remove it from the sidebar's Recent_Projects_List
9. WHEN a project is successfully deleted, THE System SHALL update the My_Projects_Page display and summary metrics
10. IF the project to be deleted does not exist (404), THEN THE System SHALL display an error message indicating the project was not found
11. IF the deletion operation fails due to a database error, THEN THE System SHALL display an error message indicating the project could not be deleted and preserve the project data

### Requirement 9: Database Schema and Relationships

**User Story:** As a developer, I want proper database relationships between projects, plannings, and events, so that data integrity is maintained.

#### Acceptance Criteria

1. THE System SHALL create a projects table with columns: id (UUID, primary key), name (VARCHAR(255), NOT NULL), description (TEXT, nullable), start_date (DATE, NOT NULL), end_date (DATE, nullable), color (VARCHAR(50), NOT NULL), status (ENUM('in progress', 'completed', 'on hold', 'planning'), NOT NULL), last_accessed_at (TIMESTAMP, nullable), created_at (TIMESTAMP, NOT NULL), updated_at (TIMESTAMP, NOT NULL)
2. THE System SHALL create a plannings table with columns: id (UUID, primary key), project_id (UUID, NOT NULL, UNIQUE), created_at (TIMESTAMP, NOT NULL), updated_at (TIMESTAMP, NOT NULL)
3. THE System SHALL add a planning_id (UUID, NOT NULL) foreign key column to the existing events table
4. THE System SHALL enforce a foreign key constraint from plannings.project_id to projects.id with ON DELETE CASCADE and ON UPDATE CASCADE
5. THE System SHALL enforce a foreign key constraint from events.planning_id to plannings.id with ON DELETE CASCADE and ON UPDATE CASCADE
6. THE System SHALL enforce the project-to-planning one-to-one relationship through the UNIQUE constraint on plannings.project_id
7. THE System SHALL create an index on plannings.project_id
8. THE System SHALL create an index on events.planning_id
9. THE System SHALL validate that the color column value matches one of the allowed color names (Sky Cyan, Blush Pink, Soft Indigo, Sage Green) before insertion or update
10. THE System SHALL validate that if end_date is not null, then end_date is greater than start_date before insertion or update

### Requirement 10: API Endpoints for Projects

**User Story:** As a frontend developer, I want RESTful API endpoints for project operations, so that I can build the project management UI.

#### Acceptance Criteria

1. THE System SHALL provide a GET /api/projects endpoint that returns all projects for the user with response body containing an array of project objects with fields: id, name, description, start_date, end_date, color, status, last_accessed_at, created_at, updated_at
2. THE System SHALL provide a GET /api/projects/{id} endpoint that returns a specific project by ID with response body containing a single project object with fields: id, name, description, start_date, end_date, color, status, planning_id, last_accessed_at, created_at, updated_at
3. THE System SHALL provide a POST /api/projects endpoint that accepts a request body with fields: name, description (optional), start_date, end_date (optional), color, and creates a new project
4. THE System SHALL provide a PUT /api/projects/{id} endpoint that accepts a request body with fields: name, description, start_date, end_date (optional), color, status, and updates an existing project
5. THE System SHALL provide a DELETE /api/projects/{id} endpoint that deletes a project
6. THE System SHALL provide a PATCH /api/projects/{id}/access endpoint that updates the last_accessed_at timestamp to the current server time
7. WHEN the GET /api/projects endpoint is called, THE System SHALL return projects sorted by last_accessed_at in descending order (most recent first)
8. IF the GET /api/projects/{id} endpoint is called with an invalid ID, THEN THE System SHALL return a 404 Not Found response with error body: {"error": "Project not found", "id": "{provided_id}"}
9. IF the POST /api/projects endpoint receives invalid data, THEN THE System SHALL return a 400 Bad Request response with validation errors in the format: {"error": "Validation failed", "fields": {"field_name": "error message"}}
10. IF the PUT /api/projects/{id} endpoint is called with an invalid ID, THEN THE System SHALL return a 404 Not Found response with error body: {"error": "Project not found", "id": "{provided_id}"}
11. IF the PUT /api/projects/{id} endpoint receives invalid data, THEN THE System SHALL return a 400 Bad Request response with validation errors in the format: {"error": "Validation failed", "fields": {"field_name": "error message"}}
12. IF the PATCH /api/projects/{id}/access endpoint is called with an invalid ID, THEN THE System SHALL return a 404 Not Found response with error body: {"error": "Project not found", "id": "{provided_id}"}
13. WHEN the DELETE /api/projects/{id} endpoint successfully deletes a project, THE System SHALL return a 204 No Content response
14. WHEN the POST /api/projects endpoint successfully creates a project, THE System SHALL return a 201 Created response with the created project object in the response body
15. WHEN the PUT /api/projects/{id} endpoint successfully updates a project, THE System SHALL return a 200 OK response with the updated project object in the response body
16. WHEN the PATCH /api/projects/{id}/access endpoint successfully updates the timestamp, THE System SHALL return a 200 OK response

### Requirement 11: Frontend Project Dashboard

**User Story:** As a user, I want a visually appealing project dashboard, so that I can easily browse and access my projects.

#### Acceptance Criteria

1. THE System SHALL use the Plus Jakarta Sans font for project names on the My_Projects_Page
2. THE System SHALL use the DM Sans font for body text (project descriptions, dates, status) on the My_Projects_Page
3. THE System SHALL layout project cards using a 12-column grid system at screen widths ≥1024px (desktop)
4. THE System SHALL layout project cards using a 6-column grid system at screen widths between 768px and 1023px (tablet)
5. THE System SHALL space UI elements using multiples of 8px (padding, margins, gaps)
6. THE System SHALL display project cards with an 8px border radius
7. THE System SHALL display the project's assigned color as a 12px diameter colored dot in the top-right corner of each project card
8. THE System SHALL display summary metrics in a horizontal row at the top of the My_Projects_Page above the project cards grid
9. THE System SHALL display the "Create new project" button with a colored background using the Primary color (Sky Cyan #5EC4CD)
10. WHEN a user hovers over a project card, THE System SHALL apply a visual elevation effect by adding a box shadow with 4px vertical offset and 8px blur
11. IF the user has zero projects, THEN THE System SHALL display centered text stating "No projects yet. Create your first project to get started."
12. THE System SHALL display project cards in a grid with 24px gaps between cards

### Requirement 12: Project Creation Modal UI

**User Story:** As a user, I want an intuitive project creation modal, so that I can quickly set up new projects.

#### Acceptance Criteria

1. WHEN the "Create new project" button is clicked, THE System SHALL display the project creation modal
2. THE System SHALL provide a text input field for project name with a character counter displaying the format "X/255" where X is the current character count
3. THE System SHALL provide a textarea for project description with a character counter displaying the format "X/2000" where X is the current character count
4. THE System SHALL provide a date picker for the start date
5. THE System SHALL provide a date picker for the end date
6. THE System SHALL provide a color selector displaying the available project colors as swatches
7. THE System SHALL indicate required fields (project name, start date, and color) with a visual indicator
8. THE System SHALL prevent text input beyond 255 characters in the project name field
9. THE System SHALL prevent text input beyond 2000 characters in the project description field
10. WHEN a user modifies a field value, THE System SHALL validate that field
11. IF a field fails validation, THEN THE System SHALL display an error message inline below that field
12. IF an end date is provided and the end date is not after the start date, THEN THE System SHALL display an error message indicating that the end date must be after the start date
13. WHEN a user modifies an invalid field to make it valid, THE System SHALL remove the error message for that field
14. WHILE any required field is empty or invalid, THE System SHALL disable the "Create project" button
15. THE System SHALL provide a "Cancel" button that closes the modal without creating a project
16. WHEN a user clicks the "Create project" button with all required fields valid, THE System SHALL submit the project creation request
17. WHEN a project is successfully created, THE System SHALL close the modal and refresh the project list
18. IF the project creation request fails, THEN THE System SHALL display an error message indicating the creation failed and keep the modal open with user input preserved
19. THE System SHALL use the large border radius (12px) for the modal container
20. THE System SHALL apply the application's pastel color palette to the modal UI elements

### Requirement 13: Active Project Context

**User Story:** As a user, I want the application to track which project I'm currently working in, so that my actions are scoped to the correct project.

#### Acceptance Criteria

1. THE System SHALL maintain an active project context containing the project ID and planning ID in the frontend application state
2. WHEN a user selects a project from the sidebar or My_Projects_Page, THE System SHALL set that project as the active context by storing its project ID and planning ID
3. WHEN a project is set as active, THE System SHALL include the active project's planning ID in API requests that create or retrieve events
4. WHEN a user creates or edits an event, THE System SHALL associate it with the active project's planning ID
5. WHEN a user navigates to the calendar view, THE System SHALL load events filtered by the active project's planning ID
6. THE System SHALL persist the active project context (project ID and planning ID) to browser localStorage
7. WHEN the application loads, THE System SHALL restore the active project context from localStorage if it exists
8. IF the restored project ID from localStorage does not exist in the database, THEN THE System SHALL clear the active context and redirect to the My_Projects_Page
9. IF no project is active when the application loads, THEN THE System SHALL redirect the user to the My_Projects_Page
10. THE System SHALL visually indicate which project is currently active in the sidebar by applying a background highlight color to that project's menu item
