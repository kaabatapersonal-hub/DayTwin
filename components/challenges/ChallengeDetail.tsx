'use client'

import { useState }                      from 'react'
import { useRouter }                     from 'next/navigation'
import type { ChallengeWithParticipants } from '@/types'
import { ScoreBattleDetail }             from '@/components/challenges/ScoreBattleDetail'
import { HabitPactDetail }               from '@/components/challenges/HabitPactDetail'
import { FriendsFeedDetail }             from '@/components/challenges/FriendsFeedDetail'
import { PoolInfo }                      from '@/components/challenges/PoolInfo'

interface ChallengeDetailProps {
  data:      ChallengeWithParticipants
  myUserId:  string
}

const TYPE_LABEL: Record<string, string> = {
  score_battle: 'Score Battle',
  habit_pact:   'Habit Pact',
  friends_feed: 'Friends Feed',
}

const TYPE_COLOR: Record<string, string> = {
  score_battle: '#2DD4BF',
  habit_pact:   '#D9A653',
  friends_feed: '#8B7AD1',
}

/**
 * Top-level challenge detail wrapper.
 *
 * Responsibilities:
 * - Header: back arrow, challenge type label + status badge
 * - Accept / Decline buttons when the user is the invitee and status=pending
 * - Routes to the appropriate type-specific component
 */
export function ChallengeDetail({ data, myUserId }: ChallengeDetailProps) {
  const { challenge, participants } = data
  const router   = useRouter()
  const [acting, setActing] = useState<'joining' | 'declining' | null>(null)
  const [ended,  setEnded]  = useState(false)

  const isInvitee  = challenge.invitee_id === myUserId
  const isPending  = challenge.status === 'pending'
  const showInvite = isInvitee && isPending

  const color = TYPE_COLOR[challenge.type] ?? '#fff'
  const label = TYPE_LABEL[challenge.type] ?? challenge.type

  const statusLabel = ended
    ? 'Ended'
    : challenge.status === 'pending'
    ? 'Pending'
    : challenge.status === 'active'
    ? 'Active'
    : challenge.status === 'completed'
    ? 'Completed'
    : 'Cancelled'

  async function handleJoin() {
    setActing('joining')
    const res = await fetch('/api/challenges/join', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ challenge_id: challenge.id }),
    })
    if (res.ok) {
      router.refresh()
    } else {
      setActing(null)
    }
  }

  async function handleDecline() {
    setActing('declining')
    await fetch('/api/challenges/decline', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ challenge_id: challenge.id }),
    })
    router.push('/friends/challenges')
  }

  const other = participants.find(p => p.user_id !== myUserId)

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-5">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.06] active:bg-white/10 transition-colors"
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className="text-white/60">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-body font-medium uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${color}18`, color }}
            >
              {label}
            </span>
            <span
              className={`text-[10px] font-body uppercase tracking-widest ${
                challenge.status === 'active' ? 'text-teal' :
                challenge.status === 'pending' ? 'text-white/40' :
                'text-white/25'
              }`}
            >
              {statusLabel}
            </span>
          </div>
          {other && (
            <p className="text-sm font-body text-white/40 mt-0.5 truncate">
              vs {other.display_name ?? other.username}
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 pb-8 space-y-5">
        {/* Invite accept / decline — shown only to invitee when pending */}
        {showInvite && (
          <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl px-4 py-4 space-y-3">
            <p className="text-sm font-body text-white/60">
              {other?.display_name ?? other?.username ?? 'Someone'} challenged you to a {label.toLowerCase()}.
            </p>
            {data.habit_name && (
              <p className="text-xs font-body text-white/35">
                Habit: {data.habit_name}
              </p>
            )}
            <PoolInfo challenge={challenge} />
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleJoin}
                disabled={acting !== null}
                className="flex-1 py-3 rounded-2xl bg-teal text-[#080808] font-body font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                {acting === 'joining' ? 'Joining…' : 'Accept'}
              </button>
              <button
                onClick={handleDecline}
                disabled={acting !== null}
                className="flex-1 py-3 rounded-2xl bg-white/[0.06] text-white/50 font-body font-medium text-sm disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                {acting === 'declining' ? 'Declining…' : 'Decline'}
              </button>
            </div>
          </div>
        )}

        {/* Type-specific detail — hidden while still pending for invitee (no participant row yet) */}
        {!showInvite && (
          <>
            {challenge.type === 'score_battle' && (
              <ScoreBattleDetail initialData={data} myUserId={myUserId} />
            )}
            {challenge.type === 'habit_pact' && (
              <HabitPactDetail data={data} myUserId={myUserId} />
            )}
            {challenge.type === 'friends_feed' && (
              <FriendsFeedDetail
                data={data}
                myUserId={myUserId}
                onEnded={() => { setEnded(true); router.push('/friends/challenges') }}
              />
            )}
          </>
        )}

        {/* Pending state for creator (waiting for invitee to accept) */}
        {isPending && !showInvite && (
          <div className="bg-white/[0.04] rounded-2xl px-4 py-5 text-center space-y-2">
            <p className="text-sm font-body text-white/40">
              Waiting for {other?.display_name ?? other?.username ?? 'them'} to accept
            </p>
            <PoolInfo challenge={challenge} />
          </div>
        )}
      </div>
    </div>
  )
}
