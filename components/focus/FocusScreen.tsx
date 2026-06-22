'use client'

import { useState, useEffect, useRef } from 'react'
import type { FocusSession }            from '@/types'

interface FocusScreenProps {
  session:    FocusSession
  taskTitle:  string | null  // linked task title to display during the session
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
 * The timer is computed from session.started_at so reopening the app mid-session
 * shows the correct remaining time rather than resetting to the full duration.
 *
 * "Block distracting apps" deep-links to native OS settings — no PWA-level blocking
 * is possible, so we just open the system settings for Screen Time / Digital Wellbeing.
 */
export function FocusScreen({ session, taskTitle, onComplete, onCancel }: FocusScreenProps) {
  const [remaining,  setRemaining]  = useState(session.planned_duration_seconds)
  const [confirming, setConfirming] = useState(false)  // first cancel tap seen
  const [ending,     setEnding]     = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    function tick() {
      const elapsedMs = Date.now() - new Date(session.started_at).getTime()
      const rem       = session.planned_duration_seconds - Math.floor(elapsedMs / 1000)

      if (rem <= 0) {
        clearInterval(intervalRef.current!)
        handleNaturalComplete()
      } else {
        setRemaining(rem)
      }
    }

    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  async function handleNaturalComplete() {
    if (ending) return
    setEnding(true)
    try {
      const res      = await fetch('/api/focus-sessions/complete', {
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
    if (ending) return

    if (!confirming) {
      // First tap — show the confirmation state; timer keeps running
      setConfirming(true)
      return
    }

    // Second tap — actually cancel
    if (intervalRef.current) clearInterval(intervalRef.current)
    setEnding(true)
    try {
      await fetch('/api/focus-sessions/cancel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: session.id }),
      })
    } catch {
      // Proceed even if the request fails — session should still be cancelled locally
    }
    onCancel()
  }

  function openBlockingSettings() {
    const ua = navigator.userAgent.toLowerCase()
    if (/iphone|ipad/.test(ua)) {
      // iOS Screen Time settings — deep link opens the Settings app
      window.location.href = 'App-prefs:SCREEN_TIME'
    } else {
      // Android Digital Wellbeing — best effort URL scheme for a PWA
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
      {/* Top controls */}
      <div className="flex items-start justify-between px-5 pt-safe-top pt-4">
        {/* Cancel — requires second tap to confirm */}
        <div className="flex flex-col gap-1">
          <button
            onClick={handleCancelTap}
            disabled={ending}
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

        {/* Block apps — deep link only, no native blocking possible in a PWA */}
        <button
          onClick={openBlockingSettings}
          className="text-xs font-body text-white/20 active:text-white/50 py-2 px-3"
        >
          Block apps
        </button>
      </div>

      {/* Centered countdown */}
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
