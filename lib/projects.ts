import type { SupabaseClient } from '@supabase/supabase-js'
import type { Project, NewProject, Task } from '@/types'

/** Fetch all non-archived projects for the current user. */
export async function fetchProjects(
  supabase: SupabaseClient,
  filter: 'active' | 'all' = 'all',
): Promise<Project[]> {
  let query = supabase
    .from('projects')
    .select('*')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  if (filter === 'active') {
    query = supabase
      .from('projects')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch projects: ${error.message}`)
  return (data ?? []) as Project[]
}

/** Fetch projects linked to a specific goal. */
export async function fetchProjectsByGoal(
  supabase: SupabaseClient,
  goalId:   string,
): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('goal_id', goalId)
    .neq('status', 'archived')
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch projects: ${error.message}`)
  return (data ?? []) as Project[]
}

/** Fetch a single project by ID. Returns null if not found. */
export async function fetchProject(
  supabase: SupabaseClient,
  id:       string,
): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch project: ${error.message}`)
  return data as Project | null
}

/**
 * Fetch all tasks linked to a project, sorted by date desc then creation order.
 * Tasks are fetched from the tasks table using project_id — no join needed.
 */
export async function fetchProjectTasks(
  supabase:  SupabaseClient,
  projectId: string,
): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: false })

  if (error) throw new Error(`Failed to fetch project tasks: ${error.message}`)
  return (data ?? []) as Task[]
}

export async function createProject(
  supabase: SupabaseClient,
  payload:  NewProject,
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert(payload)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create project')
  return data as Project
}

export async function updateProject(
  supabase: SupabaseClient,
  id:       string,
  updates:  Partial<Pick<Project, 'title' | 'goal_id' | 'status'>>,
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to update project')
  return data as Project
}

export async function archiveProject(
  supabase: SupabaseClient,
  id:       string,
): Promise<void> {
  const { error } = await supabase.from('projects').update({ status: 'archived' }).eq('id', id)
  if (error) throw new Error(error.message)
}
