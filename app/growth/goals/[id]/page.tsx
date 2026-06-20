import { notFound }          from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { fetchGoal }         from '@/lib/goals'
import { fetchProjectsByGoal } from '@/lib/projects'
import { GoalDetail }        from '@/components/growth/GoalDetail'

interface GoalPageProps {
  params: Promise<{ id: string }>
}

export default async function GoalPage({ params }: GoalPageProps) {
  const { id }   = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [goal, projects] = await Promise.all([
    fetchGoal(supabase, id),
    fetchProjectsByGoal(supabase, id),
  ])

  if (!goal) notFound()

  return <GoalDetail initialGoal={goal} initialProjects={projects} />
}
