import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserProfile } from '@/types'

/** Fetch the current user's public profile row. Returns null if not yet created. */
export async function fetchUserProfile(
  supabase: SupabaseClient,
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, preferred_name, display_name, timezone, last_active_at, tone_preference, sparks_balance, sparks_lifetime')
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch profile: ${error.message}`)
  return data as UserProfile | null
}

/**
 * Stamp last_active_at to now.
 * Called after the Welcome Back screen is acknowledged — not on every page load,
 * so the 3-day threshold only resets when the user explicitly continues.
 */
export async function touchLastActive(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')

  if (error) throw new Error(`Failed to update last_active_at: ${error.message}`)
}

/**
 * Returns true when last_active_at is more than 3 days in the past, or null
 * (first ever open). Drives the Welcome Back screen.
 */
export function isWelcomeBackDue(lastActiveAt: string | null): boolean {
  if (!lastActiveAt) return false   // brand new user — skip the welcome back screen
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
  return Date.now() - new Date(lastActiveAt).getTime() > THREE_DAYS_MS
}

/** Days since last_active_at, rounded down. Used in the welcome back copy. */
export function daysSinceLastActive(lastActiveAt: string): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  return Math.floor((Date.now() - new Date(lastActiveAt).getTime()) / MS_PER_DAY)
}
