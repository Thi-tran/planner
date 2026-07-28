-- Seed data for testing (development/staging only)
-- This migration should be skipped in production

-- Only run if we're not in production (check for existence of dev-only project)
-- Production databases won't have the hardcoded UUID from V1 seed data
DO $$
BEGIN
  -- Check if this is a development/test environment
  -- by looking for the seed project created in V1
  IF EXISTS (
    SELECT 1 FROM projects 
    WHERE id = '00000000-0000-4000-a000-000000000001'
  ) THEN
    
    -- Insert sample checklists for General project
    INSERT INTO checklists (id, project_id, name, description, color, created_at, updated_at)
    VALUES (
        '10000000-0000-4000-a000-000000000001',
        '00000000-0000-4000-a000-000000000001',
        'Pre-departure essentials',
        'Things to do before the trip',
        'Sky Cyan',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    INSERT INTO checklists (id, project_id, name, description, color, created_at, updated_at)
    VALUES (
        '10000000-0000-4000-a000-000000000002',
        '00000000-0000-4000-a000-000000000001',
        'Book flights — Checklist',
        'Flight booking steps',
        'Blush Pink',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    -- Insert tasks for first checklist
    INSERT INTO checklist_tasks (checklist_id, description, deadline, status, display_order, created_at, updated_at)
    VALUES 
        ('10000000-0000-4000-a000-000000000001', 'Reserve accommodations', CURRENT_DATE + INTERVAL '5 days', 'unchecked', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('10000000-0000-4000-a000-000000000001', 'Apply for foreign visa', CURRENT_DATE + INTERVAL '10 days', 'in-progress', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('10000000-0000-4000-a000-000000000001', 'Book travel insurance', CURRENT_DATE - INTERVAL '2 days', 'unchecked', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('10000000-0000-4000-a000-000000000001', 'Download offline maps', CURRENT_DATE + INTERVAL '15 days', 'done', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

    -- Insert tasks for second checklist  
    INSERT INTO checklist_tasks (checklist_id, description, deadline, status, display_order, created_at, updated_at)
    VALUES 
        ('10000000-0000-4000-a000-000000000002', 'Compare prices on Skyscanner', NULL, 'done', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('10000000-0000-4000-a000-000000000002', 'Purchase tickets', CURRENT_DATE + INTERVAL '2 days', 'in-progress', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        
  END IF;
END $$;
