-- Make details NULLABLE after migration
ALTER TABLE checklist_tasks
ALTER COLUMN details DROP NOT NULL;
