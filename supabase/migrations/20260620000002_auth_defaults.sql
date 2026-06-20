-- Add DEFAULT auth.uid() to every user_id column that lacks it.
-- Without this, client-side inserts that omit user_id hit a NOT NULL
-- violation before RLS even runs. auth.uid() is resolved at insert time
-- from the caller's JWT, so it's equivalent to a trigger but cheaper.

ALTER TABLE tasks       ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE time_entries ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE focus_sessions ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE daily_scores ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE habits      ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE habit_logs  ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE intentions  ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE reflections ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE mood_logs   ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE goals       ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE projects    ALTER COLUMN user_id SET DEFAULT auth.uid();
