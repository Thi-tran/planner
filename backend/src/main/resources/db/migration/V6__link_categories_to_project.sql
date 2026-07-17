ALTER TABLE categories
    ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Ensure the General project exists before backfilling categories.
-- It was seeded in V4, but may have been deleted via the UI (which cascades
-- events). Using ON CONFLICT DO NOTHING makes this safe to re-run on any DB.
INSERT INTO projects (id, name, description, start_date, color, status, created_at, updated_at)
VALUES (
    '00000000-0000-4000-a000-000000000001',
    'General',
    'Default project for existing events',
    CURRENT_DATE,
    'Sky Cyan',
    'in progress',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

UPDATE categories SET project_id = '00000000-0000-4000-a000-000000000001';

ALTER TABLE categories ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;

ALTER TABLE categories
    ADD CONSTRAINT uq__categories__project_name UNIQUE (project_id, name);

CREATE INDEX idx__categories__project_id ON categories (project_id);
