import { createClient }        from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { fetchChallengeById } from '@/lib/challenges'
import { ChallengeDetail }    from '@/components/challenges/ChallengeDetail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ChallengeDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/onboarding')

  const data = await fetchChallengeById(supabase, id)
  if (!data) notFound()

  // Only participants and the invitee should reach this page.
  // fetchChallengeById already gates on RLS so an unauthorized user
  // gets null → 404 above.
  return <ChallengeDetail data={data} myUserId={user.id} />
}
