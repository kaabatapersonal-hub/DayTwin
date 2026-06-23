import type { SupabaseClient } from '@supabase/supabase-js'
import type { WeeklyReview, HabitFrequency, DayOfWeek } from '@/types'

/**
 * Builds the 7 ISO date strings for a week starting on the given Monday.
 */
function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${weekStart}T00:00:00`)
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

/**
 * Maps JS Date.getDay() (0 = Sunday) to DayTwin frequency day names.
 * Needs to match the frequency JSONB shape stored in habits.frequency.
 */
const JS_DOW_TO_NAME: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

/**
 * Returns true if a habit with this frequency is scheduled on the given date.
 * Used to count "scheduled instances" for habits_pct — we only count habit
 * completions against days where the habit was actually due.
 */
function isScheduled(frequency: HabitFrequency, isoDate: string): boolean {
  if (frequency === 'daily') return true
  const dow = new Date(`${isoDate}T00:00:00`).getDay()
  return (frequency as { days: DayOfWeek[] }).days.includes(JS_DOW_TO_NAME[dow])
}

/**
 * Computes the weekly review stats for a given user and week (week_start = Monday).
 * Fetches from tasks, habits, habit_logs, time_entries, and daily_scores.
 * Upserts the result to weekly_reviews for caching.
 *
 * ai_summary is intentionally left null — it's a V2 feature.
 * worst_day is only set to days where the user has actual score data;
 * days with no daily_scores row (user didn't open the app) are excluded.
 */
export async function computeWeeklyReview(
  supabase: SupabaseClient,
  userId: string,
  weekStart: string,  // Monday "YYYY-MM-DD"
): Promise<WeeklyReview | null> {
  const dates   = weekDates(weekStart)
  const weekEnd = dates[6]  // Sunday

  const [
    { data: tasks },
    { data: habits },
    { data: habitLogs },
    { data: timeEntries },
    { data: scores },
  ] = await Promise.all([
    supabase
      .from('tasks')
      .select('date, completed')
      .eq('user_id', userId)
      .gte('date', weekStart)
      .lte('date', weekEnd),

    supabase
      .from('habits')
      .select('id, frequency')
      .eq('user_id', userId)
      .eq('archived', false),

    supabase
      .from('habit_logs')
      .select('habit_id, date, completed')
      .eq('user_id', userId)
      .gte('date', weekStart)
      .lte('date', weekEnd),

    supabase
      .from('time_entries')
      .select('duration_seconds')
      .eq('user_id', userId)
      .gte('start_at', `${weekStart}T00:00:00+00:00`)
      .lte('start_at', `${weekEnd}T23:59:59+00:00`)
      .not('duration_seconds', 'is', null),

    supabase
      .from('daily_scores')
      .select('date, score_pct')
      .eq('user_id', userId)
      .gte('date', weekStart)
      .lte('date', weekEnd),
  ])

  // Count tasks marked complete during the week
  const tasksCompleted = (tasks ?? []).filter(t => t.completed).length

  // habits_pct: completed habit instances / total scheduled habit instances
  // Only habits with a scheduled day in this week count toward the denominator.
  let scheduledTotal = 0
  let completedTotal = 0
  for (const habit of (habits ?? [])) {
    const freq = habit.frequency as HabitFrequency
    for (const date of dates) {
      if (isScheduled(freq, date)) {
        scheduledTotal++
        const log = (habitLogs ?? []).find(l => l.habit_id === habit.id && l.date === date)
        if (log?.completed) completedTotal++
      }
    }
  }
  const habitsPct = scheduledTotal > 0 ? Math.round((completedTotal / scheduledTotal) * 100) : 0

  // focus_hours: sum of completed time_entries for the week, in hours (1 dp)
  const totalSeconds = (timeEntries ?? []).reduce(
    (sum, t) => sum + (t.duration_seconds ?? 0), 0,
  )
  // Round to 1 decimal: multiply by 10, floor, divide by 10
  const focusHours = Math.floor((totalSeconds / 3600) * 10) / 10

  // best_day / worst_day: only from days where daily_scores has a row
  // (never labels a day the user didn't open the app as "quiet")
  const scoreRows = (scores ?? []) as { date: string; score_pct: number }[]
  let bestDay:  string | null = null
  let worstDay: string | null = null

  if (scoreRows.length > 0) {
    const sorted = [...scoreRows].sort((a, b) => a.score_pct - b.score_pct)
    worstDay = sorted[0].date
    bestDay  = sorted[sorted.length - 1].date
    // If both land on the same day (only 1 active day) suppress worst_day —
    // calling the only active day "quiet" alongside "best" is confusing
    if (worstDay === bestDay) worstDay = null
  }

  const review = {
    user_id:         userId,
    week_start:      weekStart,
    tasks_completed: tasksCompleted,
    habits_pct:      habitsPct,
    focus_hours:     focusHours,
    best_day:        bestDay,
    worst_day:       worstDay,
    ai_summary:      null,
  }

  const { data, error } = await supabase
    .from('weekly_reviews')
    .upsert(review, { onConflict: 'user_id,week_start' })
    .select()
    .single()

  if (error) {
    console.error('computeWeeklyReview upsert failed:', error.message)
    return null
  }

  return data as WeeklyReview
}

/** Fetches all weekly reviews for the authenticated user, newest week first. */
export async function fetchWeeklyReviews(
  supabase: SupabaseClient,
): Promise<WeeklyReview[]> {
  const { data } = await supabase
    .from('weekly_reviews')
    .select('*')
    .order('week_start', { ascending: false })

  return (data ?? []) as WeeklyReview[]
}

/** Fetches the 6-month heatmap data: one row per day with a daily_scores entry. */
export async function fetchHeatmapData(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ date: string; score_pct: number }[]> {
  // 6 months back from today
  const since = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 6)
    return d.toISOString().slice(0, 10)
  })()

  const { data } = await supabase
    .from('daily_scores')
    .select('date, score_pct')
    .eq('user_id', userId)
    .gte('date', since)
    .order('date', { ascending: true })

  return (data ?? []) as { date: string; score_pct: number }[]
}
