import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/focus-sessions/complete
 *
 * Ends a focus session after the timer reaches zero. The server computes
 * actual_duration_seconds from (now() - started_at) and checks whether it
 * meets the 90% threshold before marking the session 'completed'.
 *
 * If actual_duration_seconds < planned * 0.9, the session is marked 'cancelled'
 * instead — this prevents edge cases where the client fires the complete request
 * a fraction of a second early and still claims a full session.
 *
 * Body: { id: string }
 * Returns: { session: FocusSession; isComplete: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const { id } = (await req.json()) as { id?: string }
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: session, error: fetchError } = await supabase
      .from('focus_sessions')
      .select('started_at, planned_duration_seconds')
      .eq('id', id)
      .eq('status', 'active')
      .single()

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Session not found or already ended' }, { status: 404 })
    }

    const nowMs         = Date.now()
    const actualSeconds = Math.floor((nowMs - new Date(session.started_at).getTime()) / 1000)
    // 90% threshold — a brief early fire from the client timer still qualifies;
    // anything well short of planned is treated as a cancel, not a completion
    const threshold  = session.planned_duration_seconds * 0.9
    const isComplete = actualSeconds >= threshold

    const { data: updated, error: updateError } = await supabase
      .from('focus_sessions')
      .update({
        ended_at:                new Date(nowMs).toISOString(),
        actual_duration_seconds: actualSeconds,
        status:                  isComplete ? 'completed' : 'cancelled',
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 })
    }

    return NextResponse.json({ session: updated, isComplete })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
