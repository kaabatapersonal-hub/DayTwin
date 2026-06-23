/**
 * Shared TypeScript types for DayTwin.
 * Field names and types match database-schema.md exactly — do not rename.
 */

export type TonePreference = 'warm' | 'direct' | 'hype'

export type TaskCategory = 'deep_work' | 'study' | 'health' | 'admin' | 'personal'
export type TaskPriority  = 'low' | 'medium' | 'high'

/** Matches the `tasks` table in database-schema.md */
export interface Task {
  id:           string
  user_id:      string
  project_id:   string | null
  title:        string
  date:         string          // Postgres date → "YYYY-MM-DD"
  start_time:   string | null   // Postgres time → "HH:MM:SS"; null = quick task
  end_time:     string | null
  category:     TaskCategory
  priority:     TaskPriority
  completed:    boolean
  completed_at: string | null   // ISO timestamp when task was checked off
  created_at:   string
}

/**
 * Payload for creating a new task.
 * `user_id`, `id`, `created_at`, `completed_at` are all set by the DB.
 */
export interface NewTask {
  title:      string
  date:       string
  start_time: string | null
  end_time:   string | null
  category:   TaskCategory
  priority:   TaskPriority
  completed:  boolean
  project_id: string | null
}

/** Matches the `intentions` table in database-schema.md */
export interface Intention {
  id:       string
  user_id:  string
  date:     string   // Postgres date → "YYYY-MM-DD"
  text:     string
}

// ── Habits ────────────────────────────────────────────────────────────────────

export type DayOfWeek    = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export type HabitType    = 'boolean' | 'count' | 'timer'

/**
 * JSONB frequency field.
 * 'daily' → every day.
 * { days: [...] } → only on the listed weekdays.
 * Supabase returns JSONB already parsed, so this is the in-memory shape.
 */
export type HabitFrequency = 'daily' | { days: DayOfWeek[] }

/** Matches the `habits` table. target_value unit: reps for count; seconds for timer. */
export interface Habit {
  id:           string
  user_id:      string
  name:         string
  type:         HabitType
  target_value: number | null
  frequency:    HabitFrequency
  archived:     boolean
  created_at:   string
}

export interface NewHabit {
  name:         string
  type:         HabitType
  target_value: number | null
  frequency:    HabitFrequency
}

/** Matches the `habit_logs` table. value unit mirrors target_value (reps or seconds). */
export interface HabitLog {
  id:        string
  habit_id:  string
  user_id:   string
  date:      string         // "YYYY-MM-DD"
  value:     number | null
  completed: boolean
}

/** Matches the `habit_streaks` table. */
export interface HabitStreak {
  habit_id:                 string
  current_streak:           number
  consistency_30d_pct:      number   // 0–100
  grace_day_used_this_week: boolean
  last_grace_reset:         string | null  // "YYYY-MM-DD"
}

/** Habit + its streak — used in the Habits tab list. */
export interface HabitWithStreak {
  habit:  Habit
  streak: HabitStreak
}

/** Habit + today's log + streak — used in the Today screen's habits section. */
export interface TodayHabit {
  habit:  Habit
  log:    HabitLog | null
  streak: HabitStreak
}

// ── Goals & projects ──────────────────────────────────────────────────────────

export type GoalStatus    = 'active' | 'completed' | 'archived'
export type ProjectStatus = 'active' | 'completed' | 'archived'

/**
 * Matches the `goals` table.
 * Goals are always private — never visible to friends, no setting changes this.
 * See privacy-and-friend-safety.md.
 */
export interface Goal {
  id:           string
  user_id:      string
  title:        string
  why_text:     string | null
  deadline:     string | null   // "YYYY-MM-DD"
  progress_pct: number          // 0–100; manually set by the user — no auto-rollup
  status:       GoalStatus
  created_at:   string
}

export interface NewGoal {
  title:        string
  why_text:     string | null
  deadline:     string | null
  status:       GoalStatus
}

/** Matches the `projects` table. */
export interface Project {
  id:         string
  user_id:    string
  goal_id:    string | null
  title:      string
  status:     ProjectStatus
  created_at: string
}

export interface NewProject {
  title:   string
  goal_id: string | null
  status:  ProjectStatus
}

