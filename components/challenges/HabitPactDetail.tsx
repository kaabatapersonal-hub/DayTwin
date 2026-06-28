'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient }                  from '@/lib/supabase/client'
import type { ChallengeWithParticipants } from '@/types'
import { AvatarInitials }                from '@/components/friends/FriendList'

interface HabitPactDetailProps {
  data:      ChallengeWithParticipants
  myUserId:  string
}

interface HabitLogRow {
  user_id:   string
  date:      string
  completed: boolean
}

/**
 * Habit Pact detail screen.
 *
 * Shows:
 * - The shared pact habit name (visible to both because they explicitly joined)
 * - A shared "pact streak" = count of days BOTH participants completed the habit
 * - Each participant's completion rate for the challenge period
 * - Whether the pact is still held (streak_held from DB, updated by trigger)
 * - Days remaining, or completion/broken state
 *
 * Habit logs are fetched client-side for the challenge window.
 * Both participants' logs for the pact habit are readable because:
 * 1. The user's own logs are always readable (habit_logs_all_own)
 * 2. The other participant's logs are NOT directly readable (private)
 * — so we compute the shared streak from only the data we can read.
 *
 * The DB trigger (check_habit_pact) is the authoritative miss detector.
 * The UI reads streak_held from challenge_participants to show the pact status.
 */
export function HabitPactDetail({ data, myUserId }: HabitPactDetailProps) {
  const { challenge, participants, habit_name } = data

  const me    = participants.find(p => p.user_id === myUserId)
  const other = participants.find(p => p.user_id !== myUserId)

  const [myLogs,    setMyLogs]    = useState<HabitLogRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const supabase                   = useRef(createClient()).current

  useEffect(() => {
    if (!challenge.habit_id) { setLoading(false); return }

    // Fetch my own habit logs for the pact habit over the challenge window
    // (Other participant's logs are private — we only compute what we can verify)
    supabase
      .from('habit_logs')
      .select('user_id, date, completed')
      .eq('habit_id', challenge.habit_id)
      .eq('user_id', myUserId)
      .gte('date', challenge.starts_at)
      .then(({ data: rows }: { data: { user_id: string; date: string; completed: boolean }[] | null }) => {
        setMyLogs((rows ?? []).map(r => ({
          user_id:   r.user_id,
          date:      r.date,
          completed: r.completed,
        })))
        setLoading(false)
      })
  }, [challenge.habit_id, challenge.starts_at, myUserId, supabase])

  const isActive = challenge.status === 'active'
  const isEnded  = challenge.status === 'completed' || challenge.status === 'cancelled'

  // Days since start (inclusive)
  const daysSinceStart = Math.floor(
    (Date.now() - new Date(`${challenge.starts_at}T00:00:00`).getTime()) / 86400000,
  ) + 1

  // My completion rate for the challenge period
  const myCompleted  = myLogs.filter(l => l.completed).length
  const myTotal      = Math.min(daysSinceStart, myLogs.length || daysSinceStart)
  const myPct        = myTotal > 0 ? Math.round((myCompleted / myTotal) * 100) : 0

  // Days remaining
  const remaining = challenge.ends_at
    ? Math.max(0, Math.ceil(
        (new Date(`${challenge.ends_at}T00:00:00`).getTime() - Date.now()) / 86400000,
      ))
    : null

  // Pact broken? Either participant's streak_held = false
  const pactBroken = participants.some(p => p.streak_held === false)

  // Successful completion: ended naturally without being broken
  const pactSuccess = isEnded && !pactBroken && challenge.status === 'completed'

  return (
    <div className="space-y-5">
      {/* Pact status banner */}
      {isActive && !pactBroken && (
        <div className="flex items-center gap-3 bg-gold/[0.08] border border-gold/20 rounded-2xl px-4 py-3.5">
          <span className="text-2xl">🤝</span>
          <div>
            <p className="text-sm font-body font-medium text-gold">Pact holding</p>
            <p className="text-xs font-body text-white/40">
              {remaining !== null ? `${remaining} day${remaining !== 1 ? 's' : ''} remaining` : ''}
            </p>
          </div>
        </div>
      )}

      {pactBroken && !isEnded && (
        <div className="flex items-center gap-3 bg-red-500/[0.08] border border-red-500/20 rounded-2xl px-4 py-3.5">
          <span className="text-2xl">💔</span>
          <div>
            <p className="text-sm font-body font-medium text-red-400">Pact broken</p>
            <p className="text-xs font-body text-white/40">Someone missed a day with no grace left</p>
          </div>
        </div>
      )}

      {pactSuccess && (
        <div className="flex items-center gap-3 bg-teal/[0.08] border border-teal/20 rounded-2xl px-4 py-3.5">
          <span className="text-2xl">🎉</span>
          <p className="text-sm font-body font-medium text-teal">Pact held for the full run!</p>
        </div>
      )}

      {/* Pact habit */}
      <div className="bg-white/[0.04] rounded-2xl px-4 py-4">
        <p className="text-xs font-body text-white/40 uppercase tracking-widest mb-1">Pact habit</p>
        <p className="text-base font-body font-medium text-white">{habit_name ?? '—'}</p>
      </div>

      {/* My stats */}
      {!loading && (
        <div className="bg-white/[0.04] rounded-2xl px-4 py-4">
          <p className="text-xs font-body text-white/40 uppercase tracking-widest mb-3">Your progress</p>
          <div className="flex items-center gap-3">
            {me && <AvatarInitials name={me.display_name ?? me.username ?? 'You'} userId={me.user_id} />}
            <div>
              <p className="text-2xl font-heading font-bold text-white tabular-nums">{myPct}%</p>
              <p className="text-xs font-body text-white/35">{myCompleted} of {myTotal} days completed</p>
            </div>
          </div>
        </div>
      )}

      {/* Other participant */}
      {other && (
        <div className="bg-white/[0.04] rounded-2xl px-4 py-4">
          <p className="text-xs font-body text-white/40 uppercase tracking-widest mb-3">
            {other.display_name ?? other.username ?? 'Them'}
          </p>
          <div className="flex items-center gap-3">
            <AvatarInitials
              name={other.display_name ?? other.username ?? '?'}
              userId={other.user_id}
            />
            <div>
              <p className="text-sm font-body text-white/40">
                {other.streak_held === false
                  ? 'Missed a day (pact broken)'
                  : other.streak_held === true
                  ? 'Holding the pact'
                  : 'Stats pending'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Log today */}
      {isActive && !pactBroken && (
        <p className="text-xs font-body text-white/30 text-center">
          Complete &quot;{habit_name}&quot; in the Habits tab to count for today.
        </p>
      )}
    </div>
  )
}
