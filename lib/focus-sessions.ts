import type { SupabaseClient } from '@supabase/supabase-js'
import type { FocusSession } from '@/types'

/**
 * Create a new focus session row with status 'active'.
 * started_at is set by the DB default (now()) — server-side timestamp for anti-cheat.
 * The session is updated to 'completed' or 'cancelled' by the API routes on end.
 */
export async function startFocusSession(
  supabase:               SupabaseClient,
  plannedDurationSeconds: number,
  taskId:                 string | null = null,
): Promise<FocusSession> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({
      planned_duration_seconds: plannedDurationSeconds,
      task_id: taskId,
      status:  'active',
    })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to start focus session')
  return data as FocusSession
}

/**
 * Fetch the active focus session (status = 'active', ended_at IS NULL), or null.
 * Used to restore focus state when the app is reopened mid-session.
 * Returns null (not throws) so a failed query doesn't block Today from loading.
 */
export async function fetchActiveFocusSession(
  supabase: SupabaseClient,
): Promise<FocusSession | null> {
  const { data } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('status', 'active')
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data as FocusSession | null
}
