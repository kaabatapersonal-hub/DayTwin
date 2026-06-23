-- ============================================================
-- DayTwin — Notifications & PWA Schema
-- Adds OneSignal player ID, username change tracking,
-- and additional notification preference columns.
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onesignal_player_id text,
  ADD COLUMN IF NOT EXISTS username_changed_at  timestamptz;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS notif_challenge_invites bool NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_score_updates     bool NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_pact_miss         bool NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_daily_count       int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notif_last_sent_date    date;
