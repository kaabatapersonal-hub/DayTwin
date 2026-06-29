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

    // Verify the challenge is pending and this user is the invitee.
    // Also fetch entry_cost_sparks so we can deduct before adding the participant.
    const { data: challenge, error: fetchError } = await supabase
      .from('challenges')
      .select('id, status, invitee_id, type, entry_cost_sparks, pool_total_sparks')
      .eq('id', challenge_id)
      .eq('status', 'pending')
      .maybeSingle()

    if (fetchError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    if (challenge.invitee_id !== user.id) {
      return NextResponse.json({ error: 'Not the invitee for this challenge' }, { status: 403 })
    }

    // Deduct entry cost for the joiner before adding them as participant
    const cost = (challenge.entry_cost_sparks as number) ?? 0
    if (cost > 0) {
      const { data: deductResult, error: deductError } = await supabase.rpc('deduct_sparks', {
        p_user_id:   user.id,
        p_amount:    cost,
        p_reason:    'challenge_entry',
        p_item_type: 'challenge',
        p_item_id:   challenge_id,
      })

      if (deductError || !deductResult?.success) {
        const shortfall = deductResult?.shortfall as number | undefined
        const msg = shortfall
          ? `You need ${shortfall} more Sparks to join this challenge`
          : 'Insufficient Sparks balance'
        return NextResponse.json({ error: msg }, { status: 402 })
      }

      // Update pool total — creator's cost + joiner's cost
      await supabase
        .from('challenges')
        .update({ pool_total_sparks: ((challenge.pool_total_sparks as number) ?? 0) + cost })
        .eq('id', challenge_id)
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
      // Refund the entry Sparks that were already deducted — the join failed,
      // so the user must get their Sparks back.
      if (cost > 0) {
        await supabase.rpc('award_sparks', {
          p_user_id:   user.id,
          p_amount:    cost,
          p_reason:    'challenge_entry_refund',
          p_item_type: 'challenge',
          p_item_id:   challenge_id,
        })
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
