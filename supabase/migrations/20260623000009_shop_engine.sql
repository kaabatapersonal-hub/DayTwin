-- ============================================================
-- DayTwin — Session 12: Sparks Shop Engine
--
-- Creates all shop tables, deduct_sparks(), gift_sparks(),
-- and wires challenge pool deductions + payouts.
--
-- Must run AFTER 20260623000008_sparks_engine.sql.
-- ============================================================

-- ============================================================
-- 1. Themes
-- ============================================================

CREATE TABLE IF NOT EXISTS themes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  accent_hex     text NOT NULL,
  background_hex text NOT NULL,
  cost_sparks    int  NOT NULL DEFAULT 0,
  category       text          -- dark, nature, minimal, etc.
);

-- RLS for themes was set in 20260620000001_rls.sql; no duplicate policy here.

INSERT INTO themes (id, name, accent_hex, background_hex, cost_sparks, category) VALUES
  ('00000001-0000-0000-0000-000000000001', 'DayTwin',         '#2DD4BF', '#080808', 0,   NULL),
  ('00000001-0000-0000-0000-000000000002', 'Midnight Purple',  '#A855F7', '#0D0010', 150, 'dark'),
  ('00000001-0000-0000-0000-000000000003', 'Solar Gold',       '#F59E0B', '#0A0800', 150, 'dark'),
  ('00000001-0000-0000-0000-000000000004', 'Ocean Deep',       '#0EA5E9', '#00080F', 150, 'dark'),
  ('00000001-0000-0000-0000-000000000005', 'Forest',           '#22C55E', '#030A03', 200, 'nature'),
  ('00000001-0000-0000-0000-000000000006', 'Sakura',           '#F472B6', '#0A0008', 200, 'nature'),
  ('00000001-0000-0000-0000-000000000007', 'Monochrome',       '#E5E5E5', '#0A0A0A', 100, 'minimal'),
  ('00000001-0000-0000-0000-000000000008', 'Ember',            '#EF4444', '#0A0300', 200, 'dark')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_unlocked_themes (
  user_id      uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  theme_id     uuid NOT NULL REFERENCES themes ON DELETE CASCADE,
  unlocked_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, theme_id)
);

ALTER TABLE user_unlocked_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_unlocked_themes_own"
  ON user_unlocked_themes FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- 2. Profile items
--    asset_url stores a CSS descriptor string the client interprets
--    (for frames/borders: Tailwind ring classes;
--     for avatars: a shape identifier like "hexagon";
--     for icon sets: a colour token like "gold")
-- ============================================================

CREATE TABLE IF NOT EXISTS profile_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type         text NOT NULL CHECK (type IN ('frame', 'avatar', 'border', 'icon')),
  name         text NOT NULL,
  asset_url    text NOT NULL,
  cost_sparks  int  NOT NULL DEFAULT 0
);

-- RLS for profile_items was set in 20260620000001_rls.sql; no duplicate policy here.

INSERT INTO profile_items (id, type, name, asset_url, cost_sparks) VALUES
  -- Frames (ring effects applied around the avatar container)
  ('00000002-0000-0000-0000-000000000001', 'frame', 'Teal Glow',    'ring-2 ring-teal/60 ring-offset-2 ring-offset-background', 0),
  ('00000002-0000-0000-0000-000000000002', 'frame', 'Gold Dust',    'ring-2 ring-gold/70 ring-offset-2 ring-offset-background', 120),
  ('00000002-0000-0000-0000-000000000003', 'frame', 'Double Ring',  'ring-4 ring-teal/30 outline outline-2 outline-teal/60 outline-offset-4', 180),
  ('00000002-0000-0000-0000-000000000004', 'frame', 'Neon Edge',    'ring-2 ring-[#A855F7]/80 ring-offset-2 ring-offset-background shadow-[0_0_10px_#A855F7]', 250),
  -- Avatar styles (geometric SVG shape identifiers)
  ('00000002-0000-0000-0000-000000000005', 'avatar', 'Circle',    'circle',   0),
  ('00000002-0000-0000-0000-000000000006', 'avatar', 'Hexagon',   'hexagon',  100),
  ('00000002-0000-0000-0000-000000000007', 'avatar', 'Diamond',   'diamond',  100),
  ('00000002-0000-0000-0000-000000000008', 'avatar', 'Shield',    'shield',   150),
  -- Badge borders (ring around the level badge)
  ('00000002-0000-0000-0000-000000000009', 'border', 'Subtle',    'ring-1 ring-white/20', 0),
  ('00000002-0000-0000-0000-000000000010', 'border', 'Gold Ring',  'ring-2 ring-gold/60', 100),
  ('00000002-0000-0000-0000-000000000011', 'border', 'Glow Ring',  'ring-2 ring-teal/60 shadow-[0_0_8px_#2DD4BF]', 200),
  -- Icon colour sets for the bottom nav (colour token identifier)
  ('00000002-0000-0000-0000-000000000012', 'icon', 'Teal (default)', 'teal',   0),
  ('00000002-0000-0000-0000-000000000013', 'icon', 'Gold',           'gold',   80),
  ('00000002-0000-0000-0000-000000000014', 'icon', 'Soft White',     'white',  80)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_unlocked_items (
  user_id      uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  item_id      uuid NOT NULL REFERENCES profile_items ON DELETE CASCADE,
  unlocked_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

ALTER TABLE user_unlocked_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_unlocked_items_own"
  ON user_unlocked_items FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- 3. Motivation packs — curated static content, no AI in V1
-- ============================================================

CREATE TABLE IF NOT EXISTS motivation_packs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  content      jsonb NOT NULL DEFAULT '[]',  -- array of {title, body} cards
  cost_sparks  int  NOT NULL DEFAULT 0
);

