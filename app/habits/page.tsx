import { createClient }       from '@/lib/supabase/server'
import { fetchActiveHabits }  from '@/lib/habits'
import { HabitsScreen }       from '@/components/habits/HabitsScreen'

/** Server Component entry point for the Habits tab. */
export default async function HabitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const habits = user ? await fetchActiveHabits(supabase) : []

  return <HabitsScreen initialHabits={habits} />
}
