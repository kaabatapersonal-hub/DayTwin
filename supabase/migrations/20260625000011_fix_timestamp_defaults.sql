-- time_entries.start_at and focus_sessions.started_at were declared NOT NULL
-- without DEFAULT now(), but all insert paths omit the field expecting a DB default.
-- This migration adds the missing defaults so the schema matches the code intent.

ALTER TABLE time_entries
  ALTER COLUMN start_at SET DEFAULT now();

ALTER TABLE focus_sessions
  ALTER COLUMN started_at SET DEFAULT now();