-- RLS for motivation_packs was set in 20260620000001_rls.sql; no duplicate policy here.

INSERT INTO motivation_packs (id, name, cost_sparks, content) VALUES
  ('00000003-0000-0000-0000-000000000001',
   'Founder Mindset',
   200,
   '[
     {"title": "Ship ugly.", "body": "Improve after. The thing that is live beats the thing that is perfect in your head every single time."},
     {"title": "The idea is 1%.", "body": "The execution is 99%. Everyone has the same ideas. The people who win are the ones still building at 11pm on a Tuesday."},
     {"title": "Your competitor is shipping.", "body": "Right now, while you are thinking about it, someone else is doing it. Move."},
     {"title": "One user who loves it.", "body": "That is worth more than a hundred who tolerate it. Build for the person who cannot imagine using anything else."},
     {"title": "The pivot is not failure.", "body": "It is data. Every direction you rule out narrows the gap between you and the thing that actually works."},
     {"title": "Write the code. Send the email.", "body": "Do the smallest version of the thing right now. The energy you spend planning what to do with the success is borrowed energy."},
     {"title": "Momentum is a skill.", "body": "It is built by finishing things, not starting them. Ship something today. Anything."},
     {"title": "Nobody cares about your roadmap.", "body": "They care about what you built last week. Keep the roadmap short. Make the output loud."},
     {"title": "You are not behind.", "body": "You are building on a different timeline than you think. The only race worth winning is the one where you are still in it at year five."},
     {"title": "The hard part is the product.", "body": "Not the name, not the logo, not the landing page. Build the thing. The rest follows or it does not matter anyway."}
   ]'
  ),
  ('00000003-0000-0000-0000-000000000002',
   'Consistency Pack',
   150,
   '[
     {"title": "You do not need to feel ready.", "body": "You just need to start. Readiness is a feeling that comes after you begin, not before."},
     {"title": "One percent better every day.", "body": "It compounds. A year of tiny improvements does not feel like anything day to day, until one day it feels like everything."},
     {"title": "Showing up is the work.", "body": "Not perfectly, not brilliantly, not with full energy. Showing up is the non-negotiable minimum, and it is enough."},
     {"title": "The streak is a side effect.", "body": "Not the goal. Do the habit because the habit is worth doing. The streak is just proof you did."},
     {"title": "Hard days count double.", "body": "Doing the work when everything in you says not to is the day that actually builds the person. Easy days are maintenance. Hard days are construction."},
     {"title": "Your future self cannot thank you yet.", "body": "But they will. Every rep you put in today is a gift to someone who will appreciate it more than you can imagine right now."},
     {"title": "Start before you are motivated.", "body": "Motivation follows action, not the other way around. Five minutes in, it is already easier than it was."},
     {"title": "The system beats the goal.", "body": "You will forget the goal on hard days. You will not forget the system. Build the system first."},
     {"title": "Consistency is boring.", "body": "That is the point. Boring done daily beats brilliant done occasionally every time. Boring compounds."},
     {"title": "You have done this before.", "body": "Every hard thing you have ever pushed through looked impossible from the outside of it. You are on the inside now. Keep going."}
   ]'
  ),
  ('00000003-0000-0000-0000-000000000003',
   'Student Grind',
   100,
   '[
     {"title": "You have passed every hard day so far.", "body": "This one is next. Your track record for getting through impossible days is 100%. That is real data."},
     {"title": "Rest is part of the work.", "body": "Protect your recovery. A brain running on four hours of sleep is not studying efficiently, it is performing the ritual of studying. Sleep is not laziness."},
     {"title": "You do not need to understand everything.", "body": "You need to understand enough to pass, then enough to use it. Mastery comes from repetition after the exam, not before it."},
     {"title": "One page. One problem. One concept.", "body": "That is the whole session. You do not have to do all of it today. You just have to do one more thing than you did yesterday."},
     {"title": "The curve exists for a reason.", "body": "You are not expected to be perfect. You are expected to be prepared. Prepared beats perfect in exam conditions every time."},
     {"title": "Comparison is noise.", "body": "You do not know how that person studies. You do not know what they already knew. You only know your own starting point. That is the only one that matters."},
     {"title": "The session does not have to go well.", "body": "It just has to happen. A bad study session where you showed up is better than a perfect session that never started."},
     {"title": "Discomfort means your brain is working.", "body": "If it feels easy, you are probably not learning anything new. The struggle is the signal, not the sign to stop."},
     {"title": "You are building a skill, not memorising a page.", "body": "The feeling of confusion is the beginning of understanding. Stay with it longer than is comfortable."},
     {"title": "Exam day is just another day.", "body": "You have sat in rooms and answered hard questions before. You will do it again. The work you put in now is the reason that day goes well."}
   ]'
  )
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_unlocked_packs (
  user_id      uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  pack_id      uuid NOT NULL REFERENCES motivation_packs ON DELETE CASCADE,
  unlocked_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pack_id)
);

