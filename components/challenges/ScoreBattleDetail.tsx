'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient }                  from '@/lib/supabase/client'
import type { ChallengeWithParticipants, ChallengeParticipantView } from '@/types'
import { AvatarInitials }                from '@/components/friends/FriendList'
import { PoolInfo }                      from '@/components/challenges/PoolInfo'

interface ScoreBattleDetailProps {
  initialData: ChallengeWithParticipants
  myUserId:    string
}

/**
 * Score Battle detail screen with live leaderboard.
 *
 * Subscribes to postgres_changes on challenge_participants for the challenge ID.
 * The sync_challenge_score trigger keeps current_score updated on daily_scores changes.
 * Realtime must be enabled for challenge_participants in Supabase Dashboard.
 *
 * Completion is detected lazily: when the challenge ends_at has passed the
 * fetchChallengeById + fetchMyChallenges functions update status to 'completed'.
 * The UI also computes a local completion indicator from the challenge data.
 */
export function ScoreBattleDetail({ initialData, myUserId }: ScoreBattleDetailProps) {
  const [participants, setParticipants] = useState<ChallengeParticipantView[]>(
    initialData.participants,
  )
  const { challenge } = initialData
  const supabase      = useRef(createClient()).current

  useEffect(() => {
    // Subscribe to live updates for this challenge's participants
    const channel = supabase
      .channel(`challenge:${challenge.id}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'challenge_participants',
          filter: `challenge_id=eq.${challenge.id}`,
        },
        (payload: { new: { id: string; current_score: number } }) => {
          setParticipants(prev =>
            prev.map(p =>
              p.id === payload.new.id
                ? { ...p, current_score: payload.new.current_score }
                : p,
            ),
          )
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [challenge.id, supabase])

  const me    = participants.find(p => p.user_id === myUserId)
  const other = participants.find(p => p.user_id !== myUserId)

  const myScore    = me?.current_score    ?? 0
  const otherScore = other?.current_score ?? 0

  const isCompleted = challenge.status === 'completed'
  const isCancelled = challenge.status === 'cancelled'
  const isEnded     = isCompleted || isCancelled

  const remaining = challenge.ends_at
    ? Math.max(0, Math.ceil(
        (new Date(`${challenge.ends_at}T00:00:00`).getTime() - Date.now()) / 86400000,
      ))
    : null

  // Determine winner from scores at end
  let winnerLabel: string | null = null
  if (isCompleted) {
    if (myScore > otherScore) {
      winnerLabel = `You win! (${myScore} vs ${otherScore})`
    } else if (otherScore > myScore) {
      const name = other?.display_name ?? other?.username ?? 'Them'
      winnerLabel = `${name} wins (${otherScore} vs ${myScore})`
    } else {
      winnerLabel = `Tie! (${myScore} each)`
    }
  }

  return (
    <div className="space-y-5">
      {/* Days remaining / ended */}
      {!isEnded && remaining !== null && (
        <div className="flex items-center justify-center gap-2 bg-white/[0.04] rounded-2xl py-3">
          <span className="text-xl font-heading font-bold text-white tabular-nums">{remaining}</span>
          <span className="text-sm font-body text-white/35">
            {remaining === 1 ? 'day' : 'days'} remaining
          </span>
        </div>
      )}

      {/* Winner banner */}
      {winnerLabel && (
        <div className="flex items-center justify-center gap-2 bg-teal/[0.08] border border-teal/20 rounded-2xl py-3.5 px-4">
          <span className="text-xl">{myScore >= otherScore ? '🏆' : '🥈'}</span>
          <p className="text-sm font-body font-medium text-teal">{winnerLabel}</p>
        </div>
      )}

      {isCancelled && !winnerLabel && (
        <div className="flex items-center gap-3 bg-white/[0.04] rounded-2xl px-4 py-3.5">
          <p className="text-sm font-body text-white/40">Challenge cancelled</p>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white/[0.04] rounded-2xl overflow-hidden">
        <p className="text-xs font-body text-white/40 uppercase tracking-widest px-4 pt-4 pb-3">
          Leaderboard
        </p>
        <LeaderboardRow participant={me   ?? null} score={myScore}    isMe rank={myScore >= otherScore ? 1 : 2} />
        <div className="h-px bg-white/[0.04] mx-4" />
        <LeaderboardRow participant={other ?? null} score={otherScore} isMe={false} rank={otherScore > myScore ? 1 : 2} />
      </div>

      <p className="text-[11px] font-body text-white/25 text-center">
        Scores update automatically as daily scores are recorded
      </p>

      {/* Pool info */}
      <PoolInfo challenge={challenge} />
    </div>
  )
}

function LeaderboardRow({
  participant, score, isMe, rank,
}: {
  participant: ChallengeParticipantView | null
  score:       number
  isMe:        boolean
  rank:        number
}) {
  if (!participant) return null
  const name = participant.display_name ?? participant.username ?? (isMe ? 'You' : 'Them')

  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <span className="text-base font-heading font-bold text-white/20 w-4 text-center tabular-nums">
        {rank}
      </span>
      <AvatarInitials name={name} userId={participant.user_id} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-body font-medium text-white truncate">
          {isMe ? 'You' : name}
        </p>
        <p className="text-[11px] font-body text-white/30">
          avg daily score
        </p>
      </div>
      <span
        className={`text-2xl font-heading font-bold tabular-nums ${
          isMe ? 'text-teal' : 'text-white/60'
        }`}
      >
        {score}
      </span>
    </div>
  )
}
