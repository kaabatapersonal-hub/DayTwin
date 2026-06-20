-- ============================================================
-- DayTwin — Initial Schema Migration
-- Run in Supabase SQL Editor or via: supabase db push
-- ============================================================

-- ============================================================
-- Custom enum types
-- ============================================================

CREATE TYPE tone_preference     AS ENUM ('warm', 'direct', 'hype');
CREATE TYPE subscription_tier   AS ENUM ('free', 'pro');
CREATE TYPE task_category       AS ENUM ('deep_work', 'study', 'health', 'admin', 'personal');
CREATE TYPE task_priority       AS ENUM ('low', 'medium', 'high');
CREATE TYPE focus_session_status AS ENUM ('completed', 'cancelled');
CREATE TYPE habit_type          AS ENUM ('boolean', 'count', 'timer');
CREATE TYPE goal_status         AS ENUM ('active', 'completed', 'archived');
CREATE TYPE project_status      AS ENUM ('active', 'completed', 'archived');
CREATE TYPE mood_period         AS ENUM ('morning', 'midday', 'evening');
CREATE TYPE friendship_status   AS ENUM ('pending', 'accepted', 'blocked');
CREATE TYPE challenge_type      AS ENUM ('score_battle', 'habit_pact', 'friends_feed');
CREATE TYPE challenge_status    AS ENUM ('pending', 'active', 'completed', 'cancelled');
CREATE TYPE profile_item_type   AS ENUM ('frame', 'avatar', 'border', 'icon');
CREATE TYPE badge_rarity        AS ENUM ('common', 'rare', 'legendary');

-- ============================================================
-- Section 6: Economy (no FK deps — created first to unblock users.active_theme_id)
-- ============================================================

CREATE TABLE themes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  accent_hex      text NOT NULL,
  background_hex  text NOT NULL,
  cost_sparks     int  NOT NULL,
  category        text NOT NULL
);

CREATE TABLE profile_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type         profile_item_type NOT NULL,
  name         text NOT NULL,
  asset_url    text NOT NULL,
  cost_sparks  int  NOT NULL
);

CREATE TABLE motivation_packs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  content      jsonb NOT NULL,
  cost_sparks  int  NOT NULL
);

CREATE TABLE sound_packs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  audio_url    text NOT NULL,
  cost_sparks  int  NOT NULL
);

CREATE TABLE badges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text NOT NULL,
  icon         text NOT NULL,
  rarity       badge_rarity NOT NULL,
  criteria     text NOT NULL
);

-- ============================================================
-- Section 1: Identity & account
-- ============================================================

CREATE TABLE users (
  id                     uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  is_anonymous           bool              NOT NULL DEFAULT true,
  email                  text              UNIQUE,
  username               text              UNIQUE,
  display_name           text,
  preferred_name         text,
  tone_preference        tone_preference   NOT NULL DEFAULT 'warm',
  avatar_url             text,
  timezone               text              NOT NULL DEFAULT 'Africa/Accra',
  last_active_at         timestamptz,
  subscription_tier      subscription_tier NOT NULL DEFAULT 'free',
  subscription_renews_at timestamptz,
  paystack_customer_id   text,
  sparks_balance         int               NOT NULL DEFAULT 0,
  sparks_lifetime        int               NOT NULL DEFAULT 0,
  active_theme_id        uuid              REFERENCES themes ON DELETE SET NULL,
  reduced_motion         bool              NOT NULL DEFAULT false,
  created_at             timestamptz       NOT NULL DEFAULT now()
);

CREATE TABLE user_settings (
  user_id               uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE,
  notif_task_reminders  bool NOT NULL DEFAULT true,
  notif_habit_risk      bool NOT NULL DEFAULT true,
  notif_streak_risk     bool NOT NULL DEFAULT true,
  notif_friend_activity bool NOT NULL DEFAULT true,
  notif_weekly_review   bool NOT NULL DEFAULT true,
  morning_checkin_time  time NOT NULL DEFAULT '07:00',
  evening_checkin_time  time NOT NULL DEFAULT '20:00',
  dashboard_layout      jsonb
);

