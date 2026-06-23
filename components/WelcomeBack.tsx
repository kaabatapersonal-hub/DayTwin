'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { touchLastActive } from '@/lib/users'
import {
  daysAwayLabel, getWelcomeBackCopy, type TonePreference,
} from '@/lib/copy'

interface WelcomeBackProps {
  daysAway:        number
  topTaskTitle:    string | null
  tonePreference?: TonePreference
}

/**
 * Welcome Back screen — shown when last_active_at is 3+ days ago.
 *
 * Rendered as a full-screen page (not a modal over Today) so the re-entry
 * feels intentional, not like an interruption.
 *
 * last_active_at is updated only when the user taps the CTA — not when this
 * screen loads — so a page refresh still shows this screen until they
 * explicitly continue. This prevents the 3-day threshold from resetting
 * on every refresh without acknowledgement.
 *
 * Copy is from the Warm preset in lib/copy.ts — no invented strings.
 */
export function WelcomeBack({ daysAway, topTaskTitle, tonePreference = 'warm' }: WelcomeBackProps) {
  const router   = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const { body: wbBody, cta: wbCta } = getWelcomeBackCopy(tonePreference)

  async function handleStart() {
    setLoading(true)
    try {
      // Stamp last_active_at AFTER the user acknowledges, not before,
      // so a refresh doesn't silently skip the welcome back screen.
      await touchLastActive(supabase)
    } catch {
      // Proceed even if the stamp fails — don't block the user
    }
    router.push('/today')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-xs w-full space-y-6">
        {/* Days away */}
        <p className="text-xs font-body text-white/30 uppercase tracking-widest">
          {daysAwayLabel(daysAway)}
        </p>

        <p className="text-xl font-heading font-semibold text-white leading-snug">
          {wbBody}
        </p>

        {/* Top task nudge */}
        {topTaskTitle ? (
          <div className="bg-white/[0.04] rounded-2xl px-4 py-3.5 text-left">
            <p className="text-xs font-body text-white/30 mb-1">Start here</p>
            <p className="text-sm font-body text-white">{topTaskTitle}</p>
          </div>
        ) : (
          <div className="bg-white/[0.04] rounded-2xl px-4 py-3.5 text-left">
            <p className="text-xs font-body text-white/30 mb-1">Start here</p>
            <p className="text-sm font-body text-white/60">Add one task for today</p>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-teal text-background font-body font-medium text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {loading ? 'Starting…' : wbCta}
        </button>
      </div>
    </div>
  )
}
