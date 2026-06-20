# DayTwin — Database Schema (Supabase / Postgres)

## Ground rules

- All tables use `uuid` primary keys, default `gen_random_uuid()`
- All tables include `created_at timestamptz default now()` unless noted otherwise
- Row Level Security (RLS) is required on every table — `user_id = auth.uid()` for personal data, friend-visibility policies for shared challenge/friendship rows. See `privacy-and-friend-safety.md` for the exact private / friend-visible / challenge-shared classification per table — RLS policies should implement that classification directly.
- **No compulsory signup.** Every user starts on a Supabase anonymous session, created silently on first open — no form, no screen. The account is claimed (email or Google linked to the same row, username set) later, prompted contextually — after a few days of use, or the first time they try to add a friend or join a challenge, since those need an identity other people can find. Until claimed, progress lives only on that device.
- **Everything is free in V1.** `subscription_tier` defaults to `'free'` for every user and no paywall logic is built yet — the column exists so flipping on Pro later is a config change, not a schema migration.
- **Future Me messages are NOT in this schema.** They're stored client-side only, in IndexedDB on the user's device, by design — they never touch Supabase or leave the device
- Indexing notes are at the bottom

---

## 1. Identity & account

```
users (extends auth.users via a public profile row)
  id                    uuid PK, references auth.users
  is_anonymous          bool, default true   -- true until account is claimed
  email                 text, nullable, unique -- set when account is claimed
  username              text, unique, nullable -- set when account is claimed
  display_name          text, nullable
  preferred_name         text, nullable     -- how the app addresses you directly; can differ from display_name shown to friends
  tone_preference        enum(warm, direct, hype), default 'warm'   -- selects which copy variant set is shown across the app
  avatar_url            text, nullable
  timezone              text, default 'Africa/Accra'
  last_active_at        timestamptz        -- drives Welcome Back screen
  subscription_tier     enum(free, pro), default 'free'  -- everyone is 'free' in V1; Pro gating logic is not built yet, column just sits ready
  subscription_renews_at timestamptz, nullable
  paystack_customer_id  text, nullable
  sparks_balance        int, default 0     -- spendable, fluctuates
  sparks_lifetime       int, default 0     -- never decreases, drives Growth Level
  active_theme_id       uuid FK -> themes, nullable
  reduced_motion         bool, default false
  created_at            timestamptz

user_settings
  user_id                  uuid PK FK -> users
  notif_task_reminders     bool, default true
  notif_habit_risk         bool, default true
  notif_streak_risk        bool, default true
  notif_friend_activity    bool, default true
  notif_weekly_review      bool, default true
  morning_checkin_time     time, default '07:00'
  evening_checkin_time     time, default '20:00'
  dashboard_layout         jsonb, nullable    -- card order + visibility on Today, user-customized
```

---

## 2. Daily planning

```
day_templates
  id          uuid PK
  user_id     uuid FK -> users
  name        text
  blocks      jsonb        -- [{title, start_time, end_time, category}]
  created_at  timestamptz

tasks
  id              uuid PK
  user_id         uuid FK -> users
  project_id      uuid FK -> projects, nullable
  title           text
  date            date
  start_time      time, nullable      -- null = quick task, not a time block
  end_time        time, nullable
  category        enum(deep_work, study, health, admin, personal)
  priority        enum(low, medium, high)
  completed       bool, default false
  completed_at    timestamptz, nullable
  created_at      timestamptz

time_entries
  id                uuid PK
  user_id           uuid FK -> users
  task_id           uuid FK -> tasks, nullable
  category          text          -- coding, studying, gym, social media, etc.
  start_at          timestamptz
  end_at            timestamptz, nullable   -- null while timer is running
  duration_seconds  int, nullable           -- cached on stop

focus_sessions
  id                       uuid PK
  user_id                  uuid FK -> users
  task_id                  uuid FK -> tasks, nullable
  planned_duration_seconds int
  actual_duration_seconds  int, nullable
  status                   enum(completed, cancelled)
  started_at               timestamptz
  ended_at                 timestamptz, nullable

daily_scores
  id           uuid PK
  user_id      uuid FK -> users
  date         date
  score_pct    int
  breakdown    jsonb     -- {tasks_pct, habits_pct, reflection_done}
  unique(user_id, date)
```

---

## 3. Habits

```
habits
  id              uuid PK
  user_id         uuid FK -> users
  name            text
  type            enum(boolean, count, timer)
  target_value    int, nullable      -- e.g. 8 glasses, or 7200 seconds
  frequency       jsonb              -- {days: [mon,tue,...]} or 'daily'
  archived        bool, default false
  created_at      timestamptz

habit_logs
  id          uuid PK
  habit_id    uuid FK -> habits
  user_id     uuid FK -> users        -- denormalized for fast queries
  date        date
  value       int, nullable           -- logged count/timer value
  completed   bool
  unique(habit_id, date)

habit_streaks
  habit_id                  uuid PK FK -> habits
  current_streak            int
  consistency_30d_pct       int
  grace_day_used_this_week  bool, default false
  last_grace_reset          date
```

---

## 4. Goals & reflection

