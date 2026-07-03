CREATE TABLE projects (
    id                UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name              VARCHAR(255) NOT NULL,
    description       TEXT,
    start_date        DATE         NOT NULL,
    end_date          DATE,
    color             VARCHAR(50)  NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'in progress',
    last_accessed_at  TIMESTAMP,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_end_after_start CHECK (end_date IS NULL OR end_date > start_date),
    CONSTRAINT chk_color CHECK (color IN ('Sky Cyan', 'Blush Pink', 'Soft Indigo', 'Sage Green')),
    CONSTRAINT chk_status CHECK (status IN ('in progress', 'completed', 'on hold', 'planning'))
);

-- Create a default project for existing events
-- Using deterministic UUID for stable development/testing
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
);

-- Add project_id column (nullable first to allow backfill)
ALTER TABLE events
    ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Link all existing events to the default project
UPDATE events
SET project_id = '00000000-0000-4000-a000-000000000001'
WHERE project_id IS NULL;

-- Now make project_id NOT NULL
ALTER TABLE events
    ALTER COLUMN project_id SET NOT NULL;

CREATE INDEX idx_events_project_id ON events (project_id);
CREATE INDEX idx_projects_last_accessed ON projects (last_accessed_at DESC NULLS LAST);
