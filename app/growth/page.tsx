import { createClient }       from '@/lib/supabase/server'
import { fetchGoals }         from '@/lib/goals'
import { fetchProjects }      from '@/lib/projects'
import { fetchAllReflections } from '@/lib/reflections'
import { GrowthScreen }       from '@/components/growth/GrowthScreen'

/**
 * Server Component entry point for the Growth tab.
 * Fetches goals, projects, and all reflections in parallel so GrowthScreen
 * can show per-goal project counts and the Evidence of Growth timeline
 * without extra client-side requests.
 */
export default async function GrowthPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <GrowthScreen initialGoals={[]} projectCountsByGoal={{}} reflections={[]} />
  }

  const [goals, projects, reflections] = await Promise.all([
    fetchGoals(supabase, 'all'),
    fetchProjects(supabase, 'all'),
    fetchAllReflections(supabase),
  ])

  // Build { goalId → count } map from projects
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
    />
  )
}