ALTER TABLE user_unlocked_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_unlocked_packs_own"
  ON user_unlocked_packs FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- 4. Sound packs
-- ============================================================

CREATE TABLE IF NOT EXISTS sound_packs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  audio_url    text NOT NULL,
  cost_sparks  int  NOT NULL DEFAULT 0
);

-- RLS for sound_packs was set in 20260620000001_rls.sql; no duplicate policy here.

INSERT INTO sound_packs (id, name, audio_url, cost_sparks) VALUES
  ('00000004-0000-0000-0000-000000000001', 'Rain',         '/sounds/rain.mp3',         100),
  ('00000004-0000-0000-0000-000000000002', 'Coffee Shop',  '/sounds/coffee-shop.mp3',  100),
  ('00000004-0000-0000-0000-000000000003', 'Forest',       '/sounds/forest.mp3',       100),
  ('00000004-0000-0000-0000-000000000004', 'Keyboard',     '/sounds/keyboard.mp3',     150)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_unlocked_sounds (
  user_id      uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  sound_id     uuid NOT NULL REFERENCES sound_packs ON DELETE CASCADE,
  unlocked_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sound_id)
);

ALTER TABLE user_unlocked_sounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_unlocked_sounds_own"
  ON user_unlocked_sounds FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- 5. Schema additions to existing tables
-- ============================================================

-- Add active_theme_id to users. Nullable — NULL means default DayTwin theme.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS active_theme_id uuid REFERENCES themes ON DELETE SET NULL;

-- Add active_motivation_pack_id to user_settings.
-- NULL means no pack active (no rotating card on Today screen).
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS active_motivation_pack_id uuid REFERENCES motivation_packs ON DELETE SET NULL;

-- Array of profile_item ids the user has equipped.
-- Stored as jsonb so we can equip one per category independently.
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS active_profile_item_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ============================================================
-- 6. Revoke direct client access to award_sparks
--    (was granted in Session 11 — closes the security gap where
--    any authenticated user could call it with arbitrary parameters)
-- ============================================================

REVOKE EXECUTE ON FUNCTION award_sparks(uuid, int, text, text, uuid) FROM authenticated;

-- ============================================================
-- 7. deduct_sparks() — SECURITY DEFINER spend function
--
-- Called by shop API route and gift_sparks() only.
-- Validates the caller can only spend their own Sparks
-- by comparing p_user_id to auth.uid().
-- Returns jsonb: { success, new_balance, error? }
-- ============================================================