-- ============================================================
-- Section 2: Daily planning
-- ============================================================

CREATE TABLE day_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  name       text NOT NULL,
  blocks     jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE goals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  title        text NOT NULL,
  why_text     text,
  deadline     date,
  progress_pct int         NOT NULL DEFAULT 0,
  status       goal_status NOT NULL DEFAULT 'active',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  goal_id    uuid REFERENCES goals ON DELETE SET NULL,
  title      text NOT NULL,
  status     project_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  project_id   uuid REFERENCES projects ON DELETE SET NULL,
  title        text NOT NULL,
  date         date NOT NULL,
  start_time   time,
  end_time     time,
  category     task_category  NOT NULL,
  priority     task_priority  NOT NULL DEFAULT 'medium',
  completed    bool           NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at   timestamptz    NOT NULL DEFAULT now()
);

CREATE TABLE time_entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  task_id          uuid REFERENCES tasks ON DELETE SET NULL,
  category         text NOT NULL,
  start_at         timestamptz NOT NULL,
  end_at           timestamptz,
  duration_seconds int
);

CREATE TABLE focus_sessions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  task_id                  uuid REFERENCES tasks ON DELETE SET NULL,
  planned_duration_seconds int  NOT NULL,
  actual_duration_seconds  int,
  status                   focus_session_status NOT NULL,
  started_at               timestamptz NOT NULL,
  ended_at                 timestamptz
);

CREATE TABLE daily_scores (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  date      date NOT NULL,
  score_pct int  NOT NULL,
  breakdown jsonb NOT NULL,
  UNIQUE(user_id, date)
);

-- ============================================================
-- Section 3: Habits
-- ============================================================

CREATE TABLE habits (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  name         text NOT NULL,
  type         habit_type NOT NULL,
  target_value int,
  frequency    jsonb NOT NULL,
  archived     bool NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE habit_logs (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id  uuid NOT NULL REFERENCES habits ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES users  ON DELETE CASCADE,
  date      date NOT NULL,
  value     int,
  completed bool NOT NULL,
  UNIQUE(habit_id, date)
);

CREATE TABLE habit_streaks (
  habit_id                 uuid PRIMARY KEY REFERENCES habits ON DELETE CASCADE,
  current_streak           int  NOT NULL DEFAULT 0,
  consistency_30d_pct      int  NOT NULL DEFAULT 0,
  grace_day_used_this_week bool NOT NULL DEFAULT false,
  last_grace_reset         date
);

-- ============================================================
-- Section 4: Goals & reflection
-- ============================================================

CREATE TABLE intentions (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  date      date NOT NULL,
  text      text NOT NULL,
  UNIQUE(user_id, date)
);

CREATE TABLE reflections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  date        date NOT NULL,
  went_well   text NOT NULL,
  time_wasted text,
  biggest_win text,
  UNIQUE(user_id, date)
);

CREATE TABLE mood_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  logged_at    timestamptz NOT NULL,
  period       mood_period NOT NULL,
  mood_value   int NOT NULL CHECK (mood_value   BETWEEN 1 AND 5),
  energy_value int          CHECK (energy_value BETWEEN 1 AND 5)
);

CREATE TABLE weekly_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  week_start      date NOT NULL,
  tasks_completed int  NOT NULL,
  habits_pct      int  NOT NULL,
  focus_hours     numeric NOT NULL,
  best_day        date,
  worst_day       date,
  ai_summary      text,
  UNIQUE(user_id, week_start)
);

-- ============================================================
-- Section 5: Friends & challenges
-- ============================================================

CREATE TABLE friendships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  status       friendship_status NOT NULL DEFAULT 'pending',
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

CREATE TABLE challenges (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type              challenge_type   NOT NULL,
  habit_id          uuid REFERENCES habits ON DELETE SET NULL,
  created_by        uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  duration_days     int,
  starts_at         date NOT NULL,
  ends_at           date,
  entry_cost_sparks int  NOT NULL DEFAULT 0,
  pool_total_sparks int  NOT NULL DEFAULT 0,
  status            challenge_status NOT NULL DEFAULT 'pending'
);

