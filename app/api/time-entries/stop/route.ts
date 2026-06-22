import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/time-entries/stop
 *
 * Stops a running time entry by computing duration_seconds server-side from
 * the stored start_at timestamp versus now(). The client sends only the entry
 * id — the server looks up start_at and computes the duration. Never trusting
 * a client-reported duration is the anti-cheat floor for time-based earnings.
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

    // RLS ensures the row belongs to this user — no extra ownership check needed
    const { data: entry, error: fetchError } = await supabase
      .from('time_entries')
      .select('start_at')
      .eq('id', id)
      .is('end_at', null)   // only stop entries that are actually running
      .single()

    if (fetchError || !entry) {
      return NextResponse.json({ error: 'Entry not found or already stopped' }, { status: 404 })
    }

    const nowMs           = Date.now()
    const durationSeconds = Math.floor((nowMs - new Date(entry.start_at).getTime()) / 1000)

    const { data: updated, error: updateError } = await supabase
      .from('time_entries')
      .update({
        end_at:           new Date(nowMs).toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Failed to stop entry' }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
