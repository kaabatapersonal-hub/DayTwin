import type { SupabaseClient } from '@supabase/supabase-js'
import type { FriendView, FriendRequest } from '@/types'
import { todayISO } from '@/lib/format'

/**
 * Fetches all accepted friends for the current user, joining in their public
 * profile and today's score. Returned list is used to render the friends tab.
 *
 * The daily_scores query only selects score_pct (not the breakdown JSON) to
 * respect the friend-visible column restriction from privacy-and-friend-safety.md.
 */
export async function fetchFriends(supabase: SupabaseClient): Promise<FriendView[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id')
    .eq('status', 'accepted')

  if (error || !friendships?.length) return []

  // Resolve which side of each friendship row is the friend
  const friendIds = friendships.map(f =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  )

  // Fetch public profiles — RLS users_select_friends allows this
  const { data: profiles } = await supabase
    .from('users')
    .select('id, display_name, username, avatar_url, sparks_lifetime')
    .in('id', friendIds)

  // Fetch today's scores — only score_pct, not breakdown
  const { data: scores } = await supabase
    .from('daily_scores')
    .select('user_id, score_pct')
    .in('user_id', friendIds)
    .eq('date', todayISO())

  return friendships.map(f => {
    const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id
    const profile  = profiles?.find(p => p.id === friendId)
    const score    = scores?.find(s => s.user_id === friendId)

    return {
      friendship_id:       f.id,
      user_id:             friendId,
      display_name:        profile?.display_name ?? null,
      username:            profile?.username     ?? null,
      avatar_url:          profile?.avatar_url   ?? null,
      sparks_lifetime:     profile?.sparks_lifetime ?? 0,
      today_score_pct:     score?.score_pct ?? null,
      consistency_30d_pct: null,   // loaded lazily in FriendProfile
    }
  })
}

/**
 * Fetches all pending friend requests involving the current user —
 * both incoming (we are the addressee) and outgoing (we are the requester).
 * The UI shows incoming requests with Accept/Decline buttons; outgoing show "Pending".
 */
export async function fetchFriendRequests(supabase: SupabaseClient): Promise<FriendRequest[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: rows, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, created_at')
    .eq('status', 'pending')

  if (error || !rows?.length) return []

  // Gather the other party's ID for each request
  const otherIds = rows.map(r =>
    r.requester_id === user.id ? r.addressee_id : r.requester_id
  )

  const { data: profiles } = await supabase
    .from('users')
    .select('id, display_name, username, avatar_url')
    .in('id', otherIds)

  return rows.map(r => {
    const otherId   = r.requester_id === user.id ? r.addressee_id : r.requester_id
    const profile   = profiles?.find(p => p.id === otherId)
    const direction = r.requester_id === user.id ? 'outgoing' : 'incoming'

    return {
      friendship_id: r.id,
      requester_id:  r.requester_id,
      addressee_id:  r.addressee_id,
      display_name:  profile?.display_name ?? null,
      username:      profile?.username     ?? null,
      avatar_url:    profile?.avatar_url   ?? null,
      direction,
      created_at:    r.created_at,
    } satisfies FriendRequest
  })
}
