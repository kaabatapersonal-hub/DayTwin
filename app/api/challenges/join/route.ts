import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/challenges/join
 *
 * Accepts a challenge invite by inserting the caller into challenge_participants.
 * The activate_challenge_when_full trigger fires automatically — when 2 participants
 * are in, it flips the challenge to 'active' (and sets streak_held=true for habit_pact).
 *
 * Body: { challenge_id: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { challenge_id } = await req.json() as { challenge_id?: string }
    if (!challenge_id) {
      return NextResponse.json({ error: 'challenge_id is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify the challenge is pending and this user is the invitee
    const { data: challenge, error: fetchError } = await supabase
      .from('challenges')
      .select('id, status, invitee_id, type')
      .eq('id', challenge_id)
      .eq('status', 'pending')
      .maybeSingle()

    if (fetchError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    if (challenge.invitee_id !== user.id) {
      return NextResponse.json({ error: 'Not the invitee for this challenge' }, { status: 403 })
    }

    // Insert participant row — activate_challenge_when_full trigger fires here
    const { error: joinError } = await supabase
      .from('challenge_participants')
      .insert({ challenge_id, user_id: user.id })

    if (joinError) {
      if (joinError.code === '23505') {
        // Already joined — idempotent
        return NextResponse.json({ challenge_id, already_joined: true })
      }
      return NextResponse.json({ error: 'Failed to join' }, { status: 500 })
    }

    // Read back the updated challenge status
    const { data: updated } = await supabase
      .from('challenges')
      .select('status')
      .eq('id', challenge_id)
      .single()

    return NextResponse.json({ challenge_id, status: updated?.status ?? 'pending' })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
