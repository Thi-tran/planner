-- Simplify task status from 3 states to 2 states
-- Before: unchecked, in-progress, done
-- After: todo, done

-- Step 1: Drop the old constraint first
ALTER TABLE checklist_tasks 
DROP CONSTRAINT chk__checklist_tasks__status;

-- Step 2: Migrate existing data
UPDATE checklist_tasks 
SET status = 'todo' 
WHERE status IN ('unchecked', 'in-progress');

-- Step 3: Add new constraint with simplified states
ALTER TABLE checklist_tasks 
ADD CONSTRAINT chk__checklist_tasks__status 
CHECK (status IN ('todo', 'done'));
