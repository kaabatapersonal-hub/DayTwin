'use client'

import { useEffect } from 'react'

interface FocusCompleteProps {
  isComplete: boolean  // true if server confirmed actual >= 90% of planned
  onDismiss:  () => void
}

/**
 * Brief completion moment shown after a focus session ends naturally.
 * Auto-dismisses after 3 seconds — the moment is intentionally brief.
 * Any tap also dismisses it immediately.
 *
 * Copy follows the Warm preset from voice-and-tone-guide.md:
 * calm, observational, references something the user actually did.
 * Different message for a fully-completed session vs. one that ended
 * just short of the threshold (still positive — effort counts).
 */
export function FocusComplete({ isComplete, onDismiss }: FocusCompleteProps) {
  // Auto-dismiss — 3 seconds is enough for the moment without blocking the user
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 text-center cursor-pointer"
    >
      <div className="space-y-3">
        <p className="text-3xl text-teal mb-2">✦</p>
        {isComplete ? (
          <>
            <p className="text-xl font-heading font-semibold text-white">Session complete.</p>
            <p className="text-sm font-body text-white/50 leading-relaxed">
              You showed up and stayed. That&apos;s the whole point.
            </p>
          </>
        ) : (
          <>
            <p className="text-xl font-heading font-semibold text-white">Session ended.</p>
            <p className="text-sm font-body text-white/50 leading-relaxed">
              Some focus is better than none.
            </p>
          </>
        )}
        <p className="text-xs font-body text-white/15 mt-6">Tap to continue</p>
      </div>
    </div>
  )
}
