-- Add event to checklists table
ALTER TABLE checklists 
ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE SET NULL;
