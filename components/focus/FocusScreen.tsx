'use client'

import { useState, useEffect, useRef } from 'react'
import type { FocusSession }            from '@/types'

interface FocusScreenProps {
  session:    FocusSession
  taskTitle:  string | null
  onComplete: (isActuallyComplete: boolean) => void
  onCancel:   () => void
}

// ── Digit cell (same style as TrackingPage) ───────────────────────────────────
function Digit({ value }: { value: string }) {
  return (
    <div className="w-11 h-[3.5rem] bg-white/[0.06] rounded-xl flex items-center justify-center">
      <span className="text-[2.25rem] font-heading font-bold text-white tabular-nums leading-none tracking-tight">
        {value}
      </span>
    </div>
  )
}

function DigitPair({ value, label }: { value: number; label: string }) {
  const str = String(value).padStart(2, '0')
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex gap-1">
        <Digit value={str[0]} />
        <Digit value={str[1]} />
      </div>
      <span className="text-[9px] font-body text-white/20 uppercase tracking-[0.2em]">{label}</span>
    </div>
  )
}

function ColonDots() {
  return (
    <div className="flex flex-col gap-2 mb-6">
      <div className="w-1 h-1 rounded-full bg-white/25" />
      <div className="w-1 h-1 rounded-full bg-white/25" />
    </div>
  )
}

// ── Progress ring ─────────────────────────────────────────────────────────────
const RING_R   = 128
const RING_CX  = 148
const RING_CY  = 148
const RING_SIZE = 296
const CIRCUMFERENCE = 2 * Math.PI * RING_R

function ProgressRing({ progress }: { progress: number }) {
  const offset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress)))
  return (
    <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
      {/* Track */}
      <circle
        cx={RING_CX} cy={RING_CY} r={RING_R}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={5}
      />
      {/* Progress arc */}
      <circle
        cx={RING_CX} cy={RING_CY} r={RING_R}
        fill="none"
        stroke="#D9A653"
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${RING_CX} ${RING_CY})`}
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
    </svg>
  )
}

/**
 * Full-screen distraction-free countdown timer with circular progress ring.
 *
 * Cancel requires two taps — first shows a confirmation state. This friction is
 * intentional: an accidental cancel during focused work is worse than 1s of delay.
 *
 * endingRef prevents double-fire if the interval and mount-time check both hit 0.
 */
export function FocusScreen({ session, taskTitle, onComplete, onCancel }: FocusScreenProps) {
  const endTimeMs = new Date(session.started_at).getTime() + session.planned_duration_seconds * 1000

  const [remaining,  setRemaining]  = useState(() => Math.max(0, Math.ceil((endTimeMs - Date.now()) / 1000)))
  const [confirming, setConfirming] = useState(false)
  const endingRef = useRef(false)

  useEffect(() => {
    if (endTimeMs <= Date.now()) { triggerComplete(); return }

    const id = setInterval(() => {
      const rem = Math.max(0, Math.ceil((endTimeMs - Date.now()) / 1000))
      setRemaining(rem)
      if (rem <= 0) { clearInterval(id); triggerComplete() }
    }, 1000)

    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  async function triggerComplete() {
    if (endingRef.current) return
    endingRef.current = true
    try {
      const res  = await fetch('/api/focus-sessions/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: session.id }),
      })
      const body = await res.json() as { isComplete?: boolean }
      onComplete(body.isComplete ?? false)
    } catch { onComplete(false) }
  }

  async function handleCancelTap() {
    if (endingRef.current) return
    if (!confirming) { setConfirming(true); return }
    endingRef.current = true
    try {
      await fetch('/api/focus-sessions/cancel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: session.id }),
      })
    } catch {}
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

  const progress = session.planned_duration_seconds > 0
    ? remaining / session.planned_duration_seconds
    : 0

  const hours = Math.floor(remaining / 3600)
  const mins  = Math.floor((remaining % 3600) / 60)
  const secs  = remaining % 60

  const pct = Math.round(progress * 100)

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-safe-top pt-4 pb-3 border-b border-white/[0.05]">
        <div className="flex flex-col gap-1">
          <button
            onClick={handleCancelTap}
            disabled={endingRef.current}
            className={`px-4 py-2 rounded-xl text-sm font-body transition-all ${
              confirming
                ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                : 'bg-white/[0.06] text-white/45 border border-transparent'
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
          className="text-xs font-body text-white/25 active:text-white/50 py-2 px-3 transition-colors"
        >
          Block apps
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Task title */}
        {taskTitle && (
          <p className="text-sm font-body text-white/40 mb-8 max-w-[260px] leading-relaxed">
            {taskTitle}
          </p>
        )}

        {/* Ring + digits overlay */}
        <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
          <ProgressRing progress={progress} />

          {/* Centered digits */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              {hours > 0 && (
                <>
                  <DigitPair value={hours} label="hrs" />
                  <ColonDots />
                </>
              )}
              <DigitPair value={mins} label="min" />
              <ColonDots />
              <DigitPair value={secs} label="sec" />
            </div>

            {/* Percentage remaining */}
            <p className="text-xs font-body text-white/20 tabular-nums">{pct}%</p>
          </div>
        </div>

        {/* Status label */}
        <p className="mt-8 text-xs font-body text-white/15 uppercase tracking-widest">
          {pct > 50 ? 'Stay focused' : pct > 20 ? 'Keep going' : pct > 0 ? 'Almost there' : 'Time\'s up!'}
        </p>
      </div>
    </div>
  )
}
