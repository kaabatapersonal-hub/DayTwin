import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/friends/remove
 *
 * Silently removes an accepted friendship. No notification is sent to the
 * other party — per privacy-and-friend-safety.md, "removed you" notifications
 * create unnecessary conflict.
 *
 * Body: { friendship_id: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { friendship_id } = (await req.json()) as { friendship_id?: string }
    if (!friendship_id) {
      return NextResponse.json({ error: 'friendship_id is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // RLS friendships_delete_parties ensures only participants can delete
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendship_id)

    if (error) return NextResponse.json({ error: 'Failed to remove friend' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
