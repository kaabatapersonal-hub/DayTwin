-- ============================================================
-- DayTwin — Account Deletion
--
-- Creates delete_user_account() — SECURITY DEFINER so it can
-- write past RLS. Called by /api/users/delete, which also calls
-- auth.admin.deleteUser() via the service-role client afterward.
-- That auth deletion cascades to public.users → everything else.
--
-- This function runs first to anonymize challenge_participants rows
-- (the one category that shouldn't hard-cascade — see comment below)
-- and to assert the caller is the account owner.
-- ============================================================

CREATE OR REPLACE FUNCTION delete_user_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only the authenticated user may delete their own account.
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- ── Anonymize challenge_participants before the cascade ─────────────────────
  -- challenge_participants.user_id has ON DELETE CASCADE from users, which would
  -- remove the row entirely and leave the other participant's challenge in an
  -- ambiguous state. We nullify the user reference first by temporarily relaxing
  -- the constraint is not possible without ALTER, so instead we mark them as a
  -- system tombstone by pointing user_id to the system placeholder if one exists,
  -- or we simply leave the deletion to cascade and accept the V1 tradeoff.
  --
  -- V1 decision: accept cascade deletion of challenge_participants.
  -- The challenge itself (and its result) remains; only the participant row is gone.
  -- "Former participant" display requires a nullable FK or tombstone user, tracked
  -- for a future migration.

  -- ── Hard-delete private tables ──────────────────────────────────────────────
  -- Most of these would cascade from the users row anyway, but deleting them
  -- explicitly here ensures they're gone before the auth deletion fires.

  DELETE FROM reflections        WHERE user_id = p_user_id;
  DELETE FROM mood_logs          WHERE user_id = p_user_id;
  DELETE FROM intentions         WHERE user_id = p_user_id;
  DELETE FROM time_entries       WHERE user_id = p_user_id;
  DELETE FROM focus_sessions     WHERE user_id = p_user_id;
  DELETE FROM tasks              WHERE user_id = p_user_id;
  DELETE FROM habit_logs         WHERE user_id = p_user_id;
  -- habit_streaks cascade via habits FK
  DELETE FROM habits             WHERE user_id = p_user_id;
  DELETE FROM projects           WHERE user_id = p_user_id;
  DELETE FROM goals              WHERE user_id = p_user_id;
  DELETE FROM daily_scores       WHERE user_id = p_user_id;
  DELETE FROM weekly_reviews     WHERE user_id = p_user_id;
  DELETE FROM spark_transactions WHERE user_id = p_user_id;
  DELETE FROM day_templates      WHERE user_id = p_user_id;

  -- Private economy rows
  DELETE FROM user_unlocked_themes WHERE user_id = p_user_id;
  DELETE FROM user_unlocked_items  WHERE user_id = p_user_id;
  DELETE FROM user_unlocked_packs  WHERE user_id = p_user_id;
  DELETE FROM user_unlocked_sounds WHERE user_id = p_user_id;
  DELETE FROM user_badges          WHERE user_id = p_user_id;
  DELETE FROM user_settings        WHERE user_id = p_user_id;

  -- Friendships — delete in both directions
  DELETE FROM friendships
  WHERE requester_id = p_user_id OR addressee_id = p_user_id;

  -- Nullify owned challenges so they degrade instead of vanishing via cascade.
  -- The challenge row stays so participants can see the historical result.
  UPDATE challenges SET created_by = NULL WHERE created_by = p_user_id;

  -- public.users row — deleted by auth cascade after this function returns;
  -- the API route calls auth.admin.deleteUser() which fires the cascade.
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_account(uuid) TO authenticated;

-- Allow challenges.created_by to be null (user deleted their account)
ALTER TABLE challenges
  ALTER COLUMN created_by DROP NOT NULL;
