import { createClient }         from '@/lib/supabase/server'
import { fetchTodayTasks }      from '@/lib/tasks'
import { fetchTodayIntention }  from '@/lib/intentions'
import { fetchTodayHabits }     from '@/lib/habits'
import { TodayScreen }          from '@/components/today/TodayScreen'
import { todayISO }             from '@/lib/format'

/**
 * Server Component entry point for the Today screen.
 *
 * Fetches tasks, intention, and today's scheduled habits in parallel
 * so the first paint has real data. If the session isn't established yet
 * (first-ever visit, anon auth initialising client-side), all three pass
 * empty state — Providers create the session within milliseconds.
 */
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
      />
    )
  }

  const [tasks, intention, todayHabits] = await Promise.all([
    fetchTodayTasks(supabase, date),
    fetchTodayIntention(supabase, date),
    fetchTodayHabits(supabase, date),
  ])

  return (
    <TodayScreen
      initialTasks={tasks}
      initialIntention={intention}
      initialTodayHabits={todayHabits}
      date={date}
    />
  )
}
