import type { SupabaseClient } from '@supabase/supabase-js'
import type { Reflection, NewReflection } from '@/types'

/** Fetch today's reflection, or null if not yet submitted. */
export async function fetchTodayReflection(
  supabase: SupabaseClient,
  date:     string,
): Promise<Reflection | null> {
  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .eq('date', date)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch reflection: ${error.message}`)
  return data as Reflection | null
}

/**
 * Submit tonight's reflection.
 * Uses upsert so editing the same day's reflection replaces rather than errors.
 */
export async function submitReflection(
  supabase: SupabaseClient,
  date:     string,
  payload:  NewReflection,
): Promise<Reflection> {
  const { data, error } = await supabase
    .from('reflections')
    .upsert({ date, ...payload }, { onConflict: 'user_id,date' })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to submit reflection')
  return data as Reflection
}

/**
 * Fetch the 100 most recent reflections for the Evidence of Growth timeline.
 * Returns newest-first so the limit always keeps the most recent entries.
 * The Growth page reverses the array before passing it to EvidenceOfGrowth
 * so the component still displays chronologically (oldest → newest).
 *
 * 100 entries ≈ 3+ months of daily use — more than enough for the timeline.
 * Private — only the owner's reflections are returned via RLS.
 */
export async function fetchAllReflections(
  supabase: SupabaseClient,
): Promise<Reflection[]> {
  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .order('date', { ascending: false })
    .limit(100)

  if (error) throw new Error(`Failed to fetch reflections: ${error.message}`)
  return (data ?? []) as Reflection[]
}

/**
 * Fetch the three most recent went_well answers for the Hard Day overlay.
 * Three is enough for a quick "look how far you've come" without overwhelming.
 */
export async function fetchRecentWins(
  supabase: SupabaseClient,
  limit = 3,
): Promise<{ date: string; went_well: string }[]> {
  const { data, error } = await supabase
    .from('reflections')
    .select('date, went_well')
    .order('date', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to fetch recent wins: ${error.message}`)
  return (data ?? []) as { date: string; went_well: string }[]
}
