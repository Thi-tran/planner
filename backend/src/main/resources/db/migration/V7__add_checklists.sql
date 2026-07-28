-- Create checklists table
CREATE TABLE checklists (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx__checklists__project_id ON checklists(project_id);

-- Create checklist_tasks table
CREATE TABLE checklist_tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    deadline DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'unchecked',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk__checklist_tasks__status CHECK (status IN ('unchecked', 'in-progress', 'done'))
);

CREATE INDEX idx__checklist_tasks__checklist_id_display_order ON checklist_tasks(checklist_id, display_order);
CREATE INDEX idx__checklist_tasks__assigned_to ON checklist_tasks(assigned_to);

-- Create task_comments table
CREATE TABLE task_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES checklist_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx__task_comments__task_id ON task_comments(task_id);
