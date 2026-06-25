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

    // Anonymous users haven't set a username yet — other people can't find them,
    // so searching makes no sense. Prompt the caller to claim their account first.
    const { data: caller } = await supabase
      .from('users')
      .select('is_anonymous')
      .eq('id', user.id)
      .single()

    if (caller?.is_anonymous) {
      return NextResponse.json(
        { error: 'claim_account', message: 'Set a username before adding friends.' },
        { status: 403 },
      )
    }

    // SECURITY DEFINER RPC — bypasses RLS so non-friends can find each other by
    // exact username without a browsable directory. Returns public fields only.
    const { data: results, error } = await supabase
      .rpc('search_user_by_username', { search_username: username })

    if (error) {
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    const data = Array.isArray(results) ? results[0] ?? null : results ?? null

    if (!data || data.id === user.id) {
      // Also hide own profile from search to avoid "add yourself" confusion
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check for blocked — RLS on users would normally hide blocked users, but since
    // search_user_by_username is SECURITY DEFINER it bypasses RLS, so we guard here.
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${data.id}),and(requester_id.eq.${data.id},addressee_id.eq.${user.id})`)
      .maybeSingle()

    if (existing?.status === 'blocked') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

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
