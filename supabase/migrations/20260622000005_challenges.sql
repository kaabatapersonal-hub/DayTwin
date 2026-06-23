-- ============================================================
-- DayTwin — Challenges (Session 8)
-- Run AFTER 20260622000004_friends.sql
-- ============================================================

-- ============================================================
-- Schema additions
-- ============================================================

-- Add invitee_id so the invited user can discover the challenge before joining.
-- Without this the invitee has no challenge_participants row yet, so the existing
-- challenges_select_participants policy wouldn't let them see it.
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS invitee_id uuid REFERENCES users ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- ============================================================
-- RLS additions
-- ============================================================

-- Invitee can read a pending challenge before they've accepted.
CREATE POLICY "challenges_select_invitee"
  ON challenges FOR SELECT
  USING (invitee_id = auth.uid());

-- Invitee can cancel a pending challenge (decline = set status to cancelled).
-- USING gates on the existing row; WITH CHECK gates on the new row.
CREATE POLICY "challenges_invitee_cancel"
  ON challenges FOR UPDATE
  USING (invitee_id = auth.uid() AND status = 'pending')
  WITH CHECK (status = 'cancelled');

-- Any participant can cancel an active challenge (e.g. ending a friends_feed).
-- Creator can already update via challenges_all_creator; this covers the other participant.
CREATE POLICY "challenges_participant_cancel"
  ON challenges FOR UPDATE
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM challenge_participants cp
      WHERE cp.challenge_id = challenges.id AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (status = 'cancelled');

-- Habit pact: the pact habit name is visible to the OTHER participant while the
-- challenge is active or pending, because they explicitly joined together.
-- Outside this challenge, the same habit row is still private per habits_all_own.
CREATE POLICY "habits_select_pact_participants"
  ON habits FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM challenges c
      JOIN challenge_participants cp ON cp.challenge_id = c.id
      WHERE c.habit_id = habits.id
        AND c.type = 'habit_pact'
        AND c.status IN ('active', 'pending')
        AND cp.user_id = auth.uid()
    )
  );

-- ============================================================
-- Trigger: auto-activate challenge when both participants have joined
-- Fires AFTER INSERT on challenge_participants.
-- SECURITY DEFINER lets it bypass RLS to UPDATE challenges.status
-- (participants cannot update challenges, only the creator can).
-- ============================================================

CREATE OR REPLACE FUNCTION public.activate_challenge_when_full()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_participant_count int;
  v_challenge_type    text;
BEGIN
  SELECT COUNT(*) INTO v_participant_count
  FROM challenge_participants
  WHERE challenge_id = NEW.challenge_id;

  -- V1 is 1-vs-1 only; 2 participants = both sides ready
  IF v_participant_count < 2 THEN
    RETURN NEW;
  END IF;

  SELECT type INTO v_challenge_type
  FROM challenges
  WHERE id = NEW.challenge_id;

  UPDATE challenges
  SET status = 'active'
  WHERE id = NEW.challenge_id
    AND status = 'pending';

  -- Habit pact starts with streak intact for all participants
  IF v_challenge_type = 'habit_pact' THEN
    UPDATE challenge_participants
    SET streak_held = true
    WHERE challenge_id = NEW.challenge_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_participant_joined ON challenge_participants;
CREATE TRIGGER on_participant_joined
  AFTER INSERT ON challenge_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_challenge_when_full();

-- ============================================================
-- Trigger: sync score_battle current_score when daily score changes.
-- Recomputes each participant's average daily score since the challenge
-- started and stores it in current_score. This keeps the leaderboard
-- accurate without any client-side arithmetic.
-- Fires AFTER INSERT OR UPDATE on daily_scores.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_challenge_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- For each active score_battle this user is in, recompute their average
  UPDATE challenge_participants cp
  SET current_score = (
    SELECT COALESCE(ROUND(AVG(ds.score_pct))::int, 0)
    FROM daily_scores ds
    WHERE ds.user_id = NEW.user_id
      AND ds.date >= c.starts_at
      AND (c.ends_at IS NULL OR ds.date <= c.ends_at)
  )
  FROM challenges c
  WHERE cp.challenge_id = c.id
    AND cp.user_id = NEW.user_id
    AND c.type = 'score_battle'
    AND c.status = 'active';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_daily_score_change ON daily_scores;
CREATE TRIGGER on_daily_score_change
  AFTER INSERT OR UPDATE ON daily_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_challenge_score();

-- ============================================================
-- Trigger: break habit_pact streak when a participant misses a day.
-- "Miss" = habit_log.completed = false AND grace day for that habit is used.
-- Fires AFTER INSERT OR UPDATE on habit_logs.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_habit_pact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_challenge_id uuid;
  v_grace_used   bool;
BEGIN
  -- Only act on incomplete logs
  IF NEW.completed IS NOT FALSE THEN
    RETURN NEW;
  END IF;

  -- Find an active habit_pact involving this habit and this user
  SELECT c.id INTO v_challenge_id
  FROM challenges c
  JOIN challenge_participants cp
    ON cp.challenge_id = c.id AND cp.user_id = NEW.user_id
  WHERE c.habit_id = NEW.habit_id
    AND c.type = 'habit_pact'
    AND c.status = 'active'
    AND NEW.date >= c.starts_at
  LIMIT 1;

  IF v_challenge_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only break the pact if the grace day for this habit has already been used
  -- (spec: "if either person misses a scheduled day and their grace day is already used")
  SELECT grace_day_used_this_week INTO v_grace_used
  FROM habit_streaks
  WHERE habit_id = NEW.habit_id;

  IF COALESCE(v_grace_used, false) THEN
    UPDATE challenge_participants
    SET streak_held = false
    WHERE challenge_id = v_challenge_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_habit_log_change ON habit_logs;
CREATE TRIGGER on_habit_log_change
  AFTER INSERT OR UPDATE ON habit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.check_habit_pact();

-- ============================================================
-- NOTE: Enable Realtime for challenge_participants in the Supabase Dashboard.
-- Go to Database → Replication → Tables → enable challenge_participants.
-- SQL cannot enable Realtime subscriptions — it requires the dashboard toggle.
-- The ScoreBattleDetail component subscribes to postgres_changes on this table.
-- ============================================================
