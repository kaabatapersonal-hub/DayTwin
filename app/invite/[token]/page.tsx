import { redirect }      from 'next/navigation'
import { createClient }  from '@/lib/supabase/server'

/**
 * Server page: processes an invite-link token and redirects to /friends.
 *
 * Flow:
 * 1. User clicks the invite link (e.g. daytwin.app/invite/[uuid])
 * 2. This page loads, user already has an anonymous session (Providers ensures this)
 * 3. We POST to /api/friends/claim with the token
 * 4. On success → redirect to /friends (client shows success state)
 * 5. On failure → redirect to /friends with ?error=... so FriendsScreen can show a toast
 *
 * We use a server-side fetch to the claim route so the user's session cookie
 * is forwarded automatically — the claim route calls createClient() which reads
 * the cookie and knows who is claiming the token.
 */
interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params

  if (!token) redirect('/friends?error=invalid_link')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Should not happen — Providers ensures an anonymous session on first load,
    // but redirect defensively to let the user go through the normal flow
    redirect(`/friends?pending_invite=${token}`)
  }

  try {
    // Call the claim API on the server side using the authenticated client directly
    // (avoids the overhead of a loopback HTTP call)
    const { data: invite, error: fetchError } = await supabase
      .from('invite_tokens')
      .select('id, user_id, expires_at, claimed_at')
      .eq('id', token)
      .maybeSingle()

    if (fetchError || !invite) redirect('/friends?error=invalid_link')

    if (invite.user_id === user.id) redirect('/friends?error=own_link')
    if (invite.claimed_at)          redirect('/friends?error=already_used')
    if (new Date(invite.expires_at) < new Date()) redirect('/friends?error=expired')

    // Check for existing relationship
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${invite.user_id}),and(requester_id.eq.${invite.user_id},addressee_id.eq.${user.id})`)
      .maybeSingle()

    if (existing?.status === 'blocked') redirect('/friends?error=invalid_link')

    if (existing?.status === 'accepted') {
      await supabase
        .from('invite_tokens')
        .update({ claimed_at: new Date().toISOString(), claimed_by: user.id })
        .eq('id', token)
      redirect('/friends?success=already_friends')
    }

    if (existing) {
      await supabase.from('friendships').update({ status: 'accepted' }).eq('id', existing.id)
    } else {
      await supabase.from('friendships').insert({
        requester_id: invite.user_id,
        addressee_id: user.id,
        status: 'accepted',
      })
    }

    await supabase
      .from('invite_tokens')
      .update({ claimed_at: new Date().toISOString(), claimed_by: user.id })
      .eq('id', token)

    redirect('/friends?success=added')
  } catch {
    redirect('/friends?error=unknown')
  }
}
