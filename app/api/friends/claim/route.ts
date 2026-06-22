import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/friends/claim
 *
 * Claims an invite token and creates an accepted friendship between the
 * token owner and the caller. Skips the pending request state because
 * using an invite link signals explicit mutual intent.
 *
 * Validates:
 * - Token exists and is not expired
 * - Token has not already been claimed
 * - Caller is not the token owner (can't friend yourself via your own link)
 *
 * Body: { token: string }  (the invite_tokens.id UUID)
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = (await req.json()) as { token?: string }
    if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch the token — RLS invite_tokens_read_for_claim allows any authed user
    const { data: invite, error: fetchError } = await supabase
      .from('invite_tokens')
      .select('id, user_id, expires_at, claimed_at')
      .eq('id', token)
      .maybeSingle()

    if (fetchError || !invite) {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })
    }

    if (invite.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot claim your own invite link' }, { status: 400 })
    }

    if (invite.claimed_at) {
      return NextResponse.json({ error: 'Invite link already used' }, { status: 409 })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite link has expired' }, { status: 410 })
    }

    // Check if already friends or a block exists
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${invite.user_id}),and(requester_id.eq.${invite.user_id},addressee_id.eq.${user.id})`)
      .maybeSingle()

    if (existing?.status === 'blocked') {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })
    }

    if (existing?.status === 'accepted') {
      // Already friends — mark the token claimed and return success
      await supabase
        .from('invite_tokens')
        .update({ claimed_at: new Date().toISOString(), claimed_by: user.id })
        .eq('id', token)
      return NextResponse.json({ ok: true, already_friends: true })
    }

    // Upsert an accepted friendship (handles pending-in-either-direction gracefully)
    if (existing) {
      await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('friendships')
        .insert({ requester_id: invite.user_id, addressee_id: user.id, status: 'accepted' })
    }

    // Mark token as claimed
    await supabase
      .from('invite_tokens')
      .update({ claimed_at: new Date().toISOString(), claimed_by: user.id })
      .eq('id', token)

    return NextResponse.json({ ok: true, owner_id: invite.user_id })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
