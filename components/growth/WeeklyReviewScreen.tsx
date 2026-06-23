'use client'

import { useState }          from 'react'
import { useRouter }          from 'next/navigation'
import type { WeeklyReview }  from '@/types'
import { getWeekStart, todayISO } from '@/lib/format'

interface WeeklyReviewScreenProps {
  initialReviews: WeeklyReview[]
}

/** Formats "2026-06-16" as "Jun 16 – Jun 22". */
function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`)
  const end   = new Date(start)
  end.setDate(end.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`
}

function weekdayName(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' })
}

/**
 * Full weekly review screen accessible from the Growth tab.
 * Supports browsing past weeks with prev/next navigation.
 * Shows a "Generate" button for weeks that haven't been computed yet.
 *
 * "Quietest day" is used consistently here — never "worst day."
 * ai_summary is absent entirely in V1; no placeholder or coming-soon label.
 */
export function WeeklyReviewScreen({ initialReviews }: WeeklyReviewScreenProps) {
  const router = useRouter()

  // All reviews sorted newest-first (server supplies them that way)
  const [reviews,    setReviews]    = useState<WeeklyReview[]>(initialReviews)
  const [cursor,     setCursor]     = useState(0)          // index into reviews[]
  const [generating, setGenerating] = useState(false)

  const currentReview = reviews[cursor] ?? null
  const hasNext = cursor < reviews.length - 1
  const hasPrev = cursor > 0

  // The Monday of the current real-world week
  const thisWeekStart = getWeekStart(todayISO())
  // True if viewing this week and no review row exists for it yet
  const isThisWeek   = cursor === 0 && (!currentReview || currentReview.week_start === thisWeekStart)
  const canGenerate  = isThisWeek && !currentReview

  // Displayed week_start label (either from review or the current week)
  const displayWeekStart = currentReview?.week_start ?? thisWeekStart

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/growth/weekly-review', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ week_start: thisWeekStart }),
      })
      if (!res.ok) return
      const review = await res.json() as WeeklyReview
      setReviews(prev => [review, ...prev])
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-5">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.06] active:bg-white/10 transition-colors"
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="font-heading text-xl font-bold text-white">Weekly Review</h1>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between px-5 mb-6">
        <button
          onClick={() => setCursor(c => c + 1)}
          disabled={!hasNext}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] disabled:opacity-20 active:bg-white/10 transition-colors"
          aria-label="Previous week"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <p className="text-sm font-body text-white/60">
          {formatWeekRange(displayWeekStart)}
        </p>

        <button
          onClick={() => setCursor(c => c - 1)}
          disabled={!hasPrev}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] disabled:opacity-20 active:bg-white/10 transition-colors"
          aria-label="Next week"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-32 space-y-4">
        {currentReview ? (
          <>
            {/* Headline stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Tasks done"   value={String(currentReview.tasks_completed)} />
              <StatCard label="Habit rate"   value={`${currentReview.habits_pct}%`}       />
              <StatCard label="Focus hours"  value={`${currentReview.focus_hours}h`}      />
            </div>

            {/* Day callouts */}
            {currentReview.best_day && (
              <div className="bg-white/[0.04] rounded-2xl px-4 py-4 space-y-3">
                <DayRow
                  label="Best day"
                  day={weekdayName(currentReview.best_day)}
                  highlight="text-teal"
                />
                {/* Quietest day: only shown when different from best day */}
                {currentReview.worst_day && currentReview.worst_day !== currentReview.best_day && (
                  <DayRow
                    label="Quietest day"
                    day={weekdayName(currentReview.worst_day)}
                    highlight="text-white/40"
                  />
                )}
              </div>
            )}

            {/* No days highlight if zero active days */}
            {!currentReview.best_day && (
              <div className="bg-white/[0.04] rounded-2xl px-4 py-4">
                <p className="text-sm font-body text-white/30 text-center">
                  No daily scores recorded this week.
                </p>
              </div>
            )}

            {/* ai_summary intentionally omitted — V2 feature */}
          </>
        ) : canGenerate ? (
          <div className="flex flex-col items-center text-center pt-8 space-y-4">
            <p className="text-sm font-body text-white/40">
              This week&apos;s review hasn&apos;t been generated yet.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-6 py-3 rounded-2xl bg-teal text-[#080808] font-body font-semibold text-sm disabled:opacity-40 active:scale-[0.97] transition-transform"
            >
              {generating ? 'Generating…' : 'Generate this week\'s review'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center pt-12 space-y-3">
            <p className="text-sm font-body text-white/30">No review for this week.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.04] rounded-2xl px-4 py-4">
      <p className="text-2xl font-heading font-bold text-white tabular-nums">{value}</p>
      <p className="text-[11px] font-body text-white/35 mt-1">{label}</p>
    </div>
  )
}

function DayRow({ label, day, highlight }: { label: string; day: string; highlight: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-body text-white/30">{label}</span>
      <span className={`text-sm font-body font-medium ${highlight}`}>{day}</span>
    </div>
  )
}
