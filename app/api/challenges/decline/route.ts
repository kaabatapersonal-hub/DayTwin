import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/challenges/decline
 *
 * Declines a challenge invite by marking it 'cancelled'.
 * Only the invitee can decline a pending challenge.
 * The challenges_invitee_cancel RLS policy enforces this at the DB level.
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
      .eq('invitee_id', user.id)
      .eq('status', 'pending')

    if (error) {
      return NextResponse.json({ error: 'Failed to decline' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
