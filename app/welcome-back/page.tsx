import { redirect }   from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchTodayTasks } from '@/lib/tasks'
import { WelcomeBack } from '@/components/WelcomeBack'
import { todayISO }    from '@/lib/format'

interface Props {
  searchParams: Promise<{ days?: string }>
}

/**
 * Welcome Back page — shown when the user hasn't opened the app in 3+ days.
 *
 * Rendered as a separate route (not a modal) so the return to Today feels
 * like a fresh start. The `days` param is passed from today/page.tsx redirect
 * and drives the copy ("You've been away N days").
 *
 * No auth guard needed: if the user hits this page without a session they'll
 * land on the empty WelcomeBack screen and the CTA redirects to /today anyway.
 */
export default async function WelcomeBackPage({ searchParams }: Props) {
  const { days: daysParam } = await searchParams
  const daysAway = parseInt(daysParam ?? '3', 10)

  const date     = todayISO()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/today')
  }

  const [tasks, toneRes] = await Promise.all([
    fetchTodayTasks(supabase, date).catch(() => []),
    supabase.from('users').select('tone_preference').eq('id', user.id).maybeSingle(),
  ])

  const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const topTask = tasks
    .filter(t => !t.completed)
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1))[0]

  const tonePreference = (toneRes.data?.tone_preference ?? 'warm') as 'warm' | 'direct' | 'hype'

  return (
    <WelcomeBack
      daysAway={daysAway}
      topTaskTitle={topTask?.title ?? null}
      tonePreference={tonePreference}
    />
  )
}
