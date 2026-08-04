-- V11: Add due_date to checklists, add title/details/priority to checklist_tasks
-- This migration supports checklist due dates and enhanced task fields

-- Add due_date to checklists table
ALTER TABLE checklists 
ADD COLUMN due_date DATE;

-- Add title and priority to checklist_tasks
ALTER TABLE checklist_tasks
ADD COLUMN title VARCHAR(500),
ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';

-- Migrate existing data: copy description to title
UPDATE checklist_tasks SET title = description WHERE title IS NULL;

-- Rename description column to details
ALTER TABLE checklist_tasks
RENAME COLUMN description TO details;

-- Make title NOT NULL after migration
ALTER TABLE checklist_tasks
ALTER COLUMN title SET NOT NULL;

-- Add constraint for priority values
ALTER TABLE checklist_tasks
ADD CONSTRAINT chk__checklist_tasks__priority 
CHECK (priority IN ('low', 'medium', 'high'));

-- Add helpful column comments
COMMENT ON COLUMN checklists.due_date IS 'Optional due date for the checklist';
COMMENT ON COLUMN checklist_tasks.title IS 'Short title/name of the task (previously stored in description)';
COMMENT ON COLUMN checklist_tasks.details IS 'Detailed description of the task (previously named description)';
COMMENT ON COLUMN checklist_tasks.priority IS 'Task priority: low, medium, or high';
