'use client'

import { useState, useEffect }    from 'react'
import { AnimatePresence }         from 'framer-motion'
import { useTracking }             from '@/contexts/TrackingContext'
import { TRACKING_CATEGORY_CONFIG } from '@/lib/tracking-categories'
import { formatDuration }          from '@/lib/format'
import { TrackingPage }            from './TrackingPage'

/**
 * Persistent indicator bar at the top of every screen while a timer is running.
 * Tapping it opens the full-page TrackingPage in running view.
 * Returns null when no timer is active — takes no space in layout.
 */
export function TrackingBar() {
  const { activeEntry } = useTracking()
  const [elapsed,       setElapsed]       = useState(0)
  const [showFullPage,  setShowFullPage]  = useState(false)

  useEffect(() => {
    if (!activeEntry) { setElapsed(0); return }
    const startMs = new Date(activeEntry.start_at).getTime()
    setElapsed(Math.floor((Date.now() - startMs) / 1000))
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startMs) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [activeEntry?.id])

  if (!activeEntry) return null

  const config  = TRACKING_CATEGORY_CONFIG[activeEntry.category] ?? TRACKING_CATEGORY_CONFIG.personal
  const timeStr = formatDuration(elapsed)

  return (
    <>
      <button
        onClick={() => setShowFullPage(true)}
        className="sticky top-0 z-40 w-full flex items-center justify-between px-5 h-9 bg-background border-b border-white/[0.06]"
        aria-label={`Tracking ${config.label} — tap to open timer`}
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse inline-block" />
          <span className="text-xs font-body text-white/60">{config.label}</span>
        </div>
        <span className="text-xs font-body font-medium text-teal tabular-nums">{timeStr}</span>
      </button>

      <AnimatePresence>
        {showFullPage && (
          <TrackingPage tasks={[]} onClose={() => setShowFullPage(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
