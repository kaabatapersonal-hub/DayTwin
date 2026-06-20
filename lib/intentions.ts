import type { SupabaseClient } from '@supabase/supabase-js'
import type { Intention } from '@/types'

/**
 * Fetch today's morning intention, or null if the user hasn't set one yet.
 * Uses maybeSingle() because the unique(user_id, date) constraint guarantees
 * at most one row — returning null instead of throwing on no-result.
 */
export async function fetchTodayIntention(
  supabase: SupabaseClient,
  date: string,
): Promise<Intention | null> {
  const { data, error } = await supabase
    .from('intentions')
    .select('*')
    .eq('date', date)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch intention: ${error.message}`)
  return data as Intention | null
}

/**
 * Save (or overwrite) today's intention.
 * Uses upsert because unique(user_id, date) means a second save in the same day
 * should update the existing row, not create a duplicate.
 */
export async function saveIntention(
  supabase: SupabaseClient,
  date: string,
  text: string,
): Promise<Intention> {
  const { data, error } = await supabase
    .from('intentions')
    .upsert({ date, text })
    .select()
    .single()

  if (error) throw new Error(`Failed to save intention: ${error.message}`)
  return data as Intention
}
