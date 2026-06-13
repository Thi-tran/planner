CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE events (
    id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    start_time  TIMESTAMPTZ NOT NULL,
    end_time    TIMESTAMPTZ NOT NULL,
    color       VARCHAR(7),
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_events_start_time ON events (start_time);
CREATE INDEX idx_events_end_time   ON events (end_time);