CREATE OR REPLACE FUNCTION deduct_sparks(
  p_user_id    uuid,
  p_amount     int,      -- positive number; stored as negative in spark_transactions
  p_reason     text,
  p_item_type  text DEFAULT NULL,
  p_item_id    uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_balance     int;
  v_new_balance int;
BEGIN
  -- Safety: only the authenticated user may spend their own Sparks
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  -- Lock the row to prevent concurrent double-spend
  SELECT sparks_balance INTO v_balance
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success',   false,
      'error',     'Insufficient balance',
      'shortfall', p_amount - v_balance
    );
  END IF;

  -- Record the spend transaction (negative amount)
  INSERT INTO spark_transactions (user_id, amount, reason, reference_type, reference_id)
  VALUES (p_user_id, -p_amount, p_reason, p_item_type, p_item_id);

  -- Decrement balance; sparks_lifetime never decreases
  UPDATE users
  SET sparks_balance = sparks_balance - p_amount
  WHERE id = p_user_id
  RETURNING sparks_balance INTO v_new_balance;

  -- Insert the unlock row for purchasable items (atomic with the spend)
  IF p_item_type = 'theme' AND p_item_id IS NOT NULL THEN
    INSERT INTO user_unlocked_themes (user_id, theme_id)
    VALUES (p_user_id, p_item_id)
    ON CONFLICT DO NOTHING;

  ELSIF p_item_type = 'profile_item' AND p_item_id IS NOT NULL THEN
    INSERT INTO user_unlocked_items (user_id, item_id)
    VALUES (p_user_id, p_item_id)
    ON CONFLICT DO NOTHING;

  ELSIF p_item_type = 'motivation_pack' AND p_item_id IS NOT NULL THEN
    INSERT INTO user_unlocked_packs (user_id, pack_id)
    VALUES (p_user_id, p_item_id)
    ON CONFLICT DO NOTHING;

  ELSIF p_item_type = 'sound_pack' AND p_item_id IS NOT NULL THEN
    INSERT INTO user_unlocked_sounds (user_id, sound_id)
    VALUES (p_user_id, p_item_id)
    ON CONFLICT DO NOTHING;

  -- 'challenge_entry', 'gift', NULL → no unlock row needed
  END IF;

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION deduct_sparks(uuid, int, text, text, uuid) TO authenticated;

-- ============================================================
-- 8. gift_sparks() — atomic friend gifting
--
-- Deducts from sender, awards to recipient, records both sides.
-- Called only by /api/sparks/gift route.
-- ============================================================

CREATE OR REPLACE FUNCTION gift_sparks(
  p_sender_id    uuid,
  p_recipient_id uuid,
  p_amount       int,
  p_message      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_sender_balance   int;
  v_new_balance      int;
  v_are_friends      bool;
BEGIN
  -- Only the authenticated user may send as themselves
  IF p_sender_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF p_amount <= 0 OR p_amount > 500 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be 1–500');
  END IF;

  IF p_sender_id = p_recipient_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot gift to yourself');
  END IF;

  -- Verify accepted friendship before allowing gifting
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
      AND (
        (requester_id = p_sender_id AND addressee_id = p_recipient_id)
        OR
        (requester_id = p_recipient_id AND addressee_id = p_sender_id)
      )
  ) INTO v_are_friends;

  IF NOT v_are_friends THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must be friends to send Sparks');
  END IF;

  -- Lock sender row first (always lock lower UUID first to prevent deadlock)
  SELECT sparks_balance INTO v_sender_balance
  FROM users
  WHERE id = p_sender_id
  FOR UPDATE;

  IF v_sender_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success',   false,
      'error',     'Insufficient balance',
      'shortfall', p_amount - v_sender_balance
    );
  END IF;

  -- Deduct from sender
  UPDATE users
  SET sparks_balance = sparks_balance - p_amount
  WHERE id = p_sender_id
  RETURNING sparks_balance INTO v_new_balance;

  INSERT INTO spark_transactions (user_id, amount, reason, reference_type, reference_id)
  VALUES (p_sender_id, -p_amount, 'gift_sent', 'user', p_recipient_id);

  -- Award to recipient (sparks_lifetime increases for recipient)
  UPDATE users
  SET
    sparks_balance  = sparks_balance + p_amount,
    sparks_lifetime = sparks_lifetime + p_amount
  WHERE id = p_recipient_id;

  INSERT INTO spark_transactions (user_id, amount, reason, reference_type, reference_id)
  VALUES (p_recipient_id, p_amount, 'gift_received', 'user', p_sender_id);

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'amount', p_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION gift_sparks(uuid, uuid, int, text) TO authenticated;

-- ============================================================
-- 9. Challenge pool payouts
--    Updates on_challenge_completed (from Session 11) to pay from
--    pool_total_sparks. Fixed fallback amounts apply when pool = 0.
-- ============================================================

CREATE OR REPLACE FUNCTION on_challenge_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_participant RECORD;
  v_pool        int;
  v_all_held    bool;
  v_winner_id   uuid;
  v_winner_score int;
