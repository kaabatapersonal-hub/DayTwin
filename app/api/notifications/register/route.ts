import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Saves the OneSignal player ID to the user's row after permission is granted. */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { player_id } = body as { player_id?: string }
  if (!player_id) return NextResponse.json({ error: 'player_id required' }, { status: 400 })

  const { error } = await supabase
    .from('users')
    .update({ onesignal_player_id: player_id })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
