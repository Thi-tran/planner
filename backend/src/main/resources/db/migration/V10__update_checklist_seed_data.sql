-- Update seed data with simplified task status (todo/done)
-- This migration should be skipped in production

-- Only run if we're in development/test environment
DO $$
BEGIN
  -- Check if this is a development/test environment
  IF EXISTS (
    SELECT 1 FROM projects 
    WHERE id = '00000000-0000-4000-a000-000000000001'
  ) THEN

    -- Clear old seed data
    DELETE FROM task_comments WHERE task_id IN (
      SELECT id FROM checklist_tasks WHERE checklist_id IN (
        '10000000-0000-4000-a000-000000000001',
        '10000000-0000-4000-a000-000000000002'
      )
    );

    DELETE FROM checklist_tasks WHERE checklist_id IN (
      '10000000-0000-4000-a000-000000000001',
      '10000000-0000-4000-a000-000000000002'
    );

    DELETE FROM checklists WHERE id IN (
      '10000000-0000-4000-a000-000000000001',
      '10000000-0000-4000-a000-000000000002'
    );

    -- Insert sample checklists for General project
    INSERT INTO checklists (id, project_id, name, description, color, created_at, updated_at)
    VALUES 
      ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001', 
       'Pre-departure essentials', 'Things to do before the trip', 'Sky Cyan', 
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('10000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000001', 
       'Book flights — Checklist', 'Flight booking steps', 'Blush Pink', 
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

    -- Insert tasks with simplified status (todo/done)
    INSERT INTO checklist_tasks (checklist_id, description, deadline, status, display_order, created_at, updated_at)
    VALUES 
      ('10000000-0000-4000-a000-000000000001', 'Reserve accommodations', 
       CURRENT_DATE + INTERVAL '5 days', 'todo', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('10000000-0000-4000-a000-000000000001', 'Apply for foreign visa', 
       CURRENT_DATE + INTERVAL '10 days', 'todo', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('10000000-0000-4000-a000-000000000001', 'Book travel insurance', 
       CURRENT_DATE - INTERVAL '2 days', 'todo', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('10000000-0000-4000-a000-000000000001', 'Download offline maps', 
       CURRENT_DATE + INTERVAL '15 days', 'done', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('10000000-0000-4000-a000-000000000002', 'Compare prices on Skyscanner', 
       NULL, 'done', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('10000000-0000-4000-a000-000000000002', 'Purchase tickets', 
       CURRENT_DATE + INTERVAL '2 days', 'todo', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
       
  END IF;
END $$;