```
goals
  id            uuid PK
  user_id       uuid FK -> users
  title         text
  why_text      text, nullable       -- the WHY screen content
  deadline      date, nullable
  progress_pct  int, default 0
  status        enum(active, completed, archived)
  created_at    timestamptz

projects
  id          uuid PK
  user_id     uuid FK -> users
  goal_id     uuid FK -> goals, nullable
  title       text
  status      enum(active, completed, archived)
  created_at  timestamptz

intentions          -- morning intention, one per day
  id        uuid PK
  user_id   uuid FK -> users
  date      date
  text      text
  unique(user_id, date)

reflections          -- evening reflection
  id            uuid PK
  user_id       uuid FK -> users
  date          date
  went_well     text
  time_wasted   text, nullable
  biggest_win   text, nullable
  unique(user_id, date)

mood_logs
  id            uuid PK
  user_id       uuid FK -> users
  logged_at     timestamptz
  period        enum(morning, midday, evening)
  mood_value    int            -- 1 to 5
  energy_value  int, nullable  -- 1 to 5

weekly_reviews        -- cached, computed weekly by a scheduled function
  id                uuid PK
  user_id           uuid FK -> users
  week_start        date
  tasks_completed   int
  habits_pct        int
  focus_hours       numeric
  best_day          date, nullable
  worst_day         date, nullable
  ai_summary        text, nullable     -- V2: weekly Claude API coaching message, null until that ships
  unique(user_id, week_start)
```

---

## 5. Friends & challenges

```
friendships
  id              uuid PK
  requester_id    uuid FK -> users
  addressee_id    uuid FK -> users
  status          enum(pending, accepted, blocked)
  created_at      timestamptz
  unique(requester_id, addressee_id)

challenges
  id                  uuid PK
  type                enum(score_battle, habit_pact, friends_feed)
  habit_id            uuid FK -> habits, nullable   -- habit_pact only
  created_by          uuid FK -> users
  duration_days       int, nullable
  starts_at           date
  ends_at             date, nullable
  entry_cost_sparks   int, default 0
  pool_total_sparks   int, default 0
  status              enum(pending, active, completed, cancelled)

challenge_participants
  id              uuid PK
  challenge_id    uuid FK -> challenges
  user_id         uuid FK -> users
  joined_at       timestamptz
  current_score   int, default 0       -- score_battle leaderboard
  streak_held     bool, nullable       -- habit_pact
  unique(challenge_id, user_id)
```

---

## 6. Sparks economy

```
spark_transactions          -- written ONLY by trusted server-side logic (Postgres trigger / Edge Function); RLS must block direct client INSERT
  id              uuid PK
  user_id         uuid FK -> users
  amount          int            -- positive = earn, negative = spend
  reason          text           -- 'task_completed', 'theme_purchase:sunset'
  reference_type  text, nullable -- 'task', 'challenge', 'theme'
  reference_id    uuid, nullable
  created_at      timestamptz

themes
  id              uuid PK
  name            text
  accent_hex      text
  background_hex  text
  cost_sparks     int
  category        text     -- dark, anime, space, nature, minimal, study

user_unlocked_themes
  user_id      uuid FK -> users
  theme_id     uuid FK -> themes
  unlocked_at  timestamptz
  PK(user_id, theme_id)

profile_items
  id           uuid PK
  type         enum(frame, avatar, border, icon)
  name         text
  asset_url    text
  cost_sparks  int

user_unlocked_items
  user_id      uuid FK -> users
  item_id      uuid FK -> profile_items
  unlocked_at  timestamptz
  PK(user_id, item_id)

motivation_packs
  id            uuid PK
  name          text
  content       jsonb     -- array of cards/quotes
  cost_sparks   int

user_unlocked_packs
  user_id   uuid FK -> users
  pack_id   uuid FK -> motivation_packs
  PK(user_id, pack_id)

sound_packs
  id            uuid PK
  name          text
  audio_url     text
  cost_sparks   int

user_unlocked_sounds
  user_id    uuid FK -> users
  sound_id   uuid FK -> sound_packs
  PK(user_id, sound_id)

badges
  id            uuid PK
  name          text
  description   text
  icon          text
  rarity        enum(common, rare, legendary)
  criteria      text     -- human-readable; logic lives in app code

user_badges
  user_id     uuid FK -> users
  badge_id    uuid FK -> badges
  earned_at   timestamptz
  PK(user_id, badge_id)
```

*Milestone celebrations (7-day, 30-day, first goal complete) are detected from `habit_streaks.current_streak` and `goals.status` crossing thresholds — they don't need their own table, and can optionally award a row in `badges` / `user_badges` when triggered.*

### Anti-abuse notes

- **The client never writes Sparks directly.** Every earn or spend goes through trusted server-side logic — a Postgres trigger or Edge Function — that validates the action first, then writes `spark_transactions` and updates the balance. RLS denies direct client inserts/updates on `spark_transactions` and on `users.sparks_balance` / `sparks_lifetime`. This is the floor every other rule below depends on.
- **Time-based earns are verified against real elapsed time.** A focus session or timer habit only pays out once `now() - started_at >= planned_duration`, checked server-side — never trusted from the client's own "I'm done" signal.
- **Daily caps per earning category** (task completion, habit completion, reflection) bound the worst case from categories that can't be verified — mass-completing trivial items hits a ceiling fast instead of scaling indefinitely.
- **"All daily tasks complete" bonus requires a minimum task count** (3+) before it qualifies, so it can't be farmed with a single throwaway task.
- `habit_logs` and `daily_scores` already carry `unique(habit_id/user_id, date)` constraints — the schema itself blocks logging the same habit or day twice for repeat Sparks.

---

## Indexing notes

- `tasks(user_id, date)`, `habit_logs(user_id, date)`, `daily_scores(user_id, date)` — composite indexes, since almost every screen query filters by user + date range
- `friendships(requester_id)` and `friendships(addressee_id)` — separate indexes, since lookups happen from both directions
- `challenge_participants(challenge_id, current_score desc)` — for fast leaderboard sorting
- `spark_transactions(user_id, created_at desc)` — for transaction history pagination
