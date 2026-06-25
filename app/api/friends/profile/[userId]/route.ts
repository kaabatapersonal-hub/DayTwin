import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/friends/profile/[userId]
 *
 * Returns the full friend profile data for the profile overlay:
 * - Public profile fields (display_name, username, avatar_url, sparks_lifetime)
 * - 7-day score history via the get_friend_scores security-definer RPC
 * - 30-day consistency pct via the get_friend_consistency security-definer RPC
 *
 * The RPC functions gate on is_accepted_friend() internally — they return
 * empty data rather than erroring if the caller is not a friend. The API
 * layer then returns 403 if the score history comes back empty (guards
 * against non-friends hitting this endpoint directly).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Gate on accepted friendship before fetching any data.
    // Checking friendships directly is reliable regardless of whether the friend
    // has any recent scores (an inactive friend with 0 activity still passes).
    if (userId !== user.id) {
      const { data: friendship } = await supabase
        .from('friendships')
        .select('status')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
        .eq('status', 'accepted')
        .maybeSingle()

      if (!friendship) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Fetch public profile — RLS users_select_friends allows this for accepted friends
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, display_name, username, avatar_url, sparks_lifetime')
      .eq('id', userId)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch 7-day score history via security-definer RPC (returns score_pct only, not breakdown)
    const { data: scoreRows } = await supabase
      .rpc('get_friend_scores', { friend_user_id: userId })

    const scoreHistory = (scoreRows ?? []) as { score_date: string; score_pct: number }[]

    // Fetch aggregated consistency via security-definer RPC (no habit names exposed)
    const { data: consistency } = await supabase
      .rpc('get_friend_consistency', { friend_user_id: userId })

    return NextResponse.json({
      user_id:             profile.id,
      display_name:        profile.display_name,
      username:            profile.username,
      avatar_url:          profile.avatar_url,
      sparks_lifetime:     profile.sparks_lifetime,
      score_history:       scoreHistory.map(r => ({ date: r.score_date, score_pct: r.score_pct })),
      consistency_30d_pct: (consistency as number) ?? 0,
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
