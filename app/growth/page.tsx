import { createClient }        from '@/lib/supabase/server'
import { fetchGoals }          from '@/lib/goals'
import { fetchProjects }       from '@/lib/projects'
import { fetchAllReflections } from '@/lib/reflections'
import { fetchWeeklySummary }  from '@/lib/time-entries'
import { getWeekStart, todayISO } from '@/lib/format'
import { GrowthScreen }        from '@/components/growth/GrowthScreen'

export default async function GrowthPage() {
  const supabase  = await createClient()
  const date      = todayISO()
  const weekStart = getWeekStart(date)

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <GrowthScreen
        initialGoals={[]}
        projectCountsByGoal={{}}
        reflections={[]}
        weeklySummary={[]}
      />
    )
  }

  const [goals, projects, reflections, weeklySummary] = await Promise.all([
    fetchGoals(supabase, 'all'),
    fetchProjects(supabase, 'all'),
    fetchAllReflections(supabase),
    fetchWeeklySummary(supabase, weekStart),
  ])

  const projectCountsByGoal: Record<string, number> = {}
  for (const p of projects) {
    if (p.goal_id) {
      projectCountsByGoal[p.goal_id] = (projectCountsByGoal[p.goal_id] ?? 0) + 1
    }
  }

  return (
    <GrowthScreen
      initialGoals={goals}
      projectCountsByGoal={projectCountsByGoal}
      reflections={reflections}
      weeklySummary={weeklySummary}
    />
  )
}
