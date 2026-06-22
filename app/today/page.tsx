import { redirect }              from 'next/navigation'
import { createClient }          from '@/lib/supabase/server'
import { fetchTodayTasks }       from '@/lib/tasks'
import { fetchTodayIntention }   from '@/lib/intentions'
import { fetchTodayHabits }      from '@/lib/habits'
import { fetchUserProfile, isWelcomeBackDue, daysSinceLastActive } from '@/lib/users'
import { fetchTodayScore }       from '@/lib/scores'
import { fetchTodayReflection }  from '@/lib/reflections'
import { fetchTodayMoods }       from '@/lib/mood'
import { fetchCoachData }        from '@/lib/coach'
import { TodayScreen }           from '@/components/today/TodayScreen'
import { todayISO }              from '@/lib/format'

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
      />
    )
  }

  // Fetch profile first — needed for welcome back check + coach name
  const profile = await fetchUserProfile(supabase).catch(() => null)

  // Redirect to welcome-back if the user has been away 3+ days
  if (profile && isWelcomeBackDue(profile.last_active_at)) {
    const days = daysSinceLastActive(profile.last_active_at!)
    redirect(`/welcome-back?days=${days}`)
  }

  // Fetch all remaining data in parallel once we know we're rendering Today
  const [tasks, intention, todayHabits, todayScore, reflection, todayMoods] = await Promise.all([
    fetchTodayTasks(supabase, date),
    fetchTodayIntention(supabase, date),
    fetchTodayHabits(supabase, date),
    fetchTodayScore(supabase, date),
    fetchTodayReflection(supabase, date),
    fetchTodayMoods(supabase, date),
  ])

  // Coach data reuses today's tasks (already fetched) to avoid a re-query
  const coachData = await fetchCoachData(
    supabase,
    date,
    profile?.preferred_name ?? null,
    tasks,
  ).catch(() => ({
    preferredName: null,
    focusHoursWeek: 0,
    goalTitle: null,
    goalProgressPct: null,
    topTaskTitle: null,
  }))

  // Most recently created active goal for the Hard Day overlay
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
    />
  )
}
