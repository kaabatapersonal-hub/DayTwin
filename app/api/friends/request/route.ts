import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/friends/request
 *
 * Sends a friend request to a user by their user_id.
 * RLS requires requester_id = auth.uid() on INSERT, so the RLS policy
 * is the real guard — we just need to set the row correctly.
 *
 * Body: { addressee_id: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { addressee_id } = (await req.json()) as { addressee_id?: string }
    if (!addressee_id) {
      return NextResponse.json({ error: 'addressee_id is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (user.id === addressee_id) {
      return NextResponse.json({ error: 'Cannot send a request to yourself' }, { status: 400 })
    }

    // Check for an existing friendship row in either direction
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addressee_id}),and(requester_id.eq.${addressee_id},addressee_id.eq.${user.id})`)
      .maybeSingle()

    if (existing?.status === 'accepted') {
      return NextResponse.json({ error: 'Already friends' }, { status: 409 })
    }
    if (existing?.status === 'pending') {
      return NextResponse.json({ error: 'Request already pending' }, { status: 409 })
    }
    if (existing?.status === 'blocked') {
      // Silent — don't reveal that a block exists
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('friendships')
      .insert({ requester_id: user.id, addressee_id, status: 'pending' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to send request' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
