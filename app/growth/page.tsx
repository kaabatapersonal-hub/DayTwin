import { createClient }            from '@/lib/supabase/server'
import { fetchGoals }              from '@/lib/goals'
import { fetchProjects }           from '@/lib/projects'
import { fetchAllReflections }     from '@/lib/reflections'
import { fetchWeeklySummary }      from '@/lib/time-entries'
import { fetchWeeklyReviews, fetchHeatmapData } from '@/lib/weekly-review'
import { getWeekStart, todayISO }  from '@/lib/format'
import { GrowthScreen }            from '@/components/growth/GrowthScreen'
import type { UserBadge, HeatmapDay } from '@/types'

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
        initialReviews={[]}
        initialBadges={[]}
        heatmapData={[]}
        tonePreference="warm"
      />
    )
  }

  // Fetch tone preference for milestone copy personalisation
  const { data: userRow } = await supabase
    .from('users')
    .select('tone_preference')
    .eq('id', user.id)
    .maybeSingle()

  const tonePreference = (userRow?.tone_preference ?? 'warm') as 'warm' | 'direct' | 'hype'

  const [
    goals, projects, reflections, weeklySummary,
    reviews, heatmapRaw, badgesRaw,
  ] = await Promise.all([
    fetchGoals(supabase, 'all'),
    fetchProjects(supabase, 'all'),
    fetchAllReflections(supabase),
    fetchWeeklySummary(supabase, weekStart),
    fetchWeeklyReviews(supabase),
    fetchHeatmapData(supabase, user.id),
    supabase
      .from('user_badges')
      .select('user_id, badge_id, earned_at, badge:badges(id, name, description, icon, rarity, criteria)')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false })
      .then(({ data }) => (data ?? []) as unknown as UserBadge[]),
  ])

  const projectCountsByGoal: Record<string, number> = {}
  for (const p of projects) {
    if (p.goal_id) {
      projectCountsByGoal[p.goal_id] = (projectCountsByGoal[p.goal_id] ?? 0) + 1
    }
  }

  const heatmapData: HeatmapDay[] = (heatmapRaw ?? []).map(
    (r: { date: string; score_pct: number }) => ({ date: r.date, score_pct: r.score_pct }),
  )

  return (
    <GrowthScreen
      initialGoals={goals}
      projectCountsByGoal={projectCountsByGoal}
      reflections={reflections}
      weeklySummary={weeklySummary}
      initialReviews={reviews}
      initialBadges={badgesRaw}
      heatmapData={heatmapData}
      tonePreference={tonePreference}
    />
  )
}
