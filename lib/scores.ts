import type { SupabaseClient } from '@supabase/supabase-js'
import type { Task, TodayHabit, DailyScore, ScoreBreakdown } from '@/types'

/**
 * Score formula (0–100):
 *   Tasks     → (completed / total) * 40   — 0 when no tasks planned
 *   Habits    → (completed / scheduled) * 30 — 0 when none scheduled
 *   Reflection → 20 if submitted today, else 0
 *   Mood      → 10 if any period logged today, else 0
 *
 * Each component is clamped before summing, so the total is always 0–100.
 */
export function computeScorePct(
  tasks:          Task[],
  habits:         TodayHabit[],
  reflectionDone: boolean,
  moodLogged:     boolean,
): { score: number; breakdown: ScoreBreakdown } {
  const completedTasks = tasks.filter(t => t.completed).length
  const tasks_pct      = tasks.length > 0
    ? Math.round((completedTasks / tasks.length) * 40)
    : 0

  const completedHabits = habits.filter(h => h.log?.completed).length
  const habits_pct      = habits.length > 0
    ? Math.round((completedHabits / habits.length) * 30)
    : 0

  const breakdown: ScoreBreakdown = {
    tasks_pct,
    habits_pct,
    reflection_done: reflectionDone,
    mood_logged:     moodLogged,
  }

  const score = tasks_pct + habits_pct + (reflectionDone ? 20 : 0) + (moodLogged ? 10 : 0)
  return { score, breakdown }
}

/**
 * Upsert today's score to `daily_scores`.
 * Called whenever a task, habit, reflection, or mood changes — the unique
 * constraint on (user_id, date) ensures only one row per day.
 */
export async function upsertDailyScore(
  supabase:  SupabaseClient,
  date:      string,
  score:     number,
  breakdown: ScoreBreakdown,
): Promise<void> {
  const { error } = await supabase
    .from('daily_scores')
    .upsert({ date, score_pct: score, breakdown }, { onConflict: 'user_id,date' })

  if (error) throw new Error(`Failed to save score: ${error.message}`)
}

/** Fetch today's stored score, or null if none saved yet. */
export async function fetchTodayScore(
  supabase: SupabaseClient,
  date:     string,
): Promise<DailyScore | null> {
  const { data, error } = await supabase
    .from('daily_scores')
    .select('*')
    .eq('date', date)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch score: ${error.message}`)
  return data as DailyScore | null
}

/**
 * Fetch score_pct for every day in the last 30 days.
 * Used by the Hard Day overlay to compute "You showed up N out of 30 days."
 * A day counts as "shown up" if score_pct > 0 (anything was done).
 */
export async function fetchLast30DayScores(
  supabase: SupabaseClient,
): Promise<DailyScore[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  const cutoffISO = cutoff.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('daily_scores')
    .select('*')
    .gte('date', cutoffISO)
    .order('date', { ascending: false })

  if (error) throw new Error(`Failed to fetch score history: ${error.message}`)
  return (data ?? []) as DailyScore[]
}
