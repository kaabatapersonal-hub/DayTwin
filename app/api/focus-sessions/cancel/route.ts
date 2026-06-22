import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/focus-sessions/cancel
 *
 * Marks a focus session as cancelled. actual_duration_seconds is still recorded
 * server-side so there's an honest record of time spent — useful for analytics
 * and prevents claiming Sparks (Session 11) from cancelled sessions.
 *
 * Body: { id: string }
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
      .select('started_at')
      .eq('id', id)
      .eq('status', 'active')
      .single()

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Session not found or already ended' }, { status: 404 })
    }

    const nowMs         = Date.now()
    const actualSeconds = Math.floor((nowMs - new Date(session.started_at).getTime()) / 1000)

    const { data: updated, error: updateError } = await supabase
      .from('focus_sessions')
      .update({
        ended_at:                new Date(nowMs).toISOString(),
        actual_duration_seconds: actualSeconds,
        status:                  'cancelled',
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Failed to cancel session' }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
