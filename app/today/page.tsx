import { redirect }               from 'next/navigation'
import { createClient }           from '@/lib/supabase/server'
import { fetchTodayTasks }        from '@/lib/tasks'
import { fetchTodayIntention }    from '@/lib/intentions'
import { fetchTodayHabits }       from '@/lib/habits'
import { fetchUserProfile, isWelcomeBackDue, daysSinceLastActive } from '@/lib/users'
import { fetchTodayScore }        from '@/lib/scores'
import { fetchTodayReflection }   from '@/lib/reflections'
import { fetchTodayMoods }        from '@/lib/mood'
import { fetchCoachData }         from '@/lib/coach'
import { fetchActiveFocusSession } from '@/lib/focus-sessions'
import { TodayScreen }            from '@/components/today/TodayScreen'
import { todayISO }               from '@/lib/format'

export default async function TodayPage() {
  const date     = todayISO()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <TodayScreen
        initialTasks={[]}
        initialIntention={null}
        initialTodayHabits={[]}
        date={date}
        initialScore={0}
        initialReflection={null}
        initialTodayMoods={[]}
        coachData={{ preferredName: null, focusHoursWeek: 0, goalTitle: null, goalProgressPct: null, topTaskTitle: null }}
        activeGoalId={null}
        initialActiveFocusSession={null}
      />
    )
  }

  // Profile first — needed for Welcome Back check + coach name
  const profile = await fetchUserProfile(supabase).catch(() => null)

  if (profile && isWelcomeBackDue(profile.last_active_at)) {
    const days = daysSinceLastActive(profile.last_active_at!)
    redirect(`/welcome-back?days=${days}`)
  }

  const [tasks, intention, todayHabits, todayScore, reflection, todayMoods, activeFocusSession] =
    await Promise.all([
      fetchTodayTasks(supabase, date),
      fetchTodayIntention(supabase, date),
      fetchTodayHabits(supabase, date),
      fetchTodayScore(supabase, date),
      fetchTodayReflection(supabase, date),
      fetchTodayMoods(supabase, date),
      fetchActiveFocusSession(supabase),  // restore focus session if app was reopened mid-session
    ])

  const coachData = await fetchCoachData(
    supabase, date, profile?.preferred_name ?? null, tasks,
  ).catch(() => ({
    preferredName: null, focusHoursWeek: 0,
    goalTitle: null, goalProgressPct: null, topTaskTitle: null,
  }))

  const { data: activeGoalRow } = await supabase
    .from('goals')
    .select('id')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <TodayScreen
      initialTasks={tasks}
      initialIntention={intention}
      initialTodayHabits={todayHabits}
      date={date}
      initialScore={todayScore?.score_pct ?? 0}
      initialReflection={reflection}
      initialTodayMoods={todayMoods}
      coachData={coachData}
      activeGoalId={activeGoalRow?.id ?? null}
      initialActiveFocusSession={activeFocusSession}
    />
  )
}
