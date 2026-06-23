'use client'

import { useState, useMemo } from 'react'
import type { HeatmapDay }   from '@/types'

interface ConsistencyHeatmapProps {
  /** Pre-fetched days with score data (gaps = no data). Server-fetched. */
  data: HeatmapDay[]
}

/**
 * Interpolates between #0F766E (deep teal, score 0) and #5EEAD4 (bright teal, score 100).
 * No red, no orange — a low-score active day is a darker teal, not a failure color.
 * rgb(15, 118, 110) → rgb(94, 234, 212)
 */
function scoreToColor(pct: number): string {
  const t = Math.max(0, Math.min(100, pct)) / 100
  const r = Math.round(15  + (94  - 15)  * t)
  const g = Math.round(118 + (234 - 118) * t)
  const b = Math.round(110 + (212 - 110) * t)
  return `rgb(${r},${g},${b})`
}

/**
 * Returns the ISO date of the Sunday on or before a given date.
 * The heatmap starts columns on Sunday (GitHub convention).
 */
function prevSunday(isoDate: string): string {
  const d   = new Date(`${isoDate}T00:00:00`)
  const dow = d.getDay()  // 0 = Sunday
  d.setDate(d.getDate() - dow)
  return d.toISOString().slice(0, 10)
}

/** Formats "2025-06-20" as "Jun 20" for the tooltip. */
function fmtDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
  })
}

/** Short month abbreviation for a given ISO date. */
function fmtMonth(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short' })
}

/**
 * GitHub-style consistency heatmap covering the last 6 months.
 *
 * Grid layout:
 * - Columns = weeks (leftmost = oldest, rightmost = this week)
 * - Rows = days within each week (top = Sunday, bottom = Saturday)
 * - Cell color: #1A1A1A for no data, teal gradient for active days
 *
 * Tapping a cell surfaces a tooltip below the grid (mobile-friendly — no hover needed).
 * Labeled "Your year so far" per spec.
 */
export function ConsistencyHeatmap({ data }: ConsistencyHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ date: string; score: number | null } | null>(null)

  // Build a lookup map: date → score_pct (null for missing dates)
  const scoreMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const day of data) map.set(day.date, day.score_pct ?? 0)
    return map
  }, [data])

  // Build the grid: 26 weeks × 7 days, starting from the Sunday 6 months ago
  const { weeks, monthLabels } = useMemo(() => {
    const today    = new Date()
    const todayISO = today.toISOString().slice(0, 10)

    // Start from the Sunday of the week that's 26 weeks ago
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 26 * 7)
    const gridStart = prevSunday(startDate.toISOString().slice(0, 10))

    const weeksArr: { iso: string; isToday: boolean; hasFuture: boolean }[][] = []
    const labels: { weekIndex: number; label: string }[] = []

    const seenMonths = new Set<string>()
    const d = new Date(`${gridStart}T00:00:00`)

    for (let w = 0; w < 27; w++) {
      const week: { iso: string; isToday: boolean; hasFuture: boolean }[] = []
      for (let day = 0; day < 7; day++) {
        const iso     = d.toISOString().slice(0, 10)
        const isToday = iso === todayISO
        const isFuture = iso > todayISO
        week.push({ iso, isToday, hasFuture: isFuture })
        d.setDate(d.getDate() + 1)
      }

      // Track month label for the first Sunday of each new month
      const firstDayOfWeek = week[0].iso
      const month = fmtMonth(firstDayOfWeek)
      if (!seenMonths.has(month)) {
        seenMonths.add(month)
        labels.push({ weekIndex: w, label: month })
      }

      weeksArr.push(week)
    }

    return { weeks: weeksArr, monthLabels: labels }
  }, [])

  return (
    <div className="bg-white/[0.03] rounded-3xl p-5">
      <p className="text-xs font-body text-white/40 uppercase tracking-widest mb-4">
        Your year so far
      </p>

      {/* Month labels row */}
      <div className="flex gap-[3px] mb-1 pl-0">
        {weeks.map((_, wi) => {
          const labelEntry = monthLabels.find(l => l.weekIndex === wi)
          return (
            <div key={wi} className="w-[11px] flex-shrink-0">
              {labelEntry && (
                <span className="text-[8px] font-body text-white/20 whitespace-nowrap">
                  {labelEntry.label}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Heatmap grid — scrollable horizontally on small screens */}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-[3px]" style={{ minWidth: 'max-content' }}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map(({ iso, isToday, hasFuture }) => {
                if (hasFuture) {
                  // Future days: invisible placeholder to keep the grid shape
                  return <div key={iso} className="w-[11px] h-[11px]" />
                }

                const score    = scoreMap.has(iso) ? scoreMap.get(iso)! : null
                const hasData  = score !== null
                const bg       = hasData ? scoreToColor(score) : '#1A1A1A'
                const isActive = tooltip?.date === iso

                return (
                  <button
                    key={iso}
                    className={`w-[11px] h-[11px] rounded-[2px] flex-shrink-0 transition-opacity ${
                      isToday ? 'ring-1 ring-white/30' : ''
                    } ${isActive ? 'opacity-100' : 'opacity-90'}`}
                    style={{ backgroundColor: bg }}
                    onClick={() => setTooltip(
                      isActive ? null : { date: iso, score },
                    )}
                    aria-label={`${fmtDate(iso)}${score !== null ? `: ${score}%` : ': no data'}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip — shown below the grid on tap */}
      <div className="mt-3 h-6">
        {tooltip ? (
          <p className="text-xs font-body text-white/60">
            {fmtDate(tooltip.date)}{' '}
            {tooltip.score !== null
              ? <span className="text-teal font-medium">{tooltip.score}%</span>
              : <span className="text-white/30">no data</span>
            }
          </p>
        ) : (
          <p className="text-[10px] font-body text-white/20">Tap a day to see your score</p>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[9px] font-body text-white/20">Less</span>
        {[0, 25, 50, 75, 100].map(pct => (
          <div
            key={pct}
            className="w-[9px] h-[9px] rounded-[2px]"
            style={{ backgroundColor: scoreToColor(pct) }}
          />
        ))}
        <span className="text-[9px] font-body text-white/20">More</span>
      </div>
    </div>
  )
}
