'use client'

import { useState, useEffect }      from 'react'
import { useTracking }               from '@/contexts/TrackingContext'
import { TRACKING_CATEGORY_CONFIG }  from '@/lib/tracking-categories'
import { formatDuration }            from '@/lib/format'

/**
 * Persistent bar shown at the top of every screen while a timer is running.
 * Returns null when no timer is active — zero height, zero space in layout.
 *
 * The elapsed time is computed from activeEntry.start_at (server timestamp),
 * not from when this component mounts, so reopening the app mid-session shows
 * the correct elapsed time rather than resetting to 0:00.
 *
 * Uses a local setInterval (not a ref) — the interval id is captured in the
 * closure returned to clearInterval, which is the cleanest pattern and avoids
 * the ref-cleanup mismatch that caused the display to freeze.
 */
export function TrackingBar() {
  const { activeEntry, stopTracking } = useTracking()
  const [elapsed,  setElapsed]  = useState(0)
  const [showStop, setShowStop] = useState(false)
  const [stopping, setStopping] = useState(false)

  useEffect(() => {
    if (!activeEntry) {
      setElapsed(0)
      return
    }

    const startMs = new Date(activeEntry.start_at).getTime()

    // Tick immediately so the display shows a non-zero time on mount
    setElapsed(Math.floor((Date.now() - startMs) / 1000))

    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startMs) / 1000))
    }, 1000)

    return () => clearInterval(id)
  }, [activeEntry?.id])  // re-run only when the entry itself changes

  async function handleStop() {
    setStopping(true)
    try {
      await stopTracking()
      setShowStop(false)
    } finally {
      setStopping(false)
    }
  }

  if (!activeEntry) return null

  const config   = TRACKING_CATEGORY_CONFIG[activeEntry.category] ?? TRACKING_CATEGORY_CONFIG.personal
  const timeStr  = formatDuration(elapsed)

  return (
    <>
      <button
        onClick={() => setShowStop(true)}
        className="sticky top-0 z-40 w-full flex items-center justify-between px-5 h-9 bg-background border-b border-white/[0.06]"
        aria-label={`Tracking ${config.label} — tap to stop`}
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse inline-block" />
          <span className="text-xs font-body text-white/60">{config.label}</span>
        </div>
        <span className="text-xs font-body font-medium text-teal tabular-nums">{timeStr}</span>
      </button>

      {showStop && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <button
            onClick={() => setShowStop(false)}
            className="flex-1 bg-black/50"
            aria-label="Dismiss"
          />
          <div className="bg-[#141414] rounded-t-3xl px-5 pt-5 pb-safe-bottom pb-8">
            <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />

            <p className="text-xs font-body text-white/35 uppercase tracking-widest mb-1">
              Tracking
            </p>
            <p className="text-lg font-heading font-semibold text-white mb-1">
              {config.label}
            </p>
            <p className="text-4xl font-heading font-bold text-teal tabular-nums mb-6">
              {timeStr}
            </p>

            <button
              onClick={handleStop}
              disabled={stopping}
              className="w-full py-4 rounded-2xl bg-white/[0.06] border border-white/10 text-white font-body font-medium text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {stopping ? 'Stopping…' : 'Stop Timer'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
