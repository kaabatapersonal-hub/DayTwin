import { NextResponse }  from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/users/export
 *
 * Returns a JSON blob of all user-owned data for download.
 * Future Me messages are stored in IndexedDB (device-only) and cannot be
 * exported from the server — a note is included in the response.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = user.id

  // habit_streaks has no user_id column — join via habits first, then fetch streak rows.
  const { data: userHabits } = await supabase
    .from('habits')
    .select('id')
    .eq('user_id', uid)

  const habitIds = (userHabits ?? []).map(h => h.id)

  const [
    profileRes, settingsRes, tasksRes, intentionsRes,
    habitsRes, habitLogsRes, habitStreaksRes,
    goalsRes, projectsRes, reflectionsRes, moodLogsRes,
    dailyScoresRes, timeEntriesRes, reviewsRes, badgesRes,
    friendsRes,
  ] = await Promise.all([
    supabase.from('users').select('*').eq('id', uid).maybeSingle(),
    supabase.from('user_settings').select('*').eq('user_id', uid).maybeSingle(),
    supabase.from('tasks').select('*').eq('user_id', uid).order('created_at'),
    supabase.from('intentions').select('*').eq('user_id', uid).order('date'),
    supabase.from('habits').select('*').eq('user_id', uid).order('created_at'),
    supabase.from('habit_logs').select('*').eq('user_id', uid).order('date'),
    habitIds.length > 0
      ? supabase.from('habit_streaks').select('*').in('habit_id', habitIds)
      : Promise.resolve({ data: [] }),
    supabase.from('goals').select('*').eq('user_id', uid).order('created_at'),
    supabase.from('projects').select('*').eq('user_id', uid).order('created_at'),
    supabase.from('reflections').select('*').eq('user_id', uid).order('date'),
    supabase.from('mood_logs').select('*').eq('user_id', uid).order('logged_at'),
    supabase.from('daily_scores').select('*').eq('user_id', uid).order('date'),
    supabase.from('time_entries').select('*').eq('user_id', uid).order('start_at'),
    supabase.from('weekly_reviews').select('*').eq('user_id', uid).order('week_start'),
    supabase.from('user_badges').select('*, badge:badges(*)').eq('user_id', uid),
    supabase.from('friendships').select('*')
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`),
  ])

  const exportedAt = new Date().toISOString()

  const payload = {
    exported_at: exportedAt,
    _note: 'Future Me messages are stored on-device only and are not included in this export.',
    profile:        profileRes.data,
    settings:       settingsRes.data,
    tasks:          tasksRes.data ?? [],
    intentions:     intentionsRes.data ?? [],
    habits:         habitsRes.data ?? [],
    habit_logs:     habitLogsRes.data ?? [],
    habit_streaks:  habitStreaksRes.data ?? [],
    goals:          goalsRes.data ?? [],
    projects:       projectsRes.data ?? [],
    reflections:    reflectionsRes.data ?? [],
    mood_logs:      moodLogsRes.data ?? [],
    daily_scores:   dailyScoresRes.data ?? [],
    time_entries:   timeEntriesRes.data ?? [],
    weekly_reviews: reviewsRes.data ?? [],
    badges:         badgesRes.data ?? [],
    friendships:    friendsRes.data ?? [],
  }

  const filename = `daytwin-export-${exportedAt.slice(0, 10)}.json`

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type':        'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