/** Goal bundled with its active projects — used in goal detail view. */
export interface GoalWithProjects {
  goal:     Goal
  projects: Project[]
}

/** Project bundled with its linked tasks — used in project detail view. */
export interface ProjectWithTasks {
  project: Project
  tasks:   Task[]
  goal:    Goal | null
}

// ── User profile ──────────────────────────────────────────────────────────────

/** Public profile row from the `users` table (extends auth.users). */
export interface UserProfile {
  id:               string
  preferred_name:   string | null
  display_name:     string | null
  timezone:         string
  last_active_at:   string | null  // ISO timestamp; drives Welcome Back screen
  tone_preference:  TonePreference
  sparks_balance:   number
  sparks_lifetime:  number
  active_theme_id:  string | null
}

// ── Score & reflection ────────────────────────────────────────────────────────

/**
 * Shape of the `breakdown` JSONB column in `daily_scores`.
 * Each component maps directly to a weighted slice of the 0–100 score.
 */
export interface ScoreBreakdown {
  tasks_pct:       number   // 0–40
  habits_pct:      number   // 0–30
  reflection_done: boolean  // +20
  mood_logged:     boolean  // +10
}

/** Matches the `daily_scores` table. */
export interface DailyScore {
  id:        string
  user_id:   string
  date:      string
  score_pct: number
  breakdown: ScoreBreakdown
}

/** Matches the `reflections` table. Private — owner only. */
export interface Reflection {
  id:          string
  user_id:     string
  date:        string
  went_well:   string
  time_wasted: string | null
  biggest_win: string | null
  created_at:  string
}

export interface NewReflection {
  went_well:   string
  time_wasted: string | null
  biggest_win: string | null
}

// ── Mood logs ─────────────────────────────────────────────────────────────────

export type MoodPeriod = 'morning' | 'midday' | 'evening'

/** Matches the `mood_logs` table. Private — owner only. */
export interface MoodLog {
  id:           string
  user_id:      string
  logged_at:    string
  period:       MoodPeriod
  mood_value:   number       // 1–5
  energy_value: number | null
}

export interface NewMoodLog {
  period:       MoodPeriod
  mood_value:   number
  energy_value: number | null
}

// ── Morning coach ─────────────────────────────────────────────────────────────

/**
 * Computed from real data server-side — zero API calls.
 * Nulls mean "no data yet"; the coach card gracefully omits those sentences.
 */
export interface CoachData {
  preferredName:   string | null
  focusHoursWeek:  number          // summed from time_entries this calendar week
  goalTitle:       string | null   // most recently active goal
  goalProgressPct: number | null   // its current progress_pct (manual)
  topTaskTitle:    string | null   // highest-priority incomplete task for today
}

// ── Time tracking ─────────────────────────────────────────────────────────────

/**
 * Text categories for time_entries.category (stored as text, not enum).
 * Social media is listed without any special treatment — same visual weight as coding.
 * See privacy-and-friend-safety.md: time entries are always private, no friend sees them.
 */
export type TrackingCategory =
  | 'coding'
  | 'studying'
  | 'gym'
  | 'admin'
  | 'social_media'
  | 'personal'

/** Matches the time_entries table in database-schema.md */
export interface TimeEntry {
  id:               string
  user_id:          string
  task_id:          string | null
  category:         TrackingCategory
  start_at:         string          // ISO timestamp; set by DB default
  end_at:           string | null   // null while timer is running
  duration_seconds: number | null   // null while running; set server-side on stop
}

export interface NewTimeEntry {
  category: TrackingCategory
  task_id:  string | null
}

// ── Focus sessions ────────────────────────────────────────────────────────────

/** 'active' requires migration 20260622000003 to be applied first. */
export type FocusSessionStatus = 'active' | 'completed' | 'cancelled'

/** Matches the focus_sessions table in database-schema.md */
export interface FocusSession {
  id:                       string
  user_id:                  string
  task_id:                  string | null
  planned_duration_seconds: number
  actual_duration_seconds:  number | null
  status:                   FocusSessionStatus
  started_at:               string          // ISO timestamp; set by DB default
  ended_at:                 string | null
}

export interface NewFocusSession {
  planned_duration_seconds: number
  task_id:                  string | null
}

