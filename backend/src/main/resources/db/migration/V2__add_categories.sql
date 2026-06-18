CREATE TABLE categories (
    id    UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name  VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7)   NOT NULL
);

ALTER TABLE events
    ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX idx_events_category_id ON events (category_id);

-- Seed default categories (deterministic UUIDs for stable local dev)
INSERT INTO categories (id, name, color) VALUES
    ('00000000-0000-4000-a000-000000000001', 'Travel',   '#3b82f6'),
    ('00000000-0000-4000-a000-000000000002', 'Meeting',  '#8b5cf6'),
    ('00000000-0000-4000-a000-000000000003', 'Shopping', '#f59e0b'),
    ('00000000-0000-4000-a000-000000000004', 'Work',     '#ef4444'),
    ('00000000-0000-4000-a000-000000000005', 'Family',   '#10b981'),
    ('00000000-0000-4000-a000-000000000006', 'Other',    '#94a3b8');
