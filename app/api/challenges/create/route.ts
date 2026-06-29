import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { todayISO } from '@/lib/format'
import type { ChallengeType } from '@/types'

/**
 * POST /api/challenges/create
 *
 * Creates a challenge and adds the creator as the first participant.
 * The invitee is stored on challenges.invitee_id — they can see the challenge
 * (via challenges_select_invitee RLS) and join it themselves by calling /api/challenges/join.
 *
 * Validates:
 * - Creator and invitee are accepted friends (prevents challenge spam)
 * - habit_id belongs to the creator (for habit_pact)
 *
 * Body: {
 *   type: ChallengeType
 *   invitee_id: string
 *   duration_days: number | null   (null for friends_feed)
 *   habit_id: string | null        (habit_pact only)
 *   entry_cost_sparks: number      (display only — no deduction this session)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      type?:               ChallengeType
      invitee_id?:         string
      duration_days?:      number | null
      habit_id?:           string | null
      entry_cost_sparks?:  number
    }

    const { type, invitee_id, duration_days, habit_id, entry_cost_sparks } = body

    if (!type || !invitee_id) {
      return NextResponse.json({ error: 'type and invitee_id are required' }, { status: 400 })
    }
    if (!['score_battle', 'habit_pact', 'friends_feed'].includes(type)) {
      return NextResponse.json({ error: 'Invalid challenge type' }, { status: 400 })
    }
    if (type === 'habit_pact' && !habit_id) {
      return NextResponse.json({ error: 'habit_id required for habit_pact' }, { status: 400 })
    }
    if (type !== 'friends_feed' && !duration_days) {
      return NextResponse.json({ error: 'duration_days required for this type' }, { status: 400 })
    }
    if (duration_days !== undefined && duration_days !== null &&
        (!Number.isInteger(duration_days) || duration_days < 1 || duration_days > 365)) {
      return NextResponse.json({ error: 'duration_days must be between 1 and 365' }, { status: 400 })
    }
    if (entry_cost_sparks !== undefined &&
        (!Number.isInteger(entry_cost_sparks) || entry_cost_sparks < 0 || entry_cost_sparks > 10000)) {
      return NextResponse.json({ error: 'entry_cost_sparks must be a whole number between 0 and 10000' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (user.id === invitee_id) {
      return NextResponse.json({ error: 'Cannot challenge yourself' }, { status: 400 })
    }

    // Verify creator and invitee are accepted friends
    const { data: friendship } = await supabase
      .from('friendships')
      .select('id')
      .eq('status', 'accepted')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${invitee_id}),and(requester_id.eq.${invitee_id},addressee_id.eq.${user.id})`)
      .maybeSingle()

    if (!friendship) {
      return NextResponse.json({ error: 'Must be friends to challenge' }, { status: 403 })
    }

    // For habit_pact: verify the habit belongs to the creator
    if (type === 'habit_pact' && habit_id) {
      const { data: habit } = await supabase
        .from('habits')
        .select('id')
        .eq('id', habit_id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!habit) {
        return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
      }
    }

    const today        = todayISO()
    const startsAt     = today
    const endsAt       = duration_days
      ? (() => {
          const d = new Date(`${today}T00:00:00`)
          d.setDate(d.getDate() + duration_days)
          return d.toISOString().slice(0, 10)
        })()
      : null

    // Create the challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .insert({
        type,
        habit_id:          habit_id ?? null,
        created_by:        user.id,
        invitee_id,
        duration_days:     duration_days ?? null,
        starts_at:         startsAt,
        ends_at:           endsAt,
        entry_cost_sparks: entry_cost_sparks ?? 0,
        pool_total_sparks: 0,
        status:            'pending',
      })
      .select('id')
      .single()

    if (challengeError || !challenge) {
      return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 })
    }

    // Deduct entry cost for the creator before adding them as participant.
    // This is done in the API route (not a trigger) so the client gets a
    // meaningful "insufficient balance" error before the challenge is committed.
    const cost = entry_cost_sparks ?? 0
    if (cost > 0) {
      const { data: deductResult, error: deductError } = await supabase.rpc('deduct_sparks', {
        p_user_id:   user.id,
        p_amount:    cost,
        p_reason:    'challenge_entry',
        p_item_type: 'challenge',
        p_item_id:   challenge.id,
      })

      if (deductError || !deductResult?.success) {
        // Roll back the challenge — no Sparks were deducted yet
        await supabase.from('challenges').delete().eq('id', challenge.id)
        const shortfall = deductResult?.shortfall as number | undefined
        const msg = shortfall
          ? `You need ${shortfall} more Sparks to create this challenge`
          : 'Insufficient Sparks balance'
        return NextResponse.json({ error: msg }, { status: 402 })
      }

      // Update pool with creator's entry
      await supabase
        .from('challenges')
        .update({ pool_total_sparks: cost })
        .eq('id', challenge.id)
    }

    // Add creator as first participant — trigger fires but doesn't activate (only 1 participant)
    const { error: participantError } = await supabase
      .from('challenge_participants')
      .insert({ challenge_id: challenge.id, user_id: user.id })

    if (participantError) {
      // Refund any Sparks deducted before rolling back the challenge row.
      // Without this, the creator would lose Sparks for a challenge that never existed.
      if (cost > 0) {
        await supabase.rpc('award_sparks', {
          p_user_id:   user.id,
          p_amount:    cost,
          p_reason:    'challenge_entry_refund',
          p_item_type: 'challenge',
          p_item_id:   challenge.id,
        })
      }
      await supabase.from('challenges').delete().eq('id', challenge.id)
      return NextResponse.json({ error: 'Failed to join challenge' }, { status: 500 })
    }

    return NextResponse.json({ challenge_id: challenge.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