/** Aggregated weekly totals per tracking category — used by WeeklyTimeSummary */
export interface TimeCategorySummary {
  category:      TrackingCategory
  total_seconds: number
}

// ── Challenges ───────────────────────────────────────────────────────────────

export type ChallengeType   = 'score_battle' | 'habit_pact' | 'friends_feed'
export type ChallengeStatus = 'pending' | 'active' | 'completed' | 'cancelled'

/**
 * Matches the `challenges` table.
 * entry_cost_sparks / pool_total_sparks exist for display only — no Sparks
 * deduction or payout logic runs until Session 11.
 */
export interface Challenge {
  id:                string
  type:              ChallengeType
  habit_id:          string | null   // habit_pact only
  created_by:        string
  invitee_id:        string | null   // set on creation, cleared when invitee joins
  duration_days:     number | null   // null for friends_feed (no end date)
  starts_at:         string          // "YYYY-MM-DD"
  ends_at:           string | null   // null for friends_feed
  entry_cost_sparks: number          // display only this session
  pool_total_sparks: number          // display only this session
  status:            ChallengeStatus
  created_at:        string
}

export interface NewChallenge {
  type:              ChallengeType
  habit_id:          string | null
  duration_days:     number | null
  entry_cost_sparks: number
}

/** Matches the `challenge_participants` table. */
export interface ChallengeParticipant {
  id:            string
  challenge_id:  string
  user_id:       string
  joined_at:     string
  current_score: number          // score_battle: average since start; others: 0
  streak_held:   boolean | null  // habit_pact: true while holding; null for other types
}

/**
 * Participant row joined with their public profile.
 * Used in the challenge detail screens — challenge-shared data only.
 */
export interface ChallengeParticipantView {
  id:            string
  user_id:       string
  display_name:  string | null
  username:      string | null
  avatar_url:    string | null
  current_score: number
  streak_held:   boolean | null
  joined_at:     string
}

/**
 * Full detail shape for the challenge detail screen.
 * habit_name is the pact habit's name — visible to both participants per
 * privacy-and-friend-safety.md's challenge-shared exception.
 */
export interface ChallengeWithParticipants {
  challenge:    Challenge
  participants: ChallengeParticipantView[]
  habit_name:   string | null   // habit_pact only
}

// ── Friends ───────────────────────────────────────────────────────────────────

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked'

/** Matches the `friendships` table. */
export interface Friendship {
  id:           string
  requester_id: string
  addressee_id: string
  status:       FriendshipStatus
  created_at:   string
}

/**
 * Pre-joined view used to render a friend list item.
 * Only friend-visible fields are included — no breakdown, no habit names.
 * consistency_30d_pct is loaded lazily (via RPC) in the profile overlay.
 */
export interface FriendView {
  friendship_id:       string
  user_id:             string
  display_name:        string | null
  username:            string | null
  avatar_url:          string | null
  sparks_lifetime:     number
  today_score_pct:     number | null   // null if friend has no score logged today
  consistency_30d_pct: number | null   // null until fetched from profile overlay
}

/**
 * A pending friend request — either incoming (we are the addressee)
 * or outgoing (we are the requester).
 */
export interface FriendRequest {
  friendship_id: string
  requester_id:  string
  addressee_id:  string
  display_name:  string | null
  username:      string | null
  avatar_url:    string | null
  direction:     'incoming' | 'outgoing'
  created_at:    string
}

/**
 * Result from username search before any friendship exists.
 * Only the discoverable public fields are returned — nothing else leaks pre-friendship.
 */
export interface FriendSearchResult {
  user_id:      string
  display_name: string | null
  username:     string
  avatar_url:   string | null
}

/** One day's score entry in the 7-day friend profile chart. */
export interface FriendScoreDay {
  date:      string   // "YYYY-MM-DD"
  score_pct: number
}

/**
 * Full profile data for the friend profile overlay.
 * Extends FriendView with the 7-day score history (from get_friend_scores RPC)
 * and the consistency figure (from get_friend_consistency RPC).
 */
export interface FriendProfileData extends FriendView {
  score_history:       FriendScoreDay[]
  consistency_30d_pct: number
}

