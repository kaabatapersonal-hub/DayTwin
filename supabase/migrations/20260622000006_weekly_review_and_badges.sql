-- ============================================================
-- DayTwin — Session 9: Weekly Review & Milestone Badges
-- ============================================================

-- ============================================================
-- 1. Seed the three milestone badges with fixed UUIDs
--    so trigger functions can reference them without a lookup.
-- ============================================================

INSERT INTO badges (id, name, description, icon, rarity, criteria) VALUES
  ('ba1e0001-0000-0000-0000-000000000001',
   'One Week',
   'Kept a habit going for 7 days straight.',
   '🔥',
   'common',
   'habit_streaks.current_streak reaches 7'),
  ('ba1e0002-0000-0000-0000-000000000002',
   'One Month',
   'Held a habit streak for 30 consecutive days.',
   '⚡',
   'rare',
   'habit_streaks.current_streak reaches 30'),
  ('ba1e0003-0000-0000-0000-000000000003',
   'First Win',
   'Marked your first goal as complete.',
   '🏆',
   'legendary',
   'goals.status flips to completed for the first time')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Idempotent badge award helper
--    Used by both milestone trigger functions below.
--    SECURITY DEFINER so triggers can write to user_badges
--    without a client-level INSERT policy.
-- ============================================================

CREATE OR REPLACE FUNCTION award_badge(p_badge_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO user_badges (user_id, badge_id, earned_at)
  VALUES (p_user_id, p_badge_id, now())
  ON CONFLICT (user_id, badge_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION award_badge(uuid, uuid) TO authenticated;

-- ============================================================
-- 3. Streak milestone trigger
--    Awards "One Week" when current_streak first crosses 7,
--    "One Month" when it first crosses 30.
--    Uses AFTER UPDATE so OLD and NEW are both available.
--    Crossing is checked as a threshold transition (OLD < N, NEW >= N)
--    so repeatedly logging the 7th+ day doesn't re-award.
-- ============================================================

CREATE OR REPLACE FUNCTION check_streak_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Resolve the owning user via the habits table
  SELECT user_id INTO v_user_id FROM habits WHERE id = NEW.habit_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  -- "One Week" badge: streak transitions to >= 7
  IF NEW.current_streak >= 7 AND COALESCE(OLD.current_streak, 0) < 7 THEN
    PERFORM award_badge('ba1e0001-0000-0000-0000-000000000001', v_user_id);
  END IF;

  -- "One Month" badge: streak transitions to >= 30
  IF NEW.current_streak >= 30 AND COALESCE(OLD.current_streak, 0) < 30 THEN
    PERFORM award_badge('ba1e0002-0000-0000-0000-000000000002', v_user_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER streak_milestone_trigger
  AFTER UPDATE ON habit_streaks
  FOR EACH ROW
  EXECUTE FUNCTION check_streak_milestone();

-- ============================================================
-- 4. First completed goal trigger
--    Awards "First Win" when a goal's status flips to 'completed'
--    for the first time (no other completed goals for this user).
--    The EXISTS check excludes the current row (already updated)
--    so the count is "other" completed goals, not including this one.
-- ============================================================

CREATE OR REPLACE FUNCTION check_first_goal_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only act when the status transitions to 'completed'
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    -- Award only if this is the first completed goal (no others exist)
    IF NOT EXISTS (
      SELECT 1 FROM goals
      WHERE user_id = NEW.user_id
        AND status = 'completed'
        AND id <> NEW.id   -- exclude the row we just updated
    ) THEN
      PERFORM award_badge('ba1e0003-0000-0000-0000-000000000003', NEW.user_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER first_goal_milestone_trigger
  AFTER UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION check_first_goal_milestone();

-- ============================================================
-- 5. Index for weekly_reviews lookups
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user_week
  ON weekly_reviews(user_id, week_start DESC);
