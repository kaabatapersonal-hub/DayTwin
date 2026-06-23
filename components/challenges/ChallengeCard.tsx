'use client'

import Link from 'next/link'
import type { ChallengeWithParticipants } from '@/types'
import { AvatarInitials } from '@/components/friends/FriendList'

interface ChallengeCardProps {
  item:     ChallengeWithParticipants
  myUserId: string
}

/** Type label + icon for each challenge type. */
function typeLabel(type: string) {
  if (type === 'score_battle')  return { label: 'Score Battle',  color: '#2DD4BF' }
  if (type === 'habit_pact')    return { label: 'Habit Pact',    color: '#D9A653' }
  return                                { label: 'Friends Feed',  color: '#8B7AD1' }
}

/** Days remaining until a challenge ends. Null for friends_feed with no end date. */
function daysRemaining(endsAt: string | null): number | null {
  if (!endsAt) return null
  const diff = Math.ceil(
    (new Date(`${endsAt}T00:00:00`).getTime() - Date.now()) / (86400 * 1000),
  )
  return Math.max(0, diff)
}

/**
 * Compact card for the challenges list — links to the challenge detail page.
 * Shows: type badge, opponent, score/status, days remaining.
 */
export function ChallengeCard({ item, myUserId }: ChallengeCardProps) {
  const { challenge, participants, habit_name } = item
  const { label, color } = typeLabel(challenge.type)

  // Determine who the opponent is
  const me    = participants.find(p => p.user_id === myUserId)
  const other = participants.find(p => p.user_id !== myUserId)

  const remaining   = daysRemaining(challenge.ends_at)
  const isPending   = challenge.status === 'pending'
  const isCompleted = challenge.status === 'completed' || challenge.status === 'cancelled'

  return (
    <Link
      href={`/friends/challenges/${challenge.id}`}
      className="block bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 active:bg-white/[0.07] transition-colors"
    >
      {/* Type badge + status */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[10px] font-body font-medium uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${color}18`, color }}
        >
          {label}
        </span>
        <span className="text-[11px] font-body text-white/30">
          {isPending
            ? 'Waiting for response'
            : isCompleted
            ? 'Ended'
            : remaining !== null
            ? `${remaining}d left`
            : 'Active'}
        </span>
      </div>

      {/* Participants */}
      <div className="flex items-center gap-3">
        {other && (
          <AvatarInitials
            name={other.display_name ?? other.username ?? '?'}
            userId={other.user_id}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-body font-medium text-white">
            {other?.display_name ?? other?.username ?? 'Invited'}
          </p>
          {challenge.type === 'habit_pact' && habit_name && (
            <p className="text-[11px] font-body text-white/35 truncate">{habit_name}</p>
          )}
          {challenge.type === 'score_battle' && !isPending && (
            <p className="text-[11px] font-body text-white/35 tabular-nums">
              You {me?.current_score ?? 0} · {other?.display_name ?? 'them'} {other?.current_score ?? 0}
            </p>
          )}
          {challenge.type === 'habit_pact' && !isPending && (
            <p className="text-[11px] font-body text-white/35">
              {me?.streak_held === false ? 'Pact broken' : 'Pact holding'}
            </p>
          )}
        </div>

        {/* Score battle mini-score */}
        {challenge.type === 'score_battle' && !isPending && me && (
          <div className="text-right">
            <span className="text-xl font-heading font-bold text-teal tabular-nums">
              {me.current_score}
            </span>
            <p className="text-[10px] font-body text-white/25">avg</p>
          </div>
        )}
      </div>

      {/* Pending invite indicator */}
      {isPending && challenge.invitee_id === myUserId && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex justify-between items-center">
          <p className="text-xs font-body text-white/50">You&apos;ve been challenged</p>
          <span className="text-xs font-body text-teal">Respond →</span>
        </div>
      )}
    </Link>
  )
}
