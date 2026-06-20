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