BEGIN
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  v_pool := COALESCE(NEW.pool_total_sparks, 0);

  IF NEW.type = 'habit_pact' THEN
    SELECT bool_and(COALESCE(streak_held, false)) INTO v_all_held
    FROM challenge_participants
    WHERE challenge_id = NEW.id;

    IF COALESCE(v_all_held, false) THEN
      -- Both held — split pool equally (or fixed +50 when no pool)
      FOR v_participant IN
        SELECT user_id FROM challenge_participants WHERE challenge_id = NEW.id
      LOOP
        IF v_pool > 0 THEN
          PERFORM award_sparks(v_participant.user_id, v_pool / 2, 'challenge_pact_win', 'challenge', NEW.id);
        ELSE
          PERFORM award_sparks(v_participant.user_id, 50, 'challenge_pact_win', 'challenge', NEW.id);
        END IF;
      END LOOP;
    ELSE
      -- One broke — winner (held = true) gets the full pool
      FOR v_participant IN
        SELECT user_id, streak_held FROM challenge_participants WHERE challenge_id = NEW.id
      LOOP
        IF COALESCE(v_participant.streak_held, false) THEN
          IF v_pool > 0 THEN
            PERFORM award_sparks(v_participant.user_id, v_pool, 'challenge_pact_win', 'challenge', NEW.id);
          ELSE
            PERFORM award_sparks(v_participant.user_id, 50, 'challenge_pact_win', 'challenge', NEW.id);
          END IF;
        END IF;
      END LOOP;
    END IF;

  ELSIF NEW.type = 'score_battle' THEN
    -- Find the highest scoring participant
    SELECT user_id, current_score INTO v_winner_id, v_winner_score
    FROM challenge_participants
    WHERE challenge_id = NEW.id
    ORDER BY current_score DESC
    LIMIT 1;

    FOR v_participant IN
      SELECT user_id,
             ROW_NUMBER() OVER (ORDER BY current_score DESC) AS rank
      FROM challenge_participants
      WHERE challenge_id = NEW.id
    LOOP
      IF v_participant.rank = 1 THEN
        -- Winner: pool total or fixed +100
        IF v_pool > 0 THEN
          PERFORM award_sparks(v_participant.user_id, v_pool, 'challenge_score_battle_winner', 'challenge', NEW.id);
        ELSE
          PERFORM award_sparks(v_participant.user_id, 100, 'challenge_score_battle_winner', 'challenge', NEW.id);
        END IF;
      ELSE
        -- Runner-up: nothing from pool, fixed consolation when no pool
        IF v_pool = 0 THEN
          PERFORM award_sparks(v_participant.user_id, 30, 'challenge_score_battle_runner_up', 'challenge', NEW.id);
        END IF;
      END IF;
    END LOOP;

  ELSIF NEW.type = 'friends_feed' THEN
    -- Pool not applicable for friends_feed; fixed first-week bonus
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
-- 10. Challenge cancellation refund trigger
--     When a challenge is cancelled before completion, refund
--     entry costs to all participants who paid.
--     Uses award_sparks() internally (SECURITY DEFINER bypass).
-- ============================================================

CREATE OR REPLACE FUNCTION on_challenge_cancelled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_participant RECORD;
  v_entry_cost  int;
BEGIN
  IF NEW.status != 'cancelled' OR OLD.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  v_entry_cost := COALESCE(NEW.entry_cost_sparks, 0);

  -- Only refund if there was an entry cost and the challenge wasn't completed
  IF v_entry_cost > 0 AND OLD.status IN ('pending', 'active') THEN
    FOR v_participant IN
      SELECT user_id FROM challenge_participants WHERE challenge_id = NEW.id
    LOOP
      -- Check this participant actually paid (has a challenge_entry transaction)
      IF EXISTS (
        SELECT 1 FROM spark_transactions
        WHERE user_id = v_participant.user_id
          AND reason = 'challenge_entry'
          AND reference_type = 'challenge'
          AND reference_id = NEW.id
      ) THEN
        PERFORM award_sparks(v_participant.user_id, v_entry_cost, 'challenge_refund', 'challenge', NEW.id);
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_challenge_cancelled ON challenges;
CREATE TRIGGER on_challenge_cancelled
  AFTER UPDATE OF status ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION on_challenge_cancelled();

-- ============================================================
-- NOTE: Challenge entry deductions happen in the API routes
-- (/api/challenges/create and /api/challenges/join) rather than
-- triggers, so the client can receive a proper "insufficient
-- balance" response before the challenge row is created.
-- ============================================================
