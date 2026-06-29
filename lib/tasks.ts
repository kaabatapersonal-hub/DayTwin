import type { SupabaseClient } from '@supabase/supabase-js'
import type { Task, NewTask } from '@/types'

/**
 * Fetch all tasks for a given date.
 * Time-blocked tasks (non-null start_time) sort first by start time;
 * quick tasks (null start_time) sort last — Postgres NULLS LAST default.
 */
export async function fetchTodayTasks(
  supabase: SupabaseClient,
  date: string,
): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('date', date)
    .order('start_time', { ascending: true, nullsFirst: false })

  if (error) throw new Error(`Failed to fetch tasks: ${error.message}`)
  return (data as Task[]) ?? []
}

/**
 * Create a new task.
 * Calls getUser() first to ensure the token is fresh — avoids JWT-expired errors
 * on the first mutation after a long idle period.
 */
export async function createTask(
  supabase: SupabaseClient,
  task: NewTask,
): Promise<Task> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Session expired — please reload the app')

  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single()

  if (error) throw new Error(`Failed to create task: ${error.message}`)
  return data as Task
}

/**
 * Update any subset of a task's fields.
 * Used for both editing task details and toggling completion status.
 *
 * Calls getUser() first to ensure the access token is refreshed before the
 * mutation fires — avoids a stale token causing RLS to see auth.uid() = null
 * and return 0 rows. Uses maybeSingle() so a missing row surfaces as a clear
 * error rather than a cryptic PostgREST "Cannot coerce" message.
 */
export async function updateTask(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>,
): Promise<Task> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Session expired — please reload the app')

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .maybeSingle()

  if (error) throw new Error(`Failed to update task: ${error.message}`)
  if (!data) throw new Error('Task not found')
  return data as Task
}

/**
 * Hard-delete a task.
 *
 * Calls getUser() first for the same token-refresh reason as updateTask.
 * Also adds explicit .eq('user_id') so a 0-row delete (stale token → RLS
 * blocks it silently) becomes visible: the DELETE returns no error but
 * the explicit user_id filter ensures we only match the caller's own rows,
 * and PostgREST will return an error if the session is truly invalid.
 */
export async function deleteTask(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Session expired — please reload the app')

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(`Failed to delete task: ${error.message}`)
}
