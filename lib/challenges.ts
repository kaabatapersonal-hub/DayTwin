import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Challenge, ChallengeParticipantView, ChallengeWithParticipants,
} from '@/types'
import { todayISO } from '@/lib/format'

/**
 * Merges raw DB rows into the ChallengeWithParticipants shape used by all
 * challenge screens. Shared by fetchMyChallenges and fetchChallengeById.
 */
async function buildChallengeViews(
  supabase: SupabaseClient,
  challenges: Challenge[],
): Promise<ChallengeWithParticipants[]> {
  if (!challenges.length) return []

  const challengeIds = challenges.map(c => c.id)

  // Fetch all participant rows for these challenges
  const { data: participants } = await supabase
    .from('challenge_participants')
    .select('id, challenge_id, user_id, joined_at, current_score, streak_held')
    .in('challenge_id', challengeIds)

  // Fetch public profiles for all unique participant user_ids
  const userIds = Array.from(new Set((participants ?? []).map(p => p.user_id)))
  const { data: profiles } = userIds.length
    ? await supabase
        .from('users')
        .select('id, display_name, username, avatar_url')
        .in('id', userIds)
    : { data: [] }

  // Fetch habit names for habit_pact challenges
  const habitIds = challenges.filter(c => c.habit_id).map(c => c.habit_id!)
  const { data: habits } = habitIds.length
    ? await supabase
        .from('habits')
        .select('id, name')
        .in('id', habitIds)
    : { data: [] }

  return challenges.map(challenge => {
    const challengeParticipants = (participants ?? []).filter(
      p => p.challenge_id === challenge.id,
    )

    const participantViews: ChallengeParticipantView[] = challengeParticipants.map(p => {
      const profile = (profiles ?? []).find(u => u.id === p.user_id)
      return {
        id:            p.id,
        user_id:       p.user_id,
        display_name:  profile?.display_name ?? null,
        username:      profile?.username     ?? null,
        avatar_url:    profile?.avatar_url   ?? null,
        current_score: p.current_score,
        streak_held:   p.streak_held,
        joined_at:     p.joined_at,
      }
    })

    const habit = challenge.habit_id
      ? (habits ?? []).find(h => h.id === challenge.habit_id)
      : null

    return {
      challenge,
      participants: participantViews,
      habit_name:   habit?.name ?? null,
    }
  })
}

/**
 * Fetches all active and pending challenges the current user is involved in —
 * either as creator (created_by) or as the invitee (invitee_id) or as a participant
 * (in challenge_participants). Also marks challenges as completed if they've expired.
 */
export async function fetchMyChallenges(
  supabase: SupabaseClient,
): Promise<ChallengeWithParticipants[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const today = todayISO()

  // Challenges where we are creator — full access via challenges_all_creator
  const { data: asCreator } = await supabase
    .from('challenges')
    .select('*')
    .eq('created_by', user.id)
    .in('status', ['pending', 'active'])

  // Challenges where we are the invitee — readable via challenges_select_invitee
  const { data: asInvitee } = await supabase
    .from('challenges')
    .select('*')
    .eq('invitee_id', user.id)
    .in('status', ['pending', 'active'])

  // Challenges where we are a joined participant (but not creator or invitee already)
  const { data: myParticipations } = await supabase
    .from('challenge_participants')
    .select('challenge_id')
    .eq('user_id', user.id)

  const participantChallengeIds = (myParticipations ?? []).map(p => p.challenge_id)
  const alreadyIncluded = new Set([
    ...(asCreator ?? []).map(c => c.id),
    ...(asInvitee ?? []).map(c => c.id),
  ])
  const extraIds = participantChallengeIds.filter(id => !alreadyIncluded.has(id))

  const { data: asParticipant } = extraIds.length
    ? await supabase
        .from('challenges')
        .select('*')
        .in('id', extraIds)
        .in('status', ['pending', 'active'])
    : { data: [] }

  // Deduplicate and sort by created_at descending
  const seen = new Set<string>()
  const all: Challenge[] = []
  for (const c of [
    ...(asCreator     ?? []),
    ...(asInvitee     ?? []),
    ...(asParticipant ?? []),
  ] as Challenge[]) {
    if (!seen.has(c.id)) { seen.add(c.id); all.push(c) }
  }

  // Expire challenges whose end date has passed (mark completed server-side lazily)
  const expired = all.filter(c =>
    c.status === 'active' && c.ends_at && c.ends_at < today,
  )
  if (expired.length) {
    await Promise.all(
      expired.map(c =>
        supabase
          .from('challenges')
          .update({ status: 'completed' })
          .eq('id', c.id)
          .then(() => { c.status = 'completed' })
      ),
    )
  }

  // Filter to only pending/active after expiry check
  const active = all.filter(c => c.status === 'pending' || c.status === 'active')
  active.sort((a, b) => b.created_at.localeCompare(a.created_at))

  return buildChallengeViews(supabase, active)
}

/**
 * Fetches completed and cancelled challenges the current user participated in.
 * Used for the "Past" tab on the challenges list screen.
 */
export async function fetchCompletedChallenges(
  supabase: SupabaseClient,
): Promise<ChallengeWithParticipants[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: myParticipations } = await supabase
    .from('challenge_participants')
    .select('challenge_id')
    .eq('user_id', user.id)

  const ids = (myParticipations ?? []).map(p => p.challenge_id)

  const { data: creatorCompleted } = await supabase
    .from('challenges')
    .select('*')
    .eq('created_by', user.id)
    .in('status', ['completed', 'cancelled'])

  const { data: participantCompleted } = ids.length
    ? await supabase
        .from('challenges')
        .select('*')
        .in('id', ids)
        .in('status', ['completed', 'cancelled'])
    : { data: [] }

  const seen = new Set<string>()
  const all: Challenge[] = []
  for (const c of [...(creatorCompleted ?? []), ...(participantCompleted ?? [])] as Challenge[]) {
    if (!seen.has(c.id)) { seen.add(c.id); all.push(c) }
  }
  all.sort((a, b) => b.created_at.localeCompare(a.created_at))

  return buildChallengeViews(supabase, all)
}

/**
 * Fetches a single challenge by ID including participants and habit name.
 * Also lazily marks it completed if the end date has passed.
 */
export async function fetchChallengeById(
  supabase: SupabaseClient,
  id: string,
): Promise<ChallengeWithParticipants | null> {
  const today = todayISO()

  const { data: challenge, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !challenge) return null

  // Lazily complete if expired
  if (
    challenge.status === 'active' &&
    challenge.ends_at &&
    challenge.ends_at < today
  ) {
    await supabase.from('challenges').update({ status: 'completed' }).eq('id', id)
    challenge.status = 'completed'
  }

  const views = await buildChallengeViews(supabase, [challenge as Challenge])
  return views[0] ?? null
}