/** Matches the `invite_tokens` table. */
export interface InviteToken {
  id:         string
  user_id:    string
  created_at: string
  expires_at: string
  claimed_at: string | null
  claimed_by: string | null
}

// ── Weekly review ─────────────────────────────────────────────────────────────

/**
 * Matches the `weekly_reviews` table.
 * Computed every Sunday by the Edge Function and cached here.
 * ai_summary is always null in V1 — the column exists for V2 Pro.
 */
export interface WeeklyReview {
  id:              string
  user_id:         string
  week_start:      string        // "YYYY-MM-DD" (Monday)
  tasks_completed: number
  habits_pct:      number        // 0–100
  focus_hours:     number        // hours, 1 decimal place
  best_day:        string | null // "YYYY-MM-DD"
  worst_day:       string | null // "YYYY-MM-DD" — only days the user was active
  ai_summary:      null          // always null in V1
}

// ── Badges ────────────────────────────────────────────────────────────────────

export type BadgeRarity = 'common' | 'rare' | 'legendary'

/** Matches the `badges` table. */
export interface Badge {
  id:          string
  name:        string
  description: string
  icon:        string        // emoji or asset path
  rarity:      BadgeRarity
  criteria:    string        // human-readable; logic lives in triggers
}

/**
 * Matches the `user_badges` table, joined with the badge details.
 * Visible to accepted friends per the RLS policy.
 */
export interface UserBadge {
  user_id:   string
  badge_id:  string
  earned_at: string
  badge:     Badge
}

/**
 * One cell in the consistency heatmap.
 * score_pct is null for days the user had no daily_scores row
 * (i.e. didn't open the app) — not for days with a 0 score.
 */
export interface HeatmapDay {
  date:      string         // "YYYY-MM-DD"
  score_pct: number | null  // null = no data (gray); 0–100 = active (teal gradient)
}

// ── Shop & themes ─────────────────────────────────────────────────────────────

/** Matches the `themes` table. */
export interface Theme {
  id:             string
  name:           string
  accent_hex:     string
  background_hex: string
  cost_sparks:    number
  category:       string | null
}

export type ProfileItemType = 'frame' | 'avatar' | 'border' | 'icon'

/** Matches the `profile_items` table. */
export interface ProfileItem {
  id:          string
  type:        ProfileItemType
  name:        string
  /** CSS descriptor string (frames/borders) or shape identifier (avatars/icons). */
  asset_url:   string
  cost_sparks: number
}

export interface MotivationCard {
  title: string
  body:  string
}

/** Matches the `motivation_packs` table. content is an array of MotivationCard. */
export interface MotivationPack {
  id:          string
  name:        string
  content:     MotivationCard[]
  cost_sparks: number
}

/** Matches the `sound_packs` table. */
export interface SoundPack {
  id:          string
  name:        string
  audio_url:   string
  cost_sparks: number
}

// ── Sparks ────────────────────────────────────────────────────────────────────

/** Matches the `spark_transactions` table. */
export interface SparkTransaction {
  id:             string
  user_id:        string
  amount:         number          // positive = earn, negative = reversal
  reason:         string
  reference_type: string | null
  reference_id:   string | null
  created_at:     string
}

// ── Settings & You tab ────────────────────────────────────────────────────────

/** Full profile row for the Settings/You tab — includes private fields not in UserProfile. */
export interface UserFullProfile {
  id:                   string
  is_anonymous:         boolean
  email:                string | null
  username:             string | null
  username_changed_at:  string | null  // ISO timestamp — edit locked 30 days after change
  display_name:         string | null
  preferred_name:       string | null
  tone_preference:      TonePreference
  reduced_motion:       boolean
  onesignal_player_id:  string | null
}

/** Matches the `user_settings` table including new Session 10 columns. */
export interface UserSettings {
  user_id:                  string
  notif_task_reminders:     boolean
  notif_habit_risk:         boolean
  notif_streak_risk:        boolean
  notif_friend_activity:    boolean
  notif_weekly_review:      boolean
  notif_challenge_invites:  boolean
  notif_score_updates:      boolean
  notif_pact_miss:          boolean
  morning_checkin_time:     string   // "HH:MM:SS"
  evening_checkin_time:     string   // "HH:MM:SS"
  notif_daily_count:        number
  notif_last_sent_date:     string | null
}
