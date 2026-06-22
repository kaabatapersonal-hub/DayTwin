-- ============================================================
-- DayTwin — Friends System
-- Run AFTER 20260622000003_focus_session_active_status.sql
-- ============================================================

-- ============================================================
-- invite_tokens: short-lived tokens for invite-link friend-adding.
-- The owner generates a token; anyone who visits the link and is
-- authenticated can claim it, which creates an accepted friendship
-- directly (skipping the pending state — the invite was intentional).
-- claimed_by is set to prevent double-claiming the same token.
-- ============================================================

CREATE TABLE IF NOT EXISTS invite_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '7 days',
  claimed_at  timestamptz,
  claimed_by  uuid REFERENCES users ON DELETE SET NULL
);

ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- Owner can create and view their own tokens
CREATE POLICY "invite_tokens_owner"
  ON invite_tokens FOR ALL
  USING (user_id = auth.uid());

-- Any authenticated user can read a token by id in order to claim it
CREATE POLICY "invite_tokens_read_for_claim"
  ON invite_tokens FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- handle_new_user trigger
-- Creates a public users profile row automatically whenever a new
-- auth.users entry is inserted — covers signInAnonymously() and
-- real account creation (email or OAuth). Without this trigger,
-- the users table would have no INSERT policy and the profile row
-- would never exist, breaking username search and friend visibility.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, is_anonymous)
  VALUES (
    NEW.id,
    -- An anonymous user has no email on the auth row at creation time
    CASE WHEN NEW.email IS NULL THEN true ELSE false END
  )
  ON CONFLICT (id) DO NOTHING;  -- safe if migration is applied while users already exist
  RETURN NEW;
END;
$$;

-- Drop and recreate to ensure the trigger is registered (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- Security-definer RPC functions for friend-visible data.
-- These run as the function owner (not the caller), which lets us
-- expose exactly the right columns without widening RLS policies.
--
-- Why security-definer here instead of column-level grants?
-- Column grants on tables affect all queries; security-definer functions
-- let us gate on the friendship check AND restrict columns in one step,
-- keeping the main table policies simple.
-- ============================================================

-- Returns the last 7 days of score_pct for a friend.
-- Returns an empty set if the caller is not an accepted friend of friend_user_id.
-- The breakdown JSONB column is deliberately excluded — friends see the number, not the detail.
CREATE OR REPLACE FUNCTION public.get_friend_scores(friend_user_id uuid)
RETURNS TABLE(score_date date, score_pct int)
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT ds.date, ds.score_pct
  FROM daily_scores ds
  WHERE ds.user_id = friend_user_id
    AND ds.date >= (current_date - interval '6 days')::date
    AND public.is_accepted_friend(friend_user_id)
  ORDER BY ds.date DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_friend_scores(uuid) TO authenticated;

-- Returns the average consistency_30d_pct across all habits for a friend.
-- Individual habit names are never exposed — only the aggregate figure.
-- Returns 0 if the caller is not an accepted friend, or if the friend has no habits.
CREATE OR REPLACE FUNCTION public.get_friend_consistency(friend_user_id uuid)
RETURNS int
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT COALESCE(ROUND(AVG(hs.consistency_30d_pct))::int, 0)
  FROM habit_streaks hs
  JOIN habits h ON h.id = hs.habit_id
  WHERE h.user_id = friend_user_id
    AND public.is_accepted_friend(friend_user_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_friend_consistency(uuid) TO authenticated;
