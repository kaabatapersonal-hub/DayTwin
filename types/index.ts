/**
 * Shared TypeScript types for DayTwin.
 * Field names and types match database-schema.md exactly — do not rename.
 */

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
  tone_preference:  'warm' | 'direct' | 'hype'
  sparks_balance:   number
  sparks_lifetime:  number
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
