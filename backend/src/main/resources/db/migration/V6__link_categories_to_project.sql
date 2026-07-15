ALTER TABLE categories
    ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

UPDATE categories SET project_id = '00000000-0000-4000-a000-000000000001';

ALTER TABLE categories ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;

ALTER TABLE categories
    ADD CONSTRAINT uq__categories__project_name UNIQUE (project_id, name);

CREATE INDEX idx__categories__project_id ON categories (project_id);
