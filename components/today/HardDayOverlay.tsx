'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchLast30DayScores } from '@/lib/scores'
import { fetchRecentWins } from '@/lib/reflections'
import { fetchGoal } from '@/lib/goals'
import { loadFutureMe, type FutureMeRecord } from '@/lib/future-me'
import { formatDuration } from '@/lib/format'
import {
  HARD_DAY_HEADING, daysShownUpLabel, FUTURE_ME_FALLBACK,
} from '@/lib/copy'

interface HardDayOverlayProps {
  activeGoalId: string | null   // most recently active goal — pre-fetched by today page
  onClose:      () => void
}

interface OverlayData {
  whyText:      string | null
  goalTitle:    string | null
  daysShownUp:  number
  recentWins:   { date: string; went_well: string }[]
  futureMeEntry: FutureMeRecord | null
}

/**
 * Full-screen Hard Day overlay.
 *
 * Opens full screen (not a modal) — the spec deliberately chose this to give
 * the moment enough space. Close button is top-left only; no swipe-to-dismiss
 * because an accidental swipe while already struggling would be worse than
 * requiring one intentional tap.
 *
 * Data is fetched lazily on open rather than at page load time — avoids
 * slowing down the Today page for content only needed during hard moments.
 *
 * Future Me playback is IndexedDB only. The network tab shows zero outbound
 * requests when it plays — by design, see lib/future-me.ts.
 */
export function HardDayOverlay({ activeGoalId, onClose }: HardDayOverlayProps) {
  const [data,    setData]    = useState<OverlayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const supabase = createClient()

  // Fetch all overlay data when the overlay mounts
  useEffect(() => {
    async function load() {
      try {
        const [scoresData, winsData] = await Promise.all([
          fetchLast30DayScores(supabase),
          fetchRecentWins(supabase, 3),
        ])

        // A day counts as "shown up" if score_pct > 0 (anything was done)
        const daysShownUp = scoresData.filter(s => s.score_pct > 0).length

        // Fetch goal why_text only when we have an active goal
        let whyText:   string | null = null
        let goalTitle: string | null = null
        if (activeGoalId) {
          const goal = await fetchGoal(supabase, activeGoalId)
          whyText   = goal?.why_text   ?? null
          goalTitle = goal?.title      ?? null
        }

        // Future Me is IndexedDB — zero network calls
        const futureMeEntry = activeGoalId
          ? await loadFutureMe(activeGoalId).catch(() => null)
          : null

        if (futureMeEntry?.blob) {
          const url = URL.createObjectURL(futureMeEntry.blob)
          if (futureMeEntry.type === 'video') setVideoUrl(url)
          else setAudioUrl(url)
        }

        setData({ whyText, goalTitle, daysShownUp, recentWins: winsData, futureMeEntry })
      } finally {
        setLoading(false)
      }
    }
    load()

    return () => {
      // Clean up object URLs on unmount
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center px-5 pt-safe-top pb-4">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-white/50 active:text-white"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6"  y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 px-5 pb-safe-bottom pb-12 space-y-8">
        {/* Heading — from Warm preset */}
        <p className="text-base font-body text-white/70 leading-relaxed">
          {HARD_DAY_HEADING}
        </p>

        {loading && (
          <div className="space-y-3 animate-pulse">
            <div className="h-8 bg-white/5 rounded-xl" />
            <div className="h-4 bg-white/5 rounded-xl w-2/3" />
            <div className="h-20 bg-white/5 rounded-2xl" />
          </div>
        )}

        {data && (
          <>
            {/* WHY — Fraunces italic + gold (same treatment as GoalDetail) */}
            {data.whyText && (
              <section>
                {data.goalTitle && (
                  <p className="text-xs font-body text-white/30 uppercase tracking-widest mb-2">
                    Why you started — {data.goalTitle}
                  </p>
                )}
                <p className="font-display italic text-gold text-lg leading-relaxed">
                  &ldquo;{data.whyText}&rdquo;
                </p>
              </section>
            )}

            {/* Days shown up stat */}
            <section>
              <p className="text-sm font-body text-white/60">
                {daysShownUpLabel(data.daysShownUp)}
              </p>
            </section>

            {/* Evidence of Growth snippet — last 3 went_well answers */}
            {data.recentWins.length > 0 && (
              <section>
                <p className="text-xs font-body text-white/30 uppercase tracking-widest mb-3">
                  What you&apos;ve already built
                </p>
                <div className="space-y-3">
                  {data.recentWins.map((win, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal/60" />
                      </div>
                      <div>
                        <p className="text-xs font-body text-white/30 mb-0.5">
                          {new Date(`${win.date}T00:00:00`).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric',
                          })}
                        </p>
                        <p className="text-sm font-body text-white/75 leading-snug">
                          {win.went_well}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Future Me playback — IndexedDB only, zero network */}
            <section>
              <p className="text-xs font-body text-white/30 uppercase tracking-widest mb-3">
                A message from your past self
              </p>

              {data.futureMeEntry ? (
                <div className="bg-white/[0.03] rounded-2xl p-4">
                  <p className="text-[10px] font-body text-white/20 mb-3">
                    Recorded&nbsp;
                    {new Date(data.futureMeEntry.recordedAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                    {data.futureMeEntry.durationMs
                      ? ` · ${formatDuration(Math.round(data.futureMeEntry.durationMs / 1000))}`
                      : ''}
                  </p>

                  {data.futureMeEntry.type === 'voice' && audioUrl && (
                    <audio controls src={audioUrl}
                      className="w-full" style={{ colorScheme: 'dark' }} />
                  )}
                  {data.futureMeEntry.type === 'video' && videoUrl && (
                    <video ref={videoRef} controls src={videoUrl}
                      className="w-full aspect-video rounded-xl bg-black object-cover" />
                  )}
                  {data.futureMeEntry.type === 'text' && (
                    <p className="text-sm font-body text-white/70 leading-relaxed whitespace-pre-wrap">
                      {data.futureMeEntry.text}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm font-body text-white/35 leading-relaxed">
                  {FUTURE_ME_FALLBACK}
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
