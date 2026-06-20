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
 * `user_id` is injected by Supabase RLS — the caller doesn't need to provide it.
 */
export async function createTask(
  supabase: SupabaseClient,
  task: NewTask,
): Promise<Task> {
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
 */
export async function updateTask(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>,
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update task: ${error.message}`)
  return data as Task
}

/**
 * Hard-delete a task. RLS ensures users can only delete their own rows.
 */
export async function deleteTask(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete task: ${error.message}`)
}
