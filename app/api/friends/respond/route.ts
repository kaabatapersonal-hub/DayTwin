import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/friends/respond
 *
 * Accept or decline a pending friend request. Only the addressee can call this —
 * if the authenticated user is the requester, we return 403.
 *
 * Body: { friendship_id: string; action: 'accept' | 'decline' }
 *
 * Decline deletes the row rather than setting a declined state, so the
 * requester can send a new request later without ambiguity.
 */
export async function POST(req: NextRequest) {
  try {
    const { friendship_id, action } = (await req.json()) as {
      friendship_id?: string
      action?: 'accept' | 'decline'
    }

    if (!friendship_id || !action) {
      return NextResponse.json({ error: 'friendship_id and action are required' }, { status: 400 })
    }
    if (action !== 'accept' && action !== 'decline') {
      return NextResponse.json({ error: 'action must be accept or decline' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch the friendship row — RLS ensures it belongs to this user
    const { data: friendship, error: fetchError } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .eq('id', friendship_id)
      .eq('status', 'pending')
      .single()

    if (fetchError || !friendship) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (friendship.addressee_id !== user.id) {
      // Only the addressee can accept or decline
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (action === 'accept') {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendship_id)

      if (error) return NextResponse.json({ error: 'Failed to accept' }, { status: 500 })
      return NextResponse.json({ status: 'accepted' })
    }

    // Decline: delete the row
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendship_id)

    if (error) return NextResponse.json({ error: 'Failed to decline' }, { status: 500 })
    return NextResponse.json({ status: 'declined' })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
