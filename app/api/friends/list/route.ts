import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchFriends } from '@/lib/friends'

/**
 * GET /api/friends/list
 *
 * Returns the current user's accepted friends with today's score.
 * Used by FriendsScreen to refresh the list after mutations (accept, remove, block)
 * without a full page reload.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const friends = await fetchFriends(supabase)
    return NextResponse.json(friends)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
