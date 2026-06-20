import type { SupabaseClient } from '@supabase/supabase-js'
import type { Goal, NewGoal, GoalStatus } from '@/types'

/**
 * Fetch all non-archived goals for the current user, newest first.
 * Goals are always private — they are only ever queried with the authenticated
 * user's client; no friend-visibility policy exists on this table.
 */
export async function fetchGoals(
  supabase: SupabaseClient,
  filter: 'active' | 'all' = 'all',
): Promise<Goal[]> {
  let query = supabase
    .from('goals')
    .select('*')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  if (filter === 'active') {
    query = supabase
      .from('goals')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch goals: ${error.message}`)
  return (data ?? []) as Goal[]
}

/** Fetch a single goal by ID. Returns null if not found or not owned by the caller. */
export async function fetchGoal(
  supabase: SupabaseClient,
  id:       string,
): Promise<Goal | null> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch goal: ${error.message}`)
  return data as Goal | null
}

/** Create a new goal. progress_pct defaults to 0 in the DB. */
export async function createGoal(
  supabase: SupabaseClient,
  payload:  NewGoal,
): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .insert(payload)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create goal')
  return data as Goal
}

export async function updateGoal(
  supabase: SupabaseClient,
  id:       string,
  updates:  Partial<Pick<Goal, 'title' | 'why_text' | 'deadline' | 'progress_pct' | 'status'>>,
): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to update goal')
  return data as Goal
}

/**
 * Archive a goal (soft-delete).
 * Archived goals are hidden from the Growth tab but their data is preserved
 * so linked projects and tasks keep their history.
 */
export async function archiveGoal(
  supabase: SupabaseClient,
  id:       string,
): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .update({ status: 'archived' as GoalStatus })
    .eq('id', id)

  if (error) throw new Error(error.message)
}
