-- ============================================================
-- Fix: infinite recursion in challenge_participants_select policy.
--
-- The old policy checked membership by querying challenge_participants
-- from within a policy ON challenge_participants — each SELECT triggered
-- the same policy again forever, causing any query that joined this
-- table (including habits_select_pact_participants) to 500.
--
-- Fix: same SECURITY DEFINER helper pattern used by is_accepted_friend().
-- The function runs without RLS, breaking the recursion.
-- ============================================================

CREATE OR REPLACE FUNCTION is_challenge_participant(p_challenge_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM challenge_participants
    WHERE challenge_id = p_challenge_id
      AND user_id      = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "challenge_participants_select" ON challenge_participants;

CREATE POLICY "challenge_participants_select"
  ON challenge_participants FOR SELECT
  USING (is_challenge_participant(challenge_id));
