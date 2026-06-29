import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Habit, HabitLog, HabitStreak, HabitFrequency, HabitWithStreak,
  TodayHabit, NewHabit, DayOfWeek,
} from '@/types'

// ── Internal date helpers ─────────────────────────────────────────────────────

function localDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`)  // force local midnight, not UTC
}

function isoFormat(d: Date): string {
  const y   = d.getFullYear()
  const mon = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mon}-${day}`
}

function prevDay(isoDate: string): string {
  const d = localDate(isoDate)
  d.setDate(d.getDate() - 1)
  return isoFormat(d)
}

function subtractDays(isoDate: string, n: number): string {
  const d = localDate(isoDate)
  d.setDate(d.getDate() - n)
  return isoFormat(d)
}

function daysBetween(earlier: string, later: string): number {
  const ms = localDate(later).getTime() - localDate(earlier).getTime()
  return Math.round(ms / 86_400_000)
}

// ── Scheduling ────────────────────────────────────────────────────────────────

const DOW: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

/** Returns true when the habit is scheduled to be done on the given ISO date. */
export function isScheduledOn(frequency: HabitFrequency, isoDate: string): boolean {
  if (frequency === 'daily') return true
  return (frequency as { days: DayOfWeek[] }).days.includes(DOW[localDate(isoDate).getDay()])
}

// ── Streak + consistency computation ─────────────────────────────────────────

interface StreakResult {
  streak:       number
  consistency:  number       // 0–100
  graceUsed:    boolean
  newGraceReset: string | null
}

/**
 * Pure function — computes current_streak and consistency_30d_pct from logs.
 *
 * Grace-day rules:
 *   One missed scheduled day per rolling 7-day window is forgiven.
 *   The window resets lazily on read: if last_grace_reset is > 7 days old,
 *   grace_day_used_this_week reverts to false — no background cron needed.
 *   Rolling 7-day window (not calendar Mon–Sun) gives the user a personal
 *   7-day cycle regardless of when they started the habit.
 */
export function computeStreakAndConsistency(
  habit:     Habit,
  logs:      HabitLog[],
  today:     string,
  streakRow: HabitStreak | null,
): StreakResult {
  const logByDate = new Map(logs.map(l => [l.date, l]))
  const freq      = habit.frequency as HabitFrequency

  // Reset grace if the rolling 7-day window has expired
  let graceUsed    = streakRow?.grace_day_used_this_week ?? false
  let newGraceReset: string | null = streakRow?.last_grace_reset ?? null

  if (newGraceReset && daysBetween(newGraceReset, today) >= 7) {
    graceUsed     = false
    newGraceReset = today
  }

  // Walk backwards from today; count consecutive completed scheduled days
  let streak = 0
  let cursor = today
  for (let i = 0; i < 61; i++) {
    if (!isScheduledOn(freq, cursor)) {
      cursor = prevDay(cursor)
      continue
    }
    const log = logByDate.get(cursor)
    if (log?.completed) {
      streak++
    } else if (!graceUsed) {
      // First miss in this 7-day window — absorb it; streak survives
      graceUsed     = true
      newGraceReset = newGraceReset ?? today
      streak++
    } else {
      break  // second miss or grace already spent
    }
    cursor = prevDay(cursor)
  }

  // Consistency: % of scheduled days in the last 30 where the user completed
  let scheduled = 0
  let completed = 0
  let d = today
  for (let i = 0; i < 30; i++) {
    if (isScheduledOn(freq, d)) {
      scheduled++
      if (logByDate.get(d)?.completed) completed++
    }
    d = prevDay(d)
  }
  const consistency = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0

  return { streak, consistency, graceUsed, newGraceReset }
}

// ── Internal: fetch recent logs ───────────────────────────────────────────────

async function recentLogs(
  supabase: SupabaseClient,
  habitId:  string,
  today:    string,
): Promise<HabitLog[]> {
  const from = subtractDays(today, 60)
  const { data } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('habit_id', habitId)
    .gte('date', from)
    .order('date', { ascending: false })
  return (data ?? []) as HabitLog[]
}

// ── Public: streak refresh ────────────────────────────────────────────────────

/**
 * Recomputes and persists the streak for a habit.
 * Called after every check-off so the stored values stay accurate.
 */
