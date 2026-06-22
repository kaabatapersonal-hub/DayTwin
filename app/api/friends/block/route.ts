import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/friends/block
 *
 * Blocks a user. This:
 * 1. Deletes any existing friendship row (accepted or pending in either direction)
 * 2. Creates a new friendship row with status='blocked' where the caller is the requester
 *
 * The blocked row prevents future friend requests (the request API checks for
 * existing rows in either direction, including blocked ones). The search API also
 * returns 404 for blocked users to hide them from search results.
 *
 * Body: { target_user_id: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { target_user_id } = (await req.json()) as { target_user_id?: string }
    if (!target_user_id) {
      return NextResponse.json({ error: 'target_user_id is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (user.id === target_user_id) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 })
    }

    // Remove any existing row (friendship or pending request in either direction)
    await supabase
      .from('friendships')
      .delete()
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${target_user_id}),and(requester_id.eq.${target_user_id},addressee_id.eq.${user.id})`)

    // Insert the block row — caller is always the requester on a block
    const { error } = await supabase
      .from('friendships')
      .insert({ requester_id: user.id, addressee_id: target_user_id, status: 'blocked' })

    if (error) return NextResponse.json({ error: 'Failed to block user' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
