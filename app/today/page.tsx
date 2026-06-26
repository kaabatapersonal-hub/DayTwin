import { cache }                   from 'react'
import { redirect }               from 'next/navigation'
import { createClient }           from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
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
import type { MotivationCard }    from '@/types'

// cache() deduplicates calls within a single render pass — if any child
// Server Component re-requests the same data, only one DB round-trip fires.
const getCachedProfile      = cache(fetchUserProfile)
const getCachedTasks        = cache(fetchTodayTasks)
const getCachedIntention    = cache(fetchTodayIntention)
const getCachedHabits       = cache(fetchTodayHabits)
const getCachedScore        = cache(fetchTodayScore)
const getCachedReflection   = cache(fetchTodayReflection)
const getCachedMoods        = cache(fetchTodayMoods)
const getCachedFocusSession = cache(fetchActiveFocusSession)

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
        tonePreference="warm"
        userId=""
        initialSparksBalance={0}
      />
    )
  }

  // Profile first — needed for Welcome Back check + coach name
  const profile = await getCachedProfile(supabase).catch(() => null)

  if (profile && isWelcomeBackDue(profile.last_active_at)) {
    const days = daysSinceLastActive(profile.last_active_at!)
    redirect(`/welcome-back?days=${days}`)
  }

  const tonePreference = (profile?.tone_preference ?? 'warm') as 'warm' | 'direct' | 'hype'

  const [tasks, intention, todayHabits, todayScore, reflection, todayMoods, activeFocusSession] =
    await Promise.all([
      getCachedTasks(supabase, date),
      getCachedIntention(supabase, date),
      getCachedHabits(supabase, date),
      getCachedScore(supabase, date),
      getCachedReflection(supabase, date),
      getCachedMoods(supabase, date),
      getCachedFocusSession(supabase),  // restore focus session if app was reopened mid-session
    ])

  const coachData = await fetchCoachData(
    supabase, date, profile?.preferred_name ?? null, tasks,
  ).catch(() => ({
    preferredName: null, focusHoursWeek: 0,
    goalTitle: null, goalProgressPct: null, topTaskTitle: null,
  }))

  const [activeGoalRow, settingsRow] = await Promise.all([
    supabase
      .from('goals')
      .select('id')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(r => r.data),
    supabase
      .from('user_settings')
      .select('active_motivation_pack_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(r => r.data),
  ])

  // Compute today's motivation card (deterministic from date, rotates daily)
  let motivationCard: MotivationCard | null = null
  if (settingsRow?.active_motivation_pack_id) {
    const { data: pack } = await supabase
      .from('motivation_packs')
      .select('content')
      .eq('id', settingsRow.active_motivation_pack_id)
      .single()
    if (pack?.content) {
      const cards = pack.content as MotivationCard[]
      const d = new Date(date)
      const dayOfYear = Math.floor(
        (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000
      )
      motivationCard = cards[dayOfYear % cards.length] ?? null
    }
  }

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
      tonePreference={tonePreference}
      userId={user.id}
      initialSparksBalance={profile?.sparks_balance ?? 0}
      motivationCard={motivationCard}
    />
  )
}
