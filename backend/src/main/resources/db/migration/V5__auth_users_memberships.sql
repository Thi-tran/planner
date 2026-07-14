CREATE TABLE users (
    id           UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    google_sub   VARCHAR(255) NOT NULL,
    email        VARCHAR(320) NOT NULL,
    display_name VARCHAR(255),
    picture_url  TEXT,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq__users__google_sub UNIQUE (google_sub),
    CONSTRAINT uq__users__email      UNIQUE (email)
);

CREATE TABLE project_memberships (
    id             UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id     UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id        UUID                  REFERENCES users(id)    ON DELETE CASCADE,
    invited_email  VARCHAR(320),
    role           VARCHAR(20)  NOT NULL,
    status         VARCHAR(20)  NOT NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk__project_memberships__role   CHECK (role   IN ('OWNER', 'EDITOR', 'VIEWER')),
    CONSTRAINT chk__project_memberships__status CHECK (status IN ('ACTIVE', 'PENDING'))
);

-- Partial unique: one active membership per (project, user)
CREATE UNIQUE INDEX uq__project_memberships__project_user
    ON project_memberships (project_id, user_id)
    WHERE user_id IS NOT NULL;

-- Partial unique: one pending invite per (project, email)
CREATE UNIQUE INDEX uq__project_memberships__project_email
    ON project_memberships (project_id, invited_email)
    WHERE invited_email IS NOT NULL;

CREATE INDEX idx__project_memberships__user_id    ON project_memberships (user_id);
CREATE INDEX idx__project_memberships__project_id ON project_memberships (project_id);