export async function refreshStreak(
  supabase: SupabaseClient,
  habit:    Habit,
  today:    string,
): Promise<void> {
  const [logs, { data: existing }] = await Promise.all([
    recentLogs(supabase, habit.id, today),
    supabase.from('habit_streaks').select('*').eq('habit_id', habit.id).maybeSingle(),
  ])

  const { streak, consistency, graceUsed, newGraceReset } = computeStreakAndConsistency(
    habit,
    logs,
    today,
    (existing ?? null) as HabitStreak | null,
  )

  await supabase.from('habit_streaks').upsert({
    habit_id:                 habit.id,
    current_streak:           streak,
    consistency_30d_pct:      consistency,
    grace_day_used_this_week: graceUsed,
    last_grace_reset:         newGraceReset,
  })
}

// ── Public: CRUD ──────────────────────────────────────────────────────────────

export async function fetchActiveHabits(
  supabase: SupabaseClient,
): Promise<HabitWithStreak[]> {
  // Fetch habits and all streaks in parallel — both are scoped to the current
  // user by RLS, so fetching all streaks up front is safe and avoids a second
  // round-trip after we have the habit IDs.
  const [
    { data: habits, error },
    { data: streaks },
  ] = await Promise.all([
    supabase.from('habits').select('*').eq('archived', false).order('created_at', { ascending: true }),
    supabase.from('habit_streaks').select('*'),
  ])

  if (error || !habits?.length) return []

  const streakMap = new Map(
    ((streaks ?? []) as HabitStreak[]).map(s => [s.habit_id, s]),
  )

  return (habits as Habit[]).map(habit => ({
    habit,
    streak: streakMap.get(habit.id) ?? {
      habit_id:                 habit.id,
      current_streak:           0,
      consistency_30d_pct:      0,
      grace_day_used_this_week: false,
      last_grace_reset:         null,
    },
  }))
}

export async function fetchTodayHabits(
  supabase: SupabaseClient,
  date:     string,
): Promise<TodayHabit[]> {
  const all = await fetchActiveHabits(supabase)
  const scheduled = all.filter(({ habit }) =>
    isScheduledOn(habit.frequency as HabitFrequency, date),
  )

  if (!scheduled.length) return []

  const ids = scheduled.map(({ habit }) => habit.id)
  const { data: logs } = await supabase
    .from('habit_logs')
    .select('*')
    .in('habit_id', ids)
    .eq('date', date)

  const logMap = new Map(
    ((logs ?? []) as HabitLog[]).map(l => [l.habit_id, l]),
  )

  return scheduled.map(({ habit, streak }) => ({
    habit,
    log:    logMap.get(habit.id) ?? null,
    streak,
  }))
}

export async function createHabit(
  supabase: SupabaseClient,
  payload:  NewHabit,
): Promise<Habit> {
  const { data: habit, error } = await supabase
    .from('habits')
    .insert(payload)
    .select()
    .single()

  if (error || !habit) throw new Error(error?.message ?? 'Failed to create habit')

  // Seed the streak row immediately so downstream queries always find one
  await supabase.from('habit_streaks').insert({ habit_id: (habit as Habit).id })

  return habit as Habit
}

export async function updateHabit(
  supabase: SupabaseClient,
  id:       string,
  updates:  Partial<Pick<Habit, 'name' | 'type' | 'target_value' | 'frequency'>>,
): Promise<Habit> {
  const { data, error } = await supabase
    .from('habits')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to update habit')
  return data as Habit
}

/** Sets archived = true. Preserves all habit_logs history. */
export async function archiveHabit(
  supabase: SupabaseClient,
  id:       string,
): Promise<void> {
  const { error } = await supabase.from('habits').update({ archived: true }).eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Upsert today's log entry.
 * Conflicts on (habit_id, date) — safe to call multiple times for the same day.
 */
export async function upsertHabitLog(
  supabase:  SupabaseClient,
  habitId:   string,
  date:      string,
  value:     number | null,
  completed: boolean,
): Promise<HabitLog> {
  const { data, error } = await supabase
    .from('habit_logs')
    .upsert(
      { habit_id: habitId, date, value, completed },
      { onConflict: 'habit_id,date' },
    )
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to log habit')
  return data as HabitLog
}
