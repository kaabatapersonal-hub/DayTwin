-- ============================================================
-- DayTwin — Row Level Security Policies
-- Run AFTER 20260620000000_initial.sql
--
-- Classification (from privacy-and-friend-safety.md):
--   Private        → user_id = auth.uid() only, no exceptions
--   Friend-visible → accepted friends see aggregate numbers only
--   Challenge-shared → only participants of that specific challenge
--   Public         → username, display_name, avatar_url for friend search
-- ============================================================

-- Helper: is the authenticated user an accepted friend of p_user_id?
CREATE OR REPLACE FUNCTION public.is_accepted_friend(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
      AND (
        (requester_id = auth.uid() AND addressee_id = p_user_id) OR
        (addressee_id = auth.uid() AND requester_id = p_user_id)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_accepted_friend(uuid) TO authenticated;

-- ============================================================
-- Section 1: Identity & account
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Owner: full access to own row
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- No INSERT policy — the handle_new_user trigger (SECURITY DEFINER) owns inserts.
-- No DELETE policy — account deletion goes through a server-side function.

-- Accepted friends can see the public profile fields.
-- Column restriction (display_name, avatar_url only) is enforced in the query layer.
CREATE POLICY "users_select_friends"
  ON users FOR SELECT
  USING (public.is_accepted_friend(id));

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_all_own"
  ON user_settings FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- Section 2: Daily planning (PRIVATE)
-- ============================================================

ALTER TABLE day_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "day_templates_all_own"
  ON day_templates FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals_all_own"
  ON goals FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_all_own"
  ON projects FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_all_own"
  ON tasks FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "time_entries_all_own"
  ON time_entries FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "focus_sessions_all_own"
  ON focus_sessions FOR ALL
  USING (user_id = auth.uid());

-- daily_scores: private for write; friends can read score_pct row.
-- Column restriction (score_pct only, not breakdown) is enforced in the query layer.
ALTER TABLE daily_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_scores_all_own"
  ON daily_scores FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "daily_scores_select_friends"
  ON daily_scores FOR SELECT
  USING (public.is_accepted_friend(user_id));

-- ============================================================
-- Section 3: Habits (PRIVATE)
-- ============================================================

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "habits_all_own"
  ON habits FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "habit_logs_all_own"
  ON habit_logs FOR ALL
  USING (user_id = auth.uid());

-- habit_streaks: owner access via habits join; friends see consistency figure.
ALTER TABLE habit_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habit_streaks_all_own"
  ON habit_streaks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM habits
      WHERE habits.id = habit_streaks.habit_id
        AND habits.user_id = auth.uid()
    )
  );

CREATE POLICY "habit_streaks_select_friends"
  ON habit_streaks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM habits
      WHERE habits.id = habit_streaks.habit_id
        AND public.is_accepted_friend(habits.user_id)
    )
  );

-- ============================================================
-- Section 4: Goals & reflection (PRIVATE)
-- ============================================================

ALTER TABLE intentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intentions_all_own"
  ON intentions FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reflections_all_own"
  ON reflections FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mood_logs_all_own"
  ON mood_logs FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weekly_reviews_all_own"
  ON weekly_reviews FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- Section 5: Friends & challenges
-- ============================================================

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Requester or addressee can see/manage the friendship row.
CREATE POLICY "friendships_select_parties"
  ON friendships FOR SELECT
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "friendships_insert_requester"
  ON friendships FOR INSERT
  WITH CHECK (requester_id = auth.uid());

-- Addressee accepts/declines; requester can cancel a pending request.
CREATE POLICY "friendships_update_parties"
  ON friendships FOR UPDATE
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "friendships_delete_parties"
  ON friendships FOR DELETE
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenges_all_creator"
  ON challenges FOR ALL
  USING (created_by = auth.uid());

-- Participants can read the challenge they're in.
CREATE POLICY "challenges_select_participants"
  ON challenges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM challenge_participants cp
      WHERE cp.challenge_id = challenges.id
        AND cp.user_id = auth.uid()
    )
  );

-- challenge_participants: CHALLENGE-SHARED
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

-- All participants in a challenge can see each other's rows.
CREATE POLICY "challenge_participants_select"
  ON challenge_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM challenge_participants my_cp
      WHERE my_cp.challenge_id = challenge_participants.challenge_id
        AND my_cp.user_id = auth.uid()
    )
  );

CREATE POLICY "challenge_participants_insert_self"
  ON challenge_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "challenge_participants_update_self"
  ON challenge_participants FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "challenge_participants_delete_self"
  ON challenge_participants FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- Section 6: Sparks economy
-- ============================================================

-- spark_transactions: SELECT for owner only; NO INSERT/UPDATE/DELETE policies.
-- The absence of write policies means all client writes are denied.
-- Server-side Edge Functions / Postgres triggers write via SECURITY DEFINER.
ALTER TABLE spark_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spark_transactions_select_own"
  ON spark_transactions FOR SELECT
  USING (user_id = auth.uid());

ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
-- Themes are a catalogue — any authenticated user can read them.
CREATE POLICY "themes_select_all"
  ON themes FOR SELECT
  USING (auth.uid() IS NOT NULL);

ALTER TABLE profile_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profile_items_select_all"
  ON profile_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

ALTER TABLE motivation_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "motivation_packs_select_all"
  ON motivation_packs FOR SELECT
  USING (auth.uid() IS NOT NULL);

ALTER TABLE sound_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sound_packs_select_all"
  ON sound_packs FOR SELECT
  USING (auth.uid() IS NOT NULL);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_select_all"
  ON badges FOR SELECT
  USING (auth.uid() IS NOT NULL);

ALTER TABLE user_unlocked_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_unlocked_themes_all_own"
  ON user_unlocked_themes FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE user_unlocked_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_unlocked_items_all_own"
  ON user_unlocked_items FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE user_unlocked_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_unlocked_packs_all_own"
  ON user_unlocked_packs FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE user_unlocked_sounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_unlocked_sounds_all_own"
  ON user_unlocked_sounds FOR ALL
  USING (user_id = auth.uid());

-- user_badges: FRIEND-VISIBLE (achievements are meant to be shown off)
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_badges_all_own"
  ON user_badges FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "user_badges_select_friends"
  ON user_badges FOR SELECT
  USING (public.is_accepted_friend(user_id));
