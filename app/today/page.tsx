import { createClient }         from '@/lib/supabase/server'
import { fetchTodayTasks }      from '@/lib/tasks'
import { fetchTodayIntention }  from '@/lib/intentions'
import { TodayScreen }          from '@/components/today/TodayScreen'
import { todayISO }             from '@/lib/format'

/**
 * Server Component entry point for the Today screen.
 *
 * Fetches today's tasks and intention server-side so the first paint
 * has real data (no loading spinner). If the user has no session yet
 * (first-ever visit before anonymous auth initialises on the client),
 * we pass empty state — Providers will create the session client-side
 * and the user can start adding tasks immediately.
 */
export default async function TodayPage() {
  const date     = todayISO()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Anonymous session is created client-side by Providers on first load.
    // Render with empty state so the page is immediately usable.
    return (
      <TodayScreen
        initialTasks={[]}
        initialIntention={null}
        date={date}
      />
    )
  }

  const [tasks, intention] = await Promise.all([
    fetchTodayTasks(supabase, date),
    fetchTodayIntention(supabase, date),
  ])

  return (
    <TodayScreen
      initialTasks={tasks}
      initialIntention={intention}
      date={date}
    />
  )
}
