import type { SupabaseClient } from '@supabase/supabase-js'
import type { CoachData, Task } from '@/types'
import { getWeekStart } from '@/lib/format'

/**
 * Compute the morning coach card data from real Supabase data.
 * Zero API calls — all computed from the user's own stored records.
 * Returns graceful nulls for missing data rather than throwing.
 *
 * Data sources:
 *   - preferredName    → users.preferred_name
 *   - focusHoursWeek   → SUM(time_entries.duration_seconds) for Mon–today / 3600
 *   - goalTitle        → most recently created active goal
 *   - goalProgressPct  → that goal's progress_pct (manually set by user)
 *   - topTaskTitle     → highest-priority incomplete task for today
 */
export async function fetchCoachData(
  supabase:      SupabaseClient,
  date:          string,
  preferredName: string | null,
  todayTasks:    Task[],       // already fetched for Today — reuse, don't re-query
): Promise<CoachData> {
  // ── Focus hours this calendar week ───────────────────────────────────────────
  const weekStart = getWeekStart(date)

  const { data: timeData } = await supabase
    .from('time_entries')
    .select('duration_seconds')
    .gte('start_at', `${weekStart}T00:00:00`)
    .not('duration_seconds', 'is', null)

  const totalSeconds = (timeData ?? []).reduce(
    (sum, row) => sum + (row.duration_seconds ?? 0), 0,
  )
  const focusHoursWeek = Math.round((totalSeconds / 3600) * 10) / 10  // one decimal

  // ── Most recently active goal ─────────────────────────────────────────────────
  const { data: goalData } = await supabase
    .from('goals')
    .select('title, progress_pct')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const goalTitle       = goalData?.title       ?? null
  const goalProgressPct = goalData?.progress_pct ?? null

  // ── Top task: highest-priority incomplete task for today ──────────────────────
  const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const topTask = todayTasks
    .filter(t => !t.completed)
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1))[0]

  return {
    preferredName,
    focusHoursWeek,
    goalTitle,
    goalProgressPct: typeof goalProgressPct === 'number' ? goalProgressPct : null,
    topTaskTitle: topTask?.title ?? null,
  }
}

