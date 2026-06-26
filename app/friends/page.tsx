import { createClient }        from '@/lib/supabase/server'
import { fetchFriends }        from '@/lib/friends'

export const dynamic = 'force-dynamic'
import { fetchFriendRequests } from '@/lib/friends'
import { FriendsScreen }       from '@/components/friends/FriendsScreen'

/**
 * Server-side: determines if the user is anonymous, fetches friends and pending
 * requests in parallel, then hands everything to the client-side FriendsScreen.
 *
 * An anonymous user (no username set) sees the AccountClaimPrompt — they can't
 * be found by search or add friends until they claim their account.
 */
export default async function FriendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <FriendsScreen
        isAnonymous={true}
        initialFriends={[]}
        initialRequests={[]}
      />
    )
  }

  // Fetch the profile row to check is_anonymous / username
  const { data: profile } = await supabase
    .from('users')
    .select('is_anonymous, username')
    .eq('id', user.id)
    .maybeSingle()

  // Treat missing profile or no username as anonymous for friends purposes
  const isAnonymous = !profile || profile.is_anonymous || !profile.username

  if (isAnonymous) {
    return (
      <FriendsScreen
        isAnonymous={true}
        initialFriends={[]}
        initialRequests={[]}
      />
    )
  }

  const [friends, requests] = await Promise.all([
    fetchFriends(supabase),
    fetchFriendRequests(supabase),
  ])

  return (
    <FriendsScreen
      isAnonymous={false}
      initialFriends={friends}
      initialRequests={requests}
    />
  )
}
