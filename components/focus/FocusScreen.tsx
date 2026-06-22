'use client'

import { useState, useEffect, useRef } from 'react'
import type { FocusSession }            from '@/types'

interface FocusScreenProps {
  session:    FocusSession
  taskTitle:  string | null
  onComplete: (isActuallyComplete: boolean) => void
  onCancel:   () => void
}

/**
 * Full-screen distraction-free countdown timer for a focus session.
 *
 * Cancel requires two taps — the first shows a confirmation state, the second
 * actually cancels. This friction is intentional: the spec explicitly chose it
 * because an accidental cancel during focused work is worse than a 1-second delay.
 *
 * The timer derives remaining time from (endTimeMs - Date.now()), where
 * endTimeMs = session.started_at + planned_duration_seconds. This means
 * reopening the app mid-session shows the correct remaining time immediately.
 *
 * endingRef is a ref (not state) so the interval callback always reads the
 * latest value without a stale closure — defining handleComplete in the
 * component body and calling it from inside setInterval would capture a stale
 * 'ending' state value that never updates for the life of the interval.
 */
export function FocusScreen({ session, taskTitle, onComplete, onCancel }: FocusScreenProps) {
  // Pre-compute the absolute end timestamp once — stable for the life of this session
  const endTimeMs = new Date(session.started_at).getTime() + session.planned_duration_seconds * 1000

  const [remaining,  setRemaining]  = useState(() => Math.max(0, Math.ceil((endTimeMs - Date.now()) / 1000)))
  const [confirming, setConfirming] = useState(false)
  const endingRef = useRef(false)  // ref not state — avoids stale closure inside the interval callback

  useEffect(() => {
    // If the session already expired (app was reopened after it should have ended),
    // trigger completion immediately without starting the interval
    if (endTimeMs <= Date.now()) {
      triggerComplete()
      return
    }

    const id = setInterval(() => {
      const rem = Math.max(0, Math.ceil((endTimeMs - Date.now()) / 1000))
      setRemaining(rem)

      if (rem <= 0) {
        clearInterval(id)
        triggerComplete()
      }
    }, 1000)

    return () => clearInterval(id)
  // endTimeMs is derived from session.started_at + planned_duration_seconds — stable
  // for the same session, so session.id as the dependency is the right guard
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  async function triggerComplete() {
    // endingRef prevents a double-fire if the interval and the mount-time check both hit
    if (endingRef.current) return
    endingRef.current = true
    try {
      const res  = await fetch('/api/focus-sessions/complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: session.id }),
      })
      const body = await res.json() as { isComplete?: boolean }
      onComplete(body.isComplete ?? false)
    } catch {
      onComplete(false)
    }
  }

  async function handleCancelTap() {
    if (endingRef.current) return

    if (!confirming) {
      setConfirming(true)
      return
    }

    endingRef.current = true
    try {
      await fetch('/api/focus-sessions/cancel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: session.id }),
      })
    } catch {
      // Proceed even if the request fails
    }
    onCancel()
  }

  function openBlockingSettings() {
    const ua = navigator.userAgent.toLowerCase()
    if (/iphone|ipad/.test(ua)) {
      window.location.href = 'App-prefs:SCREEN_TIME'
    } else {
      window.location.href = 'intent://com.google.android.apps.wellbeing/#Intent;scheme=android-app;end'
    }
  }

  const hours   = Math.floor(remaining / 3600)
  const mins    = Math.floor((remaining % 3600) / 60)
  const secs    = remaining % 60
  const timeStr = hours > 0
    ? `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${mins}:${String(secs).padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-start justify-between px-5 pt-safe-top pt-4">
        <div className="flex flex-col gap-1">
          <button
            onClick={handleCancelTap}
            disabled={endingRef.current}
            className={`px-4 py-2 rounded-xl text-sm font-body transition-all ${
              confirming
                ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                : 'bg-white/[0.06] text-white/45'
            }`}
          >
            {confirming ? 'Tap to cancel' : 'Cancel'}
          </button>
          {confirming && (
            <button
              onClick={() => setConfirming(false)}
              className="text-[10px] font-body text-white/25 pl-1"
            >
              keep going →
            </button>
          )}
        </div>

        <button
          onClick={openBlockingSettings}
          className="text-xs font-body text-white/20 active:text-white/50 py-2 px-3"
        >
          Block apps
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        {taskTitle && (
          <p className="text-sm font-body text-white/35 mb-8 max-w-xs">{taskTitle}</p>
        )}

        <p className="text-8xl font-heading font-bold text-white tabular-nums leading-none tracking-tight">
          {timeStr}
        </p>

        <p className="text-xs font-body text-white/20 mt-6 uppercase tracking-widest">
          Stay focused
        </p>
      </div>
    </div>
  )
}
