'use client'

import { createClient } from './supabase/client'

// Silently creates an anonymous Supabase session on first app load.
// No form, no screen — the user is immediately active.
//
// Uses getUser() (server round-trip) rather than getSession() (local storage only).
// getSession() returns null if localStorage was cleared (iOS PWA reinstall,
// storage pressure, etc.) even when a valid refresh-token cookie still exists.
// getUser() asks the Supabase server to verify — only returns null when the
// session is truly gone — preventing a new anonymous user from being created and
// orphaning the existing user's data.
export async function ensureAnonymousSession() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const { error } = await supabase.auth.signInAnonymously()
    if (error) console.error('[DayTwin] Anonymous sign-in failed:', error.message)
  }
}

// Links an email address to the current anonymous session.
// Supabase sends a confirmation link; on click it upgrades the session
// to a real account on the same row — no new user, no data loss.
// Session 2+ calls this from the UI.
export async function linkEmail(email: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ email })
  if (error) throw error
}

// Redirects to Google OAuth. On return, Supabase links the Google identity
// to the existing anonymous account — same row, all data preserved.
// Session 2+ calls this from the UI.
export async function linkGoogle(redirectTo?: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: {
      redirectTo: redirectTo ?? `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw error
}
