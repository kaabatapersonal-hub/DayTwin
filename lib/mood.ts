import type { SupabaseClient } from '@supabase/supabase-js'
import type { MoodLog, MoodPeriod, NewMoodLog } from '@/types'

/**
 * Returns the mood period for the current local time.
 * Boundaries chosen to align with natural daily rhythms:
 *   morning  → before noon
 *   midday   → 12:00–15:59 (4pm)
 *   evening  → 16:00 onwards
 */
export function getCurrentPeriod(): MoodPeriod {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 16) return 'midday'
  return 'evening'
}

/** Fetch all mood logs for today (may include morning, midday, and/or evening). */
export async function fetchTodayMoods(
  supabase: SupabaseClient,
  date:     string,
): Promise<MoodLog[]> {
  // logged_at is a timestamptz — filter by the calendar day using >= and <
  const nextDay = new Date(`${date}T00:00:00`)
  nextDay.setDate(nextDay.getDate() + 1)
  const nextDayISO = nextDay.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('mood_logs')
    .select('*')
    .gte('logged_at', `${date}T00:00:00`)
    .lt('logged_at',  `${nextDayISO}T00:00:00`)
    .order('logged_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch mood logs: ${error.message}`)
  return (data ?? []) as MoodLog[]
}

/** Log a mood + optional energy value for a given period. */
export async function logMood(
  supabase: SupabaseClient,
  payload:  NewMoodLog,
): Promise<MoodLog> {
  const { data, error } = await supabase
    .from('mood_logs')
    .insert({ ...payload, logged_at: new Date().toISOString() })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to log mood')
  return data as MoodLog
}

/** True if the given period has already been logged in today's mood list. */
export function isPeriodLogged(moods: MoodLog[], period: MoodPeriod): boolean {
  return moods.some(m => m.period === period)
}
