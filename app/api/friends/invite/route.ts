import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/friends/invite
 *
 * Generates a new invite token for the current user. The token is valid for
 * 7 days (set by the expires_at DB default). Anyone who visits
 * /invite/[token] while authenticated will automatically become friends
 * with the token owner (skipping the pending state — the invite was intentional).
 *
 * Returns the token id so the client can construct the invite URL.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('invite_tokens')
      .insert({ user_id: user.id })
      .select('id, expires_at')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    return NextResponse.json({ token: data.id, expires_at: data.expires_at }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
