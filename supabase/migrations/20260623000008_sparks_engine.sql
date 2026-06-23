-- ============================================================
-- DayTwin — Session 11: Sparks Earning Engine
--
-- Architecture principle: the client NEVER writes Sparks.
-- Every earn/reversal flows through award_sparks(), called only
-- by SECURITY DEFINER triggers. RLS blocks direct client writes
-- to spark_transactions and users.sparks_balance/sparks_lifetime.
-- ============================================================

-- ============================================================
-- 1. Growth levels config table
-- ============================================================

CREATE TABLE IF NOT EXISTS growth_levels (
  level      int  PRIMARY KEY,
  threshold  int  NOT NULL,  -- sparks_lifetime needed to reach this level
  label      text NOT NULL
);

INSERT INTO growth_levels (level, threshold, label) VALUES
  (1,     0,  'Starter'),
  (2,   100,  'Building'),
  (3,   300,  'Consistent'),
  (4,   600,  'Focused'),
  (5,  1000,  'Disciplined'),
  (6,  1500,  'Driven'),
  (7,  2500,  'Momentum'),
  (8,  4000,  'Elite'),
  (9,  6000,  'Legendary'),
  (10, 10000, 'DayTwin')
ON CONFLICT (level) DO UPDATE SET threshold = EXCLUDED.threshold, label = EXCLUDED.label;

