/**
 * Supabase Edge Function: weekly-review
 *
 * Runs every Sunday to generate cached weekly reviews for all users.
 * Also accepts manual POST calls with { user_id, week_start } for on-demand
 * generation from the DayTwin admin dashboard (not exposed to clients).
 *
 * pg_cron schedule (run in Supabase SQL editor after deploying):
 *   SELECT cron.schedule(
 *     'generate-weekly-reviews',
 *     '0 0 * * 0',   -- Sunday at 00:00 UTC
 *     $$
 *       SELECT net.http_post(
 *         url    := '[YOUR_PROJECT_URL]/functions/v1/weekly-review',
 *         headers := jsonb_build_object('Authorization', 'Bearer [SERVICE_ROLE_KEY]'),
 *         body   := '{"scheduled": true}'::jsonb
 *       );
 *     $$
 *   );
 *
 * ai_summary is intentionally never set — that's a V2 Pro feature.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/** Day names indexed by JS Date.getDay() (0 = Sunday). */
const DOW_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

type HabitFrequency = 'daily' | { days: string[] }

function isScheduled(frequency: HabitFrequency, isoDate: string): boolean {
  if (frequency === 'daily') return true
  const dow = new Date(`${isoDate}T00:00:00`).getDay()
  return (frequency as { days: string[] }).days.includes(DOW_NAMES[dow])
}

function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${weekStart}T00:00:00`)
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

/** Returns the Monday of the current week in UTC. */
function currentWeekStart(): string {
  const d   = new Date()
  const dow = d.getUTCDay()
  const diff = dow === 0 ? -6 : 1 - dow   // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

async function computeAndUpsert(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  weekStart: string,
): Promise<void> {
  const dates   = weekDates(weekStart)
  const weekEnd = dates[6]

  const [
    { data: tasks },
    { data: habits },
    { data: habitLogs },
    { data: timeEntries },
    { data: scores },
  ] = await Promise.all([
    supabase.from('tasks').select('date, completed').eq('user_id', userId).gte('date', weekStart).lte('date', weekEnd),
    supabase.from('habits').select('id, frequency').eq('user_id', userId).eq('archived', false),
    supabase.from('habit_logs').select('habit_id, date, completed').eq('user_id', userId).gte('date', weekStart).lte('date', weekEnd),
    supabase.from('time_entries').select('duration_seconds').eq('user_id', userId).gte('start_at', `${weekStart}T00:00:00+00:00`).lte('start_at', `${weekEnd}T23:59:59+00:00`).not('duration_seconds', 'is', null),
    supabase.from('daily_scores').select('date, score_pct').eq('user_id', userId).gte('date', weekStart).lte('date', weekEnd),
  ])

  const tasksCompleted = (tasks ?? []).filter((t: { completed: boolean }) => t.completed).length

  let scheduledTotal = 0, completedTotal = 0
  for (const habit of (habits ?? []) as { id: string; frequency: HabitFrequency }[]) {
    for (const date of dates) {
      if (isScheduled(habit.frequency, date)) {
        scheduledTotal++
        const log = (habitLogs ?? []).find((l: { habit_id: string; date: string; completed: boolean }) => l.habit_id === habit.id && l.date === date)
        if (log?.completed) completedTotal++
      }
    }
  }
  const habitsPct = scheduledTotal > 0 ? Math.round((completedTotal / scheduledTotal) * 100) : 0

  const totalSeconds = (timeEntries ?? []).reduce(
    (sum: number, t: { duration_seconds: number | null }) => sum + (t.duration_seconds ?? 0), 0,
  )
  const focusHours = Math.floor((totalSeconds / 3600) * 10) / 10

  const scoreRows = (scores ?? []) as { date: string; score_pct: number }[]
  let bestDay = null, worstDay = null
  if (scoreRows.length > 0) {
    const sorted = [...scoreRows].sort((a, b) => a.score_pct - b.score_pct)
    worstDay = sorted[0].date
    bestDay  = sorted[sorted.length - 1].date
    if (worstDay === bestDay) worstDay = null
  }

  await supabase.from('weekly_reviews').upsert(
    { user_id: userId, week_start: weekStart, tasks_completed: tasksCompleted, habits_pct: habitsPct, focus_hours: focusHours, best_day: bestDay, worst_day: worstDay, ai_summary: null },
    { onConflict: 'user_id,week_start' },
  )
}

Deno.serve(async (req: Request) => {
  // Only allow POST (pg_cron uses POST via net.http_post)
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  })

  let body: { scheduled?: boolean; user_id?: string; week_start?: string } = {}
  try { body = await req.json() } catch { /* empty body is fine for scheduled runs */ }

  const weekStart = body.week_start ?? currentWeekStart()

  if (body.user_id) {
    // On-demand: compute for a single user
    await computeAndUpsert(supabase, body.user_id, weekStart)
    return new Response(JSON.stringify({ ok: true, user_id: body.user_id, week_start: weekStart }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Scheduled run: compute for all users
  const { data: users } = await supabase.from('users').select('id').eq('is_anonymous', false)

  let count = 0
  for (const user of (users ?? []) as { id: string }[]) {
    await computeAndUpsert(supabase, user.id, weekStart)
    count++
  }

  return new Response(JSON.stringify({ ok: true, processed: count, week_start: weekStart }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
