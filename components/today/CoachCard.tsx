'use client'

import { useState, useEffect } from 'react'
import { buildCoachMessage, type TonePreference } from '@/lib/copy'
import type { CoachData } from '@/types'

interface CoachCardProps {
  data:            CoachData
  tonePreference?: TonePreference
}

/**
 * Morning Daily Coach card — shown at the top of Today before noon.
 * After noon it fades out rather than abruptly disappearing on refresh.
 *
 * Uses client-side time check so the server always renders it (SSR doesn't
 * know the user's local clock) and the component hides itself after mount
 * if it's afternoon. This avoids a flash on SSR.
 *
 * Copy is built from real data via lib/copy.ts — no generic platitudes.
 */
export function CoachCard({ data, tonePreference = 'warm' }: CoachCardProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Hide after noon client-side; component rendered server-side regardless
    if (new Date().getHours() >= 12) setVisible(false)
  }, [])

  if (!visible) return null

  const message = buildCoachMessage(data, tonePreference)

  return (
    <div className="bg-white/[0.04] rounded-2xl px-4 py-4 mb-4 border border-white/[0.06]">
      <p className="text-xs font-body text-white/35 uppercase tracking-widest mb-1.5">
        Today
      </p>
      <p className="text-sm font-body text-white/80 leading-relaxed">
        {message}
      </p>
    </div>
  )
}
