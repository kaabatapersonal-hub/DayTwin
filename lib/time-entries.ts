import type { SupabaseClient } from '@supabase/supabase-js'
import type { TimeEntry, TrackingCategory, TimeCategorySummary } from '@/types'

/**
 * Fetch the currently-running time entry (end_at IS NULL), or null if no timer is active.
 * Used on app startup to restore a timer that was running before the app was closed.
 */
export async function fetchActiveEntry(
  supabase: SupabaseClient,
): Promise<TimeEntry | null> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .is('end_at', null)
    .order('start_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch active entry: ${error.message}`)
  return data as TimeEntry | null
}

/**
 * Insert a new time entry row. start_at is set by the DB default (now()) so the
 * timestamp is server-side — never trusted from the client for anti-cheat purposes.
 */
export async function startEntry(
  supabase:  SupabaseClient,
  category:  TrackingCategory,
  taskId:    string | null = null,
): Promise<TimeEntry> {
  const { data, error } = await supabase
    .from('time_entries')
    .insert({ category, task_id: taskId })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to start time entry')
  return data as TimeEntry
}

/**
 * Fetch completed time entries for a calendar week, grouped and summed by category.
 * Only includes rows with duration_seconds set (i.e., stopped entries).
 * Used for the "Where your time went this week" section in the Growth tab.
 *
 * Matches the coach card query in lib/coach.ts — both use start_at for the week filter
 * and duration_seconds for the total, so they'll always be consistent.
 */
export async function fetchWeeklySummary(
  supabase:  SupabaseClient,
  weekStart: string,  // ISO date string of the Monday that starts this week
): Promise<TimeCategorySummary[]> {
  // Filter from Monday 00:00 to the following Monday 00:00 (exclusive)
  const nextMonday = new Date(`${weekStart}T00:00:00`)
  nextMonday.setDate(nextMonday.getDate() + 7)
  const weekEnd = nextMonday.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('time_entries')
    .select('category, duration_seconds')
    .gte('start_at', `${weekStart}T00:00:00`)
    .lt('start_at',  `${weekEnd}T00:00:00`)
    .not('duration_seconds', 'is', null)

  if (error) throw new Error(`Failed to fetch weekly summary: ${error.message}`)

  // Aggregate by category in memory — simpler than GROUP BY and avoids a stored procedure
  const totals = new Map<TrackingCategory, number>()
  for (const row of (data ?? [])) {
    const cat = row.category as TrackingCategory
    totals.set(cat, (totals.get(cat) ?? 0) + (row.duration_seconds ?? 0))
  }

  return Array.from(totals.entries())
    .map(([category, total_seconds]) => ({ category, total_seconds }))
    .sort((a, b) => b.total_seconds - a.total_seconds)  // highest first
}
