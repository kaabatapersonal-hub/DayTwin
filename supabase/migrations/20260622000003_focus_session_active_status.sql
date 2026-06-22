-- Extends focus_session_status to include 'active' so a session row can be written
-- immediately at start (preserving the server-side started_at timestamp for anti-cheat),
-- then updated to 'completed' or 'cancelled' when it ends.
ALTER TYPE focus_session_status ADD VALUE IF NOT EXISTS 'active';
