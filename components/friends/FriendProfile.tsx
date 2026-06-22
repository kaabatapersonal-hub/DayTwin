'use client'

import { useState, useEffect } from 'react'
import { useRouter }            from 'next/navigation'
import type { FriendView, FriendProfileData, FriendScoreDay } from '@/types'
import { growthLevel, shortWeekday, todayISO }                 from '@/lib/format'
import { AvatarInitials }                                       from './FriendList'

interface FriendProfileProps {
  friend:    FriendView
  onClose:   () => void
  onRemoved: () => void   // called after remove/block so parent re-fetches
}

/**
 * Full-screen overlay showing a friend's profile.
 *
 * Data is fetched from /api/friends/profile/[userId] on mount, which calls
 * the get_friend_scores and get_friend_consistency security-definer RPCs.
 * This keeps all column-restriction logic server-side rather than relying
 * on the client to not query breakdown or habit names.
 */
export function FriendProfile({ friend, onClose, onRemoved }: FriendProfileProps) {
  const router = useRouter()

  const [profile,      setProfile]      = useState<FriendProfileData | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [showActions,  setShowActions]  = useState(false)
  const [acting,       setActing]       = useState(false)
  const [actionError,  setActionError]  = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/friends/profile/${friend.user_id}`)
        if (!res.ok) throw new Error('Could not load profile')
        const data = await res.json() as FriendProfileData
        setProfile(data)
      } catch {
        setError('Could not load profile right now.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [friend.user_id])

  async function handleRemove() {
    setActing(true)
    setActionError(null)
    try {
      const res = await fetch('/api/friends/remove', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ friendship_id: friend.friendship_id }),
      })
      if (!res.ok) throw new Error('Failed to remove')
      onClose()
      onRemoved()
    } catch {
      setActionError('Something went wrong. Try again.')
    } finally {
      setActing(false)
    }
  }

  async function handleBlock() {
    setActing(true)
    setActionError(null)
    try {
      const res = await fetch('/api/friends/block', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ target_user_id: friend.user_id }),
      })
      if (!res.ok) throw new Error('Failed to block')
      onClose()
      onRemoved()
    } catch {
      setActionError('Something went wrong. Try again.')
    } finally {
      setActing(false)
    }
  }

  const level = growthLevel(profile?.sparks_lifetime ?? friend.sparks_lifetime)

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-safe-top pt-4 pb-2">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center"
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>

        <button
          onClick={() => setShowActions(true)}
          className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center"
          aria-label="More options"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="5"  r="1" fill="currentColor"/>
            <circle cx="12" cy="12" r="1" fill="currentColor"/>
            <circle cx="12" cy="19" r="1" fill="currentColor"/>
          </svg>
        </button>
      </div>

      {/* Profile hero */}
      <div className="flex flex-col items-center px-5 pt-6 pb-8">
        <AvatarInitials
          name={friend.display_name ?? friend.username ?? '?'}
          userId={friend.user_id}
          size="lg"
        />

        <h1 className="font-heading text-2xl font-bold text-white mt-4 mb-0.5">
          {friend.display_name ?? friend.username ?? 'Unknown'}
        </h1>
        {friend.username && (
          <p className="text-sm font-body text-white/35 mb-2">@{friend.username}</p>
        )}
        <div className="flex items-center gap-1.5 bg-white/[0.06] px-3 py-1 rounded-full">
          <span className="text-gold text-xs">⚡</span>
          <span className="text-xs font-body text-white/60">Level {level}</span>
        </div>
      </div>

      {loading && (
        <div className="px-5 space-y-4">
          <div className="h-24 bg-white/[0.04] rounded-2xl animate-pulse" />
          <div className="h-16 bg-white/[0.04] rounded-2xl animate-pulse" />
        </div>
      )}

      {error && (
        <p className="text-sm font-body text-white/30 text-center px-8 mt-4">{error}</p>
      )}

      {profile && (
        <div className="px-5 space-y-5 pb-32">
          {/* 7-day score chart */}
          <ScoreChart scoreHistory={profile.score_history} />

          {/* Consistency */}
          <div className="bg-white/[0.04] rounded-3xl p-5">
            <p className="text-xs font-body text-white/40 uppercase tracking-widest mb-3">
              30-Day Consistency
            </p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-heading font-bold text-white tabular-nums">
                {profile.consistency_30d_pct}
              </span>
              <span className="text-lg font-body text-white/40 mb-1">%</span>
            </div>
            <p className="text-xs font-body text-white/30 mt-1">habits completed on average</p>
          </div>

          {/* Badges — placeholder */}
          <div className="bg-white/[0.04] rounded-3xl p-5">
            <p className="text-xs font-body text-white/40 uppercase tracking-widest mb-4">
              Badges
            </p>
            <p className="text-sm font-body text-white/25 text-center py-4">
              No badges earned yet
            </p>
          </div>
        </div>
      )}

      {/* Challenge FAB */}
      <div className="fixed bottom-8 left-0 right-0 px-5">
        <button
          onClick={() => router.push('/friends/challenges')}
          className="w-full py-4 rounded-2xl bg-teal text-background font-body font-semibold text-base active:scale-[0.98] transition-transform"
        >
          Challenge
        </button>
      </div>

      {/* Actions sheet */}
      {showActions && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <button onClick={() => setShowActions(false)} className="flex-1 bg-black/50" aria-label="Close" />
          <div className="bg-[#141414] rounded-t-3xl px-5 pt-5 pb-safe-bottom pb-8">
            <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-6" />

            {actionError && (
              <p className="text-xs text-red-400 font-body text-center mb-4">{actionError}</p>
            )}

            <button
              onClick={handleRemove}
              disabled={acting}
              className="w-full py-4 rounded-2xl bg-white/[0.06] text-white/60 font-body font-medium text-base disabled:opacity-40 active:scale-[0.98] transition-transform mb-3"
            >
              Remove friend
            </button>
            <button
              onClick={handleBlock}
              disabled={acting}
              className="w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-body font-medium text-base disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              Block
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 7-day score bar chart.
 * Builds a complete 7-day window (today - 6 to today) and fills in scores
 * where available. Days with no data get an empty bar.
 */
function ScoreChart({ scoreHistory }: { scoreHistory: FriendScoreDay[] }) {
  const today = todayISO()

  // Build ordered array: 6 days ago → today
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${today}T00:00:00`)
    d.setDate(d.getDate() - (6 - i))
    const iso   = d.toISOString().slice(0, 10)
    const score = scoreHistory.find(s => s.date === iso)
    return { iso, label: shortWeekday(iso), score_pct: score?.score_pct ?? null }
  })

  const maxScore = Math.max(...days.map(d => d.score_pct ?? 0), 1)

  return (
    <div className="bg-white/[0.04] rounded-3xl p-5">
      <p className="text-xs font-body text-white/40 uppercase tracking-widest mb-5">
        This Week
      </p>

      <div className="flex items-end gap-2 h-16">
        {days.map(d => {
          const isToday = d.iso === today
          const height  = d.score_pct !== null ? Math.max((d.score_pct / maxScore) * 100, 8) : 8
          const isEmpty = d.score_pct === null

          return (
            <div key={d.iso} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex flex-col justify-end" style={{ height: '60px' }}>
                <div
                  className={`w-full rounded-sm transition-all ${
                    isEmpty   ? 'bg-white/[0.06]'   :
                    isToday   ? 'bg-teal'            :
                                'bg-teal/40'
                  }`}
                  style={{ height: `${isEmpty ? 8 : height}%` }}
                />
              </div>
              <span className={`text-[10px] font-body ${isToday ? 'text-white/60' : 'text-white/25'}`}>
                {d.label.slice(0, 1)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
