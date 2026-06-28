'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient }                  from '@/lib/supabase/client'
import type { ChallengeWithParticipants, FriendScoreDay } from '@/types'
import { AvatarInitials }                from '@/components/friends/FriendList'
import { todayISO, shortWeekday }        from '@/lib/format'

interface FriendsFeedDetailProps {
  data:      ChallengeWithParticipants
  myUserId:  string
  onEnded:   () => void
}

/**
 * Friends Feed detail screen.
 * No competition — shows both participants' last 7 days of scores side by side.
 * Either participant can end the feed at any time.
 *
 * Score data is fetched client-side so both participants' scores are loaded
 * with the authenticated session (RLS friend policy allows this since they're
 * accepted friends who are also challenge participants).
 */
export function FriendsFeedDetail({ data, myUserId, onEnded }: FriendsFeedDetailProps) {
  const { challenge, participants } = data

  const me    = participants.find(p => p.user_id === myUserId)
  const other = participants.find(p => p.user_id !== myUserId)

  const [scores, setScores]   = useState<Record<string, FriendScoreDay[]>>({})
  const [ending, setEnding]   = useState(false)
  const supabase               = useRef(createClient()).current

  useEffect(() => {
    if (!me || !other) return
    const userIds = [me.user_id, other.user_id]
    const sevenDaysAgo = (() => {
      const d = new Date()
      d.setDate(d.getDate() - 6)
      return d.toISOString().slice(0, 10)
    })()

    supabase
      .from('daily_scores')
      .select('user_id, date, score_pct')
      .in('user_id', userIds)
      .gte('date', sevenDaysAgo)
      .then(({ data: rows }: { data: { user_id: string; date: string; score_pct: number }[] | null }) => {
        const map: Record<string, FriendScoreDay[]> = {}
        for (const uid of userIds) {
          map[uid] = (rows ?? [])
            .filter(r => r.user_id === uid)
            .map(r => ({ date: r.date, score_pct: r.score_pct }))
        }
        setScores(map)
      })
  }, [me, other, supabase])

  async function handleEnd() {
    setEnding(true)
    try {
      await fetch('/api/challenges/end', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ challenge_id: challenge.id }),
      })
      onEnded()
    } finally {
      setEnding(false)
    }
  }

  const isCancelled = challenge.status === 'cancelled'

  return (
    <div className="space-y-5">
      <p className="text-sm font-body text-white/40">
        {isCancelled
          ? 'Feed ended.'
          : `Active since ${new Date(`${challenge.starts_at}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        }
      </p>

      {/* Side-by-side 7-day score bars */}
      {me && other && (
        <div className="flex gap-4">
          <SideChart
            label={me.display_name ?? me.username ?? 'You'}
            userId={me.user_id}
            scoreHistory={scores[me.user_id] ?? []}
            isMe
          />
          <SideChart
            label={other.display_name ?? other.username ?? 'them'}
            userId={other.user_id}
            scoreHistory={scores[other.user_id] ?? []}
          />
        </div>
      )}

      {/* End feed button — available to both participants while active */}
      {!isCancelled && (
        <button
          onClick={handleEnd}
          disabled={ending}
          className="w-full py-3.5 rounded-2xl bg-white/[0.06] text-white/45 font-body font-medium text-sm disabled:opacity-40 active:scale-[0.98] transition-transform"
        >
          {ending ? 'Ending…' : 'End feed'}
        </button>
      )}
    </div>
  )
}

/**
 * Single participant's 7-day score column.
 * Shows a bar chart with day labels below and name above.
 */
function SideChart({
  label, userId, scoreHistory, isMe = false,
}: {
  label:        string
  userId:       string
  scoreHistory: FriendScoreDay[]
  isMe?:        boolean
}) {
  const today = todayISO()

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${today}T00:00:00`)
    d.setDate(d.getDate() - (6 - i))
    const iso  = d.toISOString().slice(0, 10)
    const entry = scoreHistory.find(s => s.date === iso)
    return { iso, label: shortWeekday(iso), score_pct: entry?.score_pct ?? null }
  })

  const maxScore = Math.max(...days.map(d => d.score_pct ?? 0), 1)

  return (
    <div className="flex-1 bg-white/[0.04] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <AvatarInitials name={label} userId={userId} />
        <p className="text-xs font-body font-medium text-white truncate">{label}</p>
      </div>

      <div className="flex items-end gap-1.5 h-12">
        {days.map(d => {
          const isToday = d.iso === today
          const height  = d.score_pct !== null ? Math.max((d.score_pct / maxScore) * 100, 10) : 10
          const isEmpty = d.score_pct === null

          return (
            <div key={d.iso} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end" style={{ height: '44px' }}>
                <div
                  className={`w-full rounded-sm ${
                    isEmpty   ? 'bg-white/[0.06]'          :
                    isToday   ? (isMe ? 'bg-teal' : 'bg-[#8B7AD1]') :
                               (isMe ? 'bg-teal/30' : 'bg-[#8B7AD1]/30')
                  }`}
                  style={{ height: `${isEmpty ? 10 : height}%` }}
                />
              </div>
              <span className="text-[8px] font-body text-white/20">{d.label.slice(0, 1)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