CREATE TABLE challenge_participants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id  uuid NOT NULL REFERENCES challenges ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  joined_at     timestamptz NOT NULL DEFAULT now(),
  current_score int  NOT NULL DEFAULT 0,
  streak_held   bool,
  UNIQUE(challenge_id, user_id)
);

-- ============================================================
-- Section 6 continued: Sparks economy (user-linked tables)
-- ============================================================

-- No client INSERT policy is created for this table — see RLS migration.
CREATE TABLE spark_transactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  amount         int  NOT NULL,
  reason         text NOT NULL,
  reference_type text,
  reference_id   uuid,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_unlocked_themes (
  user_id     uuid NOT NULL REFERENCES users  ON DELETE CASCADE,
  theme_id    uuid NOT NULL REFERENCES themes ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, theme_id)
);

CREATE TABLE user_unlocked_items (
  user_id     uuid NOT NULL REFERENCES users         ON DELETE CASCADE,
  item_id     uuid NOT NULL REFERENCES profile_items ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, item_id)
);

CREATE TABLE user_unlocked_packs (
  user_id uuid NOT NULL REFERENCES users            ON DELETE CASCADE,
  pack_id uuid NOT NULL REFERENCES motivation_packs ON DELETE CASCADE,
  PRIMARY KEY(user_id, pack_id)
);

CREATE TABLE user_unlocked_sounds (
  user_id  uuid NOT NULL REFERENCES users       ON DELETE CASCADE,
  sound_id uuid NOT NULL REFERENCES sound_packs ON DELETE CASCADE,
  PRIMARY KEY(user_id, sound_id)
);

CREATE TABLE user_badges (
  user_id   uuid NOT NULL REFERENCES users  ON DELETE CASCADE,
  badge_id  uuid NOT NULL REFERENCES badges ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, badge_id)
);

-- ============================================================
-- Indexes (from schema Indexing Notes)
-- ============================================================

CREATE INDEX idx_tasks_user_date                ON tasks(user_id, date);
CREATE INDEX idx_habit_logs_user_date           ON habit_logs(user_id, date);
CREATE INDEX idx_daily_scores_user_date         ON daily_scores(user_id, date);
CREATE INDEX idx_friendships_requester          ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee          ON friendships(addressee_id);
CREATE INDEX idx_challenge_participants_score   ON challenge_participants(challenge_id, current_score DESC);
CREATE INDEX idx_spark_transactions_user_date   ON spark_transactions(user_id, created_at DESC);

-- ============================================================
-- Trigger: auto-create public.users + user_settings on auth sign-up
-- Fires for both anonymous and real users.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, is_anonymous, email, created_at)
  VALUES (
    new.id,
    COALESCE(new.is_anonymous, true),
    new.email,
    new.created_at
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Trigger: block direct client writes to sparks columns on users
-- SECURITY INVOKER → runs as the role executing the UPDATE.
-- Authenticated/anon clients are blocked; SECURITY DEFINER server
-- functions run as 'postgres' and bypass the check.
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_sparks_direct_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (
    NEW.sparks_balance  IS DISTINCT FROM OLD.sparks_balance OR
    NEW.sparks_lifetime IS DISTINCT FROM OLD.sparks_lifetime
  ) THEN
    IF current_user IN ('authenticated', 'anon') THEN
      RAISE EXCEPTION
        'sparks_balance and sparks_lifetime cannot be updated directly. Use server-side functions.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER guard_sparks_columns
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_sparks_direct_update();

-- ============================================================
-- Function: friend search — returns only public fields.
-- Exact-match only (no browsable directory in V1).
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_user_by_username(search_username text)
RETURNS TABLE (id uuid, username text, display_name text, avatar_url text)
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, username, display_name, avatar_url
  FROM users
  WHERE username = search_username
    AND username IS NOT NULL;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.search_user_by_username(text) TO authenticated;
