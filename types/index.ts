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
