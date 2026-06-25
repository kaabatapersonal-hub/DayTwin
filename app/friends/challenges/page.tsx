import { createClient }            from '@/lib/supabase/server'
import { redirect }                 from 'next/navigation'
import { fetchMyChallenges, fetchCompletedChallenges } from '@/lib/challenges'
import { ChallengesListScreen }     from '@/components/challenges/ChallengesListScreen'

export default async function ChallengesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/today')

  const [active, past] = await Promise.all([
    fetchMyChallenges(supabase),
    fetchCompletedChallenges(supabase),
  ])

  return (
    <ChallengesListScreen
      initialActive={active}
      initialPast={past}
      myUserId={user.id}
    />
  )
}
