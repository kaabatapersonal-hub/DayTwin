import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchFriendRequests } from '@/lib/friends'

/**
 * GET /api/friends/requests
 *
 * Returns pending friend requests (both incoming and outgoing) for the current user.
 * Used by FriendsScreen to refresh the requests section after accept/decline.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const requests = await fetchFriendRequests(supabase)
    return NextResponse.json(requests)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
