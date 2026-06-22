import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/friends/search?username=...
 *
 * Exact-match username search. Returns only the discoverable public fields
 * (user_id, display_name, username, avatar_url) — nothing else leaks before
 * a friendship exists. No partial-match or browsable directory in V1.
 *
 * Returns 404 if no user has that exact username so the caller can show
 * "No user found" without exposing whether the username is taken by a blocked user.
 */
export async function GET(req: NextRequest) {
  try {
    const username = req.nextUrl.searchParams.get('username')?.trim().toLowerCase()
    if (!username) {
      return NextResponse.json({ error: 'username is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Exact match only — ilike would allow partial matches; = is intentional
    const { data, error } = await supabase
      .from('users')
      .select('id, display_name, username, avatar_url')
      .eq('username', username)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    if (!data || data.id === user.id) {
      // Also hide own profile from search to avoid "add yourself" confusion
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if already friends or already have a pending request
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${data.id}),and(requester_id.eq.${data.id},addressee_id.eq.${user.id})`)
      .maybeSingle()

    return NextResponse.json({
      user_id:          data.id,
      display_name:     data.display_name,
      username:         data.username,
      avatar_url:       data.avatar_url,
      friendship_status: existing?.status ?? null,   // null = no relationship yet
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