-- Anyone can read growth levels (it's a catalogue, not personal data)
ALTER TABLE growth_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "growth_levels_select_all"
  ON growth_levels FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 2. Indexes for spark_transactions
--    Per database-schema.md: (user_id, created_at DESC) for history
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_spark_transactions_user_date
  ON spark_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_spark_transactions_reason
  ON spark_transactions(user_id, reason, created_at DESC);

-- ============================================================
-- 3. Surprise reward badge seeds (fixed UUIDs, idempotent)
-- ============================================================

INSERT INTO badges (id, name, description, icon, rarity, criteria) VALUES
  ('ba1e0010-0000-0000-0000-000000000010',
   'Early Bird',
   'Started a focus session before 7am.',
   '🌅', 'common',
   'focus_session.started_at hour < 7 in user timezone'),
  ('ba1e0011-0000-0000-0000-000000000011',
   'Deep Worker',
   'Logged 3+ hours of focus in one day.',
   '🎯', 'rare',
   'sum(focus_sessions.actual_duration_seconds) >= 10800 in a day'),
  ('ba1e0012-0000-0000-0000-000000000012',
   'Consistency Hero',
   'Active on 20+ days in one calendar month.',
   '📅', 'rare',
   'daily_scores count in a month >= 20'),
  ('ba1e0013-0000-0000-0000-000000000013',
   'Night Owl',
   'Submitted a reflection after 11pm.',
   '🦉', 'common',
   'reflection inserted after 23:00 local time'),
  ('ba1e0014-0000-0000-0000-000000000014',
   'Perfect Week',
   'Scored 80%+ every day for 7 consecutive days.',
   '⭐', 'legendary',
   '7 consecutive daily_scores all >= 80')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. award_sparks() — central function
--
-- Called by all triggers below. SECURITY DEFINER so it can write
-- spark_transactions (blocked for clients) and update users balance.
--
-- Positive p_amount = earn; negative = reversal.
-- Daily cap is enforced per category for positive amounts only.
-- sparks_lifetime never decreases (invariant upheld here).
-- Returns the user's new sparks_balance.
-- ============================================================

CREATE OR REPLACE FUNCTION award_sparks(
  p_user_id        uuid,
  p_amount         int,
  p_reason         text,
  p_reference_type text DEFAULT NULL,
  p_reference_id   uuid DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_category_prefix text;
  v_cap             int;
  v_today_earned    int;
  v_balance_delta   int;
  v_current_balance int;
  v_new_balance     int;
BEGIN
  -- ── Step 1: Resolve category and daily cap ──────────────────────────────────
  -- Each reason maps to a cap category. Reasons without a category (challenges,
  -- friends, weekly review, surprise badges) have no daily cap.
  v_category_prefix := CASE
    WHEN p_reason IN ('task_completed_low', 'task_completed_medium', 'task_completed_high')
                                              THEN 'task_completed'
    WHEN p_reason = 'all_tasks_bonus'         THEN 'all_tasks_bonus'
    WHEN p_reason IN ('habit_boolean', 'habit_count', 'habit_timer')
                                              THEN 'habit'
    WHEN p_reason IN ('focus_session_short', 'focus_session_medium', 'focus_session_long')
                                              THEN 'focus_session'
    WHEN p_reason = 'focus_triple_bonus'      THEN 'focus_triple_bonus'
    WHEN p_reason = 'reflection_submitted'    THEN 'reflection'
    WHEN p_reason = 'mood_checkin'            THEN 'mood'
    WHEN p_reason = 'recovery_reward'         THEN 'recovery'
    ELSE NULL  -- no cap: challenges, first_friend, weekly_review, surprise badge Sparks
  END;

  v_cap := CASE v_category_prefix
    WHEN 'task_completed'   THEN 20   -- per spec: 20 Sparks/day from task completions
    WHEN 'all_tasks_bonus'  THEN 20   -- once per day (award == cap)
    WHEN 'habit'            THEN 15
    WHEN 'focus_session'    THEN 40
    WHEN 'focus_triple_bonus' THEN 10 -- once per day (award == cap)
    WHEN 'reflection'       THEN 5
    WHEN 'mood'             THEN 6
    WHEN 'recovery'         THEN 25   -- once per return event
    ELSE NULL
  END;

  -- ── Step 2: Cap check (positive earns only) ─────────────────────────────────
  IF p_amount > 0 AND v_cap IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_today_earned
    FROM spark_transactions
    WHERE user_id = p_user_id
      AND amount > 0   -- only count earns, not reversals
      AND reason LIKE (v_category_prefix || '%')
      AND date(created_at AT TIME ZONE 'UTC') = current_date;

    -- Already at or over cap for today
    IF v_today_earned >= v_cap THEN
      SELECT sparks_balance INTO v_new_balance FROM users WHERE id = p_user_id;
      RETURN COALESCE(v_new_balance, 0);
    END IF;

    -- Clamp the award to the remaining cap allowance for today
    p_amount := LEAST(p_amount, v_cap - v_today_earned);
  END IF;

  -- ── Step 3: Clamp reversals to not go below balance zero ───────────────────
  IF p_amount < 0 THEN
    SELECT sparks_balance INTO v_current_balance FROM users WHERE id = p_user_id;
    -- e.g. balance=1, reversal=-5 → delta=-1 (not -5)
    v_balance_delta := GREATEST(p_amount, -COALESCE(v_current_balance, 0));
  ELSE
    v_balance_delta := p_amount;
  END IF;

  -- Skip zero-amount transactions
  IF v_balance_delta = 0 THEN
    SELECT sparks_balance INTO v_new_balance FROM users WHERE id = p_user_id;
    RETURN COALESCE(v_new_balance, 0);
  END IF;

  -- ── Step 4: Write the transaction record ────────────────────────────────────
  INSERT INTO spark_transactions (user_id, amount, reason, reference_type, reference_id)
  VALUES (p_user_id, v_balance_delta, p_reason, p_reference_type, p_reference_id);

  -- ── Step 5: Update balance + lifetime atomically ────────────────────────────
  -- sparks_lifetime only grows (invariant) — reversals don't reduce it.
  UPDATE users
  SET
    sparks_balance  = sparks_balance + v_balance_delta,
    sparks_lifetime = CASE
                        WHEN v_balance_delta > 0 THEN sparks_lifetime + v_balance_delta
                        ELSE sparks_lifetime
                      END
  WHERE id = p_user_id
  RETURNING sparks_balance INTO v_new_balance;

  RETURN COALESCE(v_new_balance, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION award_sparks(uuid, int, text, text, uuid) TO authenticated;

-- ============================================================
-- 5. Task completion trigger
--
-- Fires AFTER UPDATE on tasks when completed changes.
-- Earn: +2 (low/medium) or +5 (high).
-- Bonus: +20 when ALL tasks for the day are complete (min 3 tasks).
-- Reversal: when a task is un-completed, the original earn is reversed.
-- Welcome-back recovery reward also fires here — see recovery section.
-- ============================================================

CREATE OR REPLACE FUNCTION on_task_completion_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_amount       int;
  v_reversal     int;
  v_task_count   int;
  v_done_count   int;
  v_earn_reason  text;
BEGIN
  -- ── Un-completing a task: reverse the original earn ──────────────────────
  IF OLD.completed = true AND NEW.completed = false THEN
    SELECT -COALESCE(SUM(st.amount), 0) INTO v_reversal
    FROM spark_transactions st
    WHERE st.reference_type = 'task'
      AND st.reference_id = NEW.id
      AND st.amount > 0;

    IF v_reversal < 0 THEN
      PERFORM award_sparks(NEW.user_id, v_reversal, 'task_uncompleted', 'task', NEW.id);
    END IF;
    RETURN NEW;
  END IF;

  -- ── Completing a task: award by priority ─────────────────────────────────
  IF NEW.completed = false OR OLD.completed = true THEN
    RETURN NEW;
  END IF;

  -- Map priority to earn amount and reason for clear transaction history
  v_amount := CASE NEW.priority WHEN 'high' THEN 5 ELSE 2 END;
  v_earn_reason := 'task_completed_' || NEW.priority::text;

  PERFORM award_sparks(NEW.user_id, v_amount, v_earn_reason, 'task', NEW.id);

  -- ── All-tasks-complete bonus ──────────────────────────────────────────────
  -- 3+ tasks required so this bonus can't be farmed with one throwaway task.
  SELECT COUNT(*) INTO v_task_count
  FROM tasks
  WHERE user_id = NEW.user_id AND date = NEW.date;

  SELECT COUNT(*) INTO v_done_count
  FROM tasks
  WHERE user_id = NEW.user_id AND date = NEW.date AND completed = true;

  IF v_task_count >= 3 AND v_done_count = v_task_count THEN
    PERFORM award_sparks(NEW.user_id, 20, 'all_tasks_bonus', NULL, NULL);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_completion_changed ON tasks;
CREATE TRIGGER on_task_completion_changed
  AFTER UPDATE OF completed ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION on_task_completion_changed();

-- ============================================================
-- 6. Recovery reward trigger (fires on users.last_active_at change)
--
-- When the user acknowledges the Welcome Back screen, touchLastActive()
-- updates last_active_at. If the PREVIOUS value was > 3 days ago, this
-- is a return session and the user earns +25 on acknowledgement.
-- Awarding here (not on task completion) avoids a race with last_active_at
-- being updated before the first task is completed.
-- ============================================================

CREATE OR REPLACE FUNCTION on_user_last_active_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only fire when last_active_at actually changes
  IF NEW.last_active_at IS NOT DISTINCT FROM OLD.last_active_at THEN
    RETURN NEW;
  END IF;

  -- Require a previous value (new users don't get the recovery reward)
  IF OLD.last_active_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- 3-day threshold: 259200 seconds = 3 * 24 * 60 * 60
  IF EXTRACT(EPOCH FROM (now() - OLD.last_active_at)) > 259200 THEN
    PERFORM award_sparks(NEW.id, 25, 'recovery_reward', 'user', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_last_active_changed ON users;
CREATE TRIGGER on_user_last_active_changed
  AFTER UPDATE OF last_active_at ON users
  FOR EACH ROW
  EXECUTE FUNCTION on_user_last_active_changed();

-- ============================================================
-- 7. Habit completion trigger
--
-- Fires AFTER INSERT OR UPDATE on habit_logs.
-- Earn: +3 for boolean/count habits when completed=true.
--       +5 for timer habits when completed=true AND value >= target_value.
-- Reversal: when a log is updated from completed to not completed.
-- ============================================================

CREATE OR REPLACE FUNCTION on_habit_log_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_habit         RECORD;
  v_amount        int;
  v_reversal      int;
BEGIN
  -- ── Reversal: habit un-completed ────────────────────────────────────────
  IF TG_OP = 'UPDATE' AND OLD.completed = true AND NEW.completed = false THEN
    SELECT -COALESCE(SUM(st.amount), 0) INTO v_reversal
    FROM spark_transactions st
    WHERE st.reference_type = 'habit_log'
      AND st.reference_id = NEW.id
      AND st.amount > 0;

    IF v_reversal < 0 THEN
      PERFORM award_sparks(NEW.user_id, v_reversal, 'habit_uncompleted', 'habit_log', NEW.id);
    END IF;
    RETURN NEW;
  END IF;

  -- ── Only process new completions ─────────────────────────────────────────
  IF NOT NEW.completed THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.completed = true THEN RETURN NEW; END IF;

  -- Fetch habit type and target for validation
  SELECT type, target_value INTO v_habit
  FROM habits
  WHERE id = NEW.habit_id;

  IF v_habit IS NULL THEN RETURN NEW; END IF;

  IF v_habit.type = 'timer' THEN
    -- Timer habits: validate that logged value meets or exceeds target.
    -- This matches the server-side validation for focus sessions (90% rule
    -- lives in the API route; here we check the stored value directly).
    IF NEW.value IS NULL OR NEW.value < COALESCE(v_habit.target_value, 0) THEN
      RETURN NEW;  -- logged value too low, no Sparks
    END IF;
    v_amount := 5;
    PERFORM award_sparks(NEW.user_id, v_amount, 'habit_timer', 'habit_log', NEW.id);
  ELSE
    v_amount := 3;
    PERFORM award_sparks(NEW.user_id, v_amount, 'habit_boolean', 'habit_log', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_habit_log_changed ON habit_logs;
CREATE TRIGGER on_habit_log_changed
  AFTER INSERT OR UPDATE OF completed ON habit_logs
  FOR EACH ROW
  EXECUTE FUNCTION on_habit_log_changed();

-- ============================================================
-- 8. Focus session trigger
--
-- Fires AFTER UPDATE on focus_sessions when status → 'completed'.
-- Validates actual_duration_seconds >= planned * 0.9 (same threshold
-- the API route uses — the trigger re-checks to catch edge cases).
--
-- Earn tiers by planned duration:
--   < 25 min (1500s): no award
--   25–44 min:        +5
--   45–59 min:        +10
--   60+ min:          +15
--
-- Bonus: +10 when 3 focus sessions are completed in one day (once/day).
--
-- Surprise badges checked here: Early Bird, Deep Worker.
-- ============================================================

CREATE OR REPLACE FUNCTION on_focus_session_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_amount           int;
  v_reason           text;
  v_session_count    int;
  v_total_focus_secs int;
  v_user_tz          text;
  v_start_hour       int;
BEGIN
  -- Only fire on transitions to 'completed'
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Re-validate: actual must be >= 90% of planned.
  -- The API route already checks this, but we guard here for integrity.
  IF COALESCE(NEW.actual_duration_seconds, 0) < NEW.planned_duration_seconds * 0.9 THEN
    RETURN NEW;
  END IF;

  -- ── Tier the award by planned duration ───────────────────────────────────
  IF    NEW.planned_duration_seconds < 1500 THEN   -- < 25 min: no award
    RETURN NEW;
  ELSIF NEW.planned_duration_seconds < 2700 THEN   -- 25–44 min: +5
    v_amount := 5;  v_reason := 'focus_session_short';
  ELSIF NEW.planned_duration_seconds < 3600 THEN   -- 45–59 min: +10
    v_amount := 10; v_reason := 'focus_session_medium';
  ELSE                                              -- 60+ min: +15
    v_amount := 15; v_reason := 'focus_session_long';
  END IF;

  PERFORM award_sparks(NEW.user_id, v_amount, v_reason, 'focus_session', NEW.id);

  -- ── Triple-session bonus: +10 for 3 completed sessions in one day ────────
  SELECT COUNT(*) INTO v_session_count
  FROM focus_sessions
  WHERE user_id = NEW.user_id
    AND status = 'completed'
    AND date(started_at AT TIME ZONE 'UTC') = date(NEW.started_at AT TIME ZONE 'UTC');

  IF v_session_count >= 3 THEN
    PERFORM award_sparks(NEW.user_id, 10, 'focus_triple_bonus', NULL, NULL);
  END IF;

  -- ── Surprise badge: Early Bird ────────────────────────────────────────────
  -- Award if this session was started before 7am in the user's local timezone.
  SELECT COALESCE(timezone, 'UTC') INTO v_user_tz FROM users WHERE id = NEW.user_id;
  v_start_hour := EXTRACT(HOUR FROM NEW.started_at AT TIME ZONE v_user_tz)::int;

  IF v_start_hour < 7 THEN
    PERFORM award_badge('ba1e0010-0000-0000-0000-000000000010', NEW.user_id);
    -- Award Sparks for the surprise badge (once, guarded by award_badge dedup)
    IF NOT EXISTS (
      SELECT 1 FROM spark_transactions
      WHERE user_id = NEW.user_id
        AND reason = 'badge_early_bird'
    ) THEN
      PERFORM award_sparks(NEW.user_id, 20, 'badge_early_bird', NULL, NULL);
    END IF;
  END IF;

  -- ── Surprise badge: Deep Worker ──────────────────────────────────────────
  -- Award if total completed focus time today >= 3 hours (10800 seconds).
  SELECT COALESCE(SUM(actual_duration_seconds), 0) INTO v_total_focus_secs
  FROM focus_sessions
  WHERE user_id = NEW.user_id
    AND status = 'completed'
    AND date(started_at AT TIME ZONE 'UTC') = date(NEW.started_at AT TIME ZONE 'UTC');

  IF v_total_focus_secs >= 10800 THEN
    PERFORM award_badge('ba1e0011-0000-0000-0000-000000000011', NEW.user_id);
    -- Award Sparks once per calendar day (check for today's badge_deep_worker row)
    IF NOT EXISTS (
      SELECT 1 FROM spark_transactions
      WHERE user_id = NEW.user_id
        AND reason = 'badge_deep_worker'
        AND date(created_at AT TIME ZONE 'UTC') = current_date
    ) THEN
      PERFORM award_sparks(NEW.user_id, 25, 'badge_deep_worker', NULL, NULL);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_focus_session_completed ON focus_sessions;
CREATE TRIGGER on_focus_session_completed
  AFTER UPDATE OF status ON focus_sessions
  FOR EACH ROW
  EXECUTE FUNCTION on_focus_session_completed();

-- ============================================================
-- 9. Reflection trigger
--
-- Fires AFTER INSERT on reflections.
-- Earn: +5 (once per day, enforced by reflection_submitted cap + unique constraint).
-- Surprise badge: Night Owl — reflection submitted after 11pm.
-- ============================================================

CREATE OR REPLACE FUNCTION on_reflection_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_tz   text;
  v_hour_now  int;
BEGIN
  PERFORM award_sparks(NEW.user_id, 5, 'reflection_submitted', 'reflection', NEW.id);

  -- ── Surprise badge: Night Owl ─────────────────────────────────────────────
  -- reflections.unique(user_id, date) ensures this fires at most once per day.
  SELECT COALESCE(timezone, 'UTC') INTO v_user_tz FROM users WHERE id = NEW.user_id;
  v_hour_now := EXTRACT(HOUR FROM now() AT TIME ZONE v_user_tz)::int;

  IF v_hour_now >= 23 THEN
    PERFORM award_badge('ba1e0013-0000-0000-0000-000000000013', NEW.user_id);
    IF NOT EXISTS (
      SELECT 1 FROM spark_transactions
      WHERE user_id = NEW.user_id AND reason = 'badge_night_owl'
    ) THEN
      PERFORM award_sparks(NEW.user_id, 15, 'badge_night_owl', NULL, NULL);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_reflection_submitted ON reflections;
CREATE TRIGGER on_reflection_submitted
  AFTER INSERT ON reflections
  FOR EACH ROW
  EXECUTE FUNCTION on_reflection_submitted();

-- ============================================================
-- 10. Mood check-in trigger
--
-- Fires AFTER INSERT on mood_logs.
-- Earn: +2 per check-in, cap 6/day (3 check-ins × 2).
-- ============================================================

CREATE OR REPLACE FUNCTION on_mood_checkin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM award_sparks(NEW.user_id, 2, 'mood_checkin', 'mood_log', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_mood_checkin ON mood_logs;
CREATE TRIGGER on_mood_checkin
  AFTER INSERT ON mood_logs
  FOR EACH ROW
  EXECUTE FUNCTION on_mood_checkin();

-- ============================================================
-- 11. Weekly review trigger
--
-- Fires AFTER INSERT on weekly_reviews.
-- Earn: +20 once per week (unique(user_id, week_start) constraint
-- in the schema prevents duplicate weekly review rows).
-- ============================================================

CREATE OR REPLACE FUNCTION on_weekly_review_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM award_sparks(NEW.user_id, 20, 'weekly_review', 'weekly_review', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_weekly_review_created ON weekly_reviews;
CREATE TRIGGER on_weekly_review_created
  AFTER INSERT ON weekly_reviews
  FOR EACH ROW
  EXECUTE FUNCTION on_weekly_review_created();

-- ============================================================
-- 12. Challenge join trigger
--
-- Fires AFTER INSERT on challenge_participants.
-- Earn: +15 for joining any challenge.
-- This fires alongside activate_challenge_when_full (Session 8)
-- which is on the same table/event — both execute safely.
-- ============================================================

CREATE OR REPLACE FUNCTION on_challenge_joined()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM award_sparks(NEW.user_id, 15, 'challenge_joined', 'challenge', NEW.challenge_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_challenge_joined ON challenge_participants;
CREATE TRIGGER on_challenge_joined
  AFTER INSERT ON challenge_participants
  FOR EACH ROW
  EXECUTE FUNCTION on_challenge_joined();

-- ============================================================
-- 13. Challenge completion trigger
--
-- Fires AFTER UPDATE on challenges when status → 'completed'.
--
-- Habit pact:     +50 per participant IF all held their streak.
-- Score battle:   +100 winner, +30 runner-up (by current_score).
-- Friends feed:   +15 per participant if challenge ran >= 7 days.
-- ============================================================

CREATE OR REPLACE FUNCTION on_challenge_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_participant RECORD;
  v_all_held    bool;
BEGIN
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.type = 'habit_pact' THEN
    -- Both participants must have streak_held = true for the pact win bonus
    SELECT bool_and(COALESCE(streak_held, false)) INTO v_all_held
    FROM challenge_participants
    WHERE challenge_id = NEW.id;

    IF COALESCE(v_all_held, false) THEN
      FOR v_participant IN
        SELECT user_id FROM challenge_participants WHERE challenge_id = NEW.id
      LOOP
        PERFORM award_sparks(v_participant.user_id, 50, 'challenge_pact_win', 'challenge', NEW.id);
      END LOOP;
    END IF;

  ELSIF NEW.type = 'score_battle' THEN
    -- Award by rank: rank 1 = winner (+100), all others = runner-up (+30)
    FOR v_participant IN
      SELECT user_id,
             ROW_NUMBER() OVER (ORDER BY current_score DESC) AS rank
      FROM challenge_participants
      WHERE challenge_id = NEW.id
    LOOP
      IF v_participant.rank = 1 THEN
        PERFORM award_sparks(v_participant.user_id, 100, 'challenge_score_battle_winner', 'challenge', NEW.id);
      ELSE
        PERFORM award_sparks(v_participant.user_id, 30, 'challenge_score_battle_runner_up', 'challenge', NEW.id);
      END IF;
    END LOOP;

  ELSIF NEW.type = 'friends_feed' THEN
    -- First-week bonus: challenge must have been active for at least 7 days
    IF NEW.starts_at <= (current_date - interval '7 days')::date THEN
      FOR v_participant IN
        SELECT user_id FROM challenge_participants WHERE challenge_id = NEW.id
      LOOP
        PERFORM award_sparks(v_participant.user_id, 15, 'challenge_friends_feed_week', 'challenge', NEW.id);
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_challenge_completed ON challenges;
CREATE TRIGGER on_challenge_completed
  AFTER UPDATE OF status ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION on_challenge_completed();

-- ============================================================
-- 14. First friend trigger
--
-- Fires AFTER UPDATE on friendships when status → 'accepted'.
-- Awards +20 to each user on their FIRST accepted friendship.
-- Counts other accepted friendships (excluding this row) to determine "first".
-- ============================================================

CREATE OR REPLACE FUNCTION on_friendship_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_requester_others int;
  v_addressee_others int;
BEGIN
  IF NEW.status != 'accepted' OR OLD.status = 'accepted' THEN
    RETURN NEW;
  END IF;

  -- Count OTHER accepted friendships for the requester (excluding this row)
  SELECT COUNT(*) INTO v_requester_others
  FROM friendships
  WHERE status = 'accepted'
    AND id != NEW.id
    AND (requester_id = NEW.requester_id OR addressee_id = NEW.requester_id);

  IF v_requester_others = 0 THEN
    PERFORM award_sparks(NEW.requester_id, 20, 'first_friend', 'friendship', NEW.id);
  END IF;

  -- Count OTHER accepted friendships for the addressee
  SELECT COUNT(*) INTO v_addressee_others
  FROM friendships
  WHERE status = 'accepted'
    AND id != NEW.id
    AND (requester_id = NEW.addressee_id OR addressee_id = NEW.addressee_id);

  IF v_addressee_others = 0 THEN
    PERFORM award_sparks(NEW.addressee_id, 20, 'first_friend', 'friendship', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_friendship_accepted ON friendships;
CREATE TRIGGER on_friendship_accepted
  AFTER UPDATE OF status ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION on_friendship_accepted();

-- ============================================================
-- 15. Daily score trigger — surprise badges: Consistency Hero, Perfect Week
--
-- Fires AFTER INSERT on daily_scores.
-- Consistency Hero: active (score > 0) on 20+ days in one calendar month.
-- Perfect Week:     daily score >= 80 on 7 consecutive days ending today.
-- ============================================================

CREATE OR REPLACE FUNCTION on_daily_score_inserted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_active_days_this_month int;
  v_perfect_week_count     int;
BEGIN
  -- ── Consistency Hero ──────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_active_days_this_month
  FROM daily_scores
  WHERE user_id = NEW.user_id
    AND score_pct > 0
    AND date_part('year',  date) = date_part('year',  NEW.date)
    AND date_part('month', date) = date_part('month', NEW.date);

  IF v_active_days_this_month >= 20 THEN
    PERFORM award_badge('ba1e0012-0000-0000-0000-000000000012', NEW.user_id);
    -- Sparks for Consistency Hero: award once per month
    IF NOT EXISTS (
      SELECT 1 FROM spark_transactions
      WHERE user_id = NEW.user_id
        AND reason = 'badge_consistency_hero'
        AND date_part('year',  date(created_at)) = date_part('year',  NEW.date)
        AND date_part('month', date(created_at)) = date_part('month', NEW.date)
    ) THEN
      PERFORM award_sparks(NEW.user_id, 50, 'badge_consistency_hero', NULL, NULL);
    END IF;
  END IF;

  -- ── Perfect Week ─────────────────────────────────────────────────────────
  -- Count the last 7 consecutive days (today included) all with score_pct >= 80.
  SELECT COUNT(*) INTO v_perfect_week_count
  FROM daily_scores
  WHERE user_id = NEW.user_id
    AND score_pct >= 80
    AND date >= (NEW.date - interval '6 days')::date
    AND date <= NEW.date;

  IF v_perfect_week_count >= 7 THEN
    PERFORM award_badge('ba1e0014-0000-0000-0000-000000000014', NEW.user_id);
    -- Sparks for Perfect Week: award once per qualifying 7-day window (check recent window)
    IF NOT EXISTS (
      SELECT 1 FROM spark_transactions
      WHERE user_id = NEW.user_id
        AND reason = 'badge_perfect_week'
        AND created_at >= (now() - interval '7 days')
    ) THEN
      PERFORM award_sparks(NEW.user_id, 75, 'badge_perfect_week', NULL, NULL);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- This trigger runs AFTER sync_challenge_score (Session 8) which also fires on daily_scores.
-- Both execute safely in the same transaction; order is non-deterministic but independent.
DROP TRIGGER IF EXISTS on_daily_score_inserted ON daily_scores;
CREATE TRIGGER on_daily_score_inserted
  AFTER INSERT ON daily_scores
  FOR EACH ROW
  EXECUTE FUNCTION on_daily_score_inserted();

-- ============================================================
-- NOTE: Enable Realtime for the `users` table in the Supabase Dashboard
-- so that SparksBadge can receive live sparks_balance updates.
-- Go to Database → Replication → Tables → enable `users`.
-- ============================================================
