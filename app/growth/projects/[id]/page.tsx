import { notFound }          from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { fetchProject, fetchProjectTasks } from '@/lib/projects'
import { fetchGoal }         from '@/lib/goals'
import { ProjectDetail }     from '@/components/growth/ProjectDetail'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id }   = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [project, tasks] = await Promise.all([
    fetchProject(supabase, id),
    fetchProjectTasks(supabase, id),
  ])

  if (!project) notFound()

  const goal = project.goal_id
    ? await fetchGoal(supabase, project.goal_id)
    : null

  return <ProjectDetail initialProject={project} initialTasks={tasks} initialGoal={goal} />
}
