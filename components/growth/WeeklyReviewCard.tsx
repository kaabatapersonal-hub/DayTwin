'use client'

import Link              from 'next/link'
import type { WeeklyReview } from '@/types'

interface WeeklyReviewCardProps {
  review: WeeklyReview | null
  /** True when no review exists yet for the current week (show generate prompt). */
  canGenerate: boolean
  onGenerate:  () => void
  generating:  boolean
}

/** Formats "2026-06-16" as "Jun 16 – Jun 22" for the week range label. */
function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`)
  const end   = new Date(start)
  end.setDate(end.getDate() + 6)

  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`
}

/** Returns the weekday name for an ISO date string. */
function weekdayName(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' })
}

/**
 * Compact weekly review card embedded in the Growth tab.
 * Shows the most recent review's headline stats.
 * Links to /growth/weekly-review for the full view.
 *
 * worst_day is framed as "quietest day" per the voice guide —
 * the spec explicitly forbids calling it "worst."
 */
export function WeeklyReviewCard({ review, canGenerate, onGenerate, generating }: WeeklyReviewCardProps) {
  if (!review && !canGenerate) return null

  return (
    <div className="bg-white/[0.03] rounded-3xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-body text-white/40 uppercase tracking-widest">Weekly Review</p>
        {review && (
          <Link
            href="/growth/weekly-review"
            className="text-[11px] font-body text-teal/70"
          >
            All weeks →
          </Link>
        )}
      </div>

      {review ? (
        <>
          <p className="text-[11px] font-body text-white/30 mb-4">
            {formatWeekRange(review.week_start)}
          </p>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatBox label="Tasks done" value={String(review.tasks_completed)} />
            <StatBox label="Habits"     value={`${review.habits_pct}%`}       />
            <StatBox label="Focus"      value={`${review.focus_hours}h`}      />
          </div>

          {/* Best / quietest day */}
          {review.best_day && (
            <div className="space-y-1.5">
              <DayChip
                label="Best day"
                day={weekdayName(review.best_day)}
                color="text-teal"
              />
              {review.worst_day && review.worst_day !== review.best_day && (
                <DayChip
                  label="Quietest day"
                  day={weekdayName(review.worst_day)}
                  color="text-white/35"
                />
              )}
            </div>
          )}
        </>
      ) : (
        /* No review yet for this week */
        <div className="text-center py-2">
          <p className="text-sm font-body text-white/40 mb-4">
            No review for this week yet.
          </p>
          <button
            onClick={onGenerate}
            disabled={generating}
            className="px-5 py-2.5 rounded-xl bg-teal/10 text-teal font-body text-sm font-medium disabled:opacity-40 active:scale-[0.97] transition-transform"
          >
            {generating ? 'Generating…' : 'Generate this week\'s review'}
          </button>
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.04] rounded-2xl px-3 py-3">
      <p className="text-lg font-heading font-bold text-white tabular-nums">{value}</p>
      <p className="text-[10px] font-body text-white/35 mt-0.5">{label}</p>
    </div>
  )
}

function DayChip({ label, day, color }: { label: string; day: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-body text-white/30">{label}</span>
      <span className={`text-xs font-body font-medium ${color}`}>{day}</span>
    </div>
  )
}
