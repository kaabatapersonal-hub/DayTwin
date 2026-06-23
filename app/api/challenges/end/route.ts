import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/challenges/end
 *
 * Ends an active challenge (primarily used for friends_feed which has no end date,
 * but also allows a creator to cancel any challenge they started).
 * Either participant can end it — the challenges_participant_cancel RLS policy
 * covers non-creator participants; creator is already covered by challenges_all_creator.
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

    const { error } = await supabase
      .from('challenges')
      .update({ status: 'cancelled' })
      .eq('id', challenge_id)

    if (error) {
      return NextResponse.json({ error: 'Failed to end challenge' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
