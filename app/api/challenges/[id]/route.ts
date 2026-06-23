import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchChallengeById } from '@/lib/challenges'

/**
 * GET /api/challenges/[id]
 *
 * Returns full challenge detail including participants and habit name.
 * Also lazily marks the challenge as completed if ends_at has passed.
 * Used by ScoreBattleDetail to refresh data after Realtime triggers.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const challenge = await fetchChallengeById(supabase, id)
    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    return NextResponse.json(challenge)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
