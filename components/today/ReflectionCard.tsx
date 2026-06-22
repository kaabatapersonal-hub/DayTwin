'use client'

import { useState, useEffect } from 'react'
import {
  REFLECTION_HEADING, REFLECTION_WENT_WELL,
  REFLECTION_TIME_WASTED, REFLECTION_BIGGEST_WIN,
  REFLECTION_DONE_LABEL,
} from '@/lib/copy'
import type { Reflection, NewReflection } from '@/types'

interface ReflectionCardProps {
  reflection: Reflection | null
  onSubmit:   (payload: NewReflection) => Promise<void>
  error:      string | null
}

/**
 * Evening reflection card — appears after 7pm, never blocks earlier in the day.
 *
 * Time check is client-side (the server always pre-renders the card hidden).
 * If already submitted today: shows a quiet "Reflected ✓" chip instead of the form.
 * Non-blocking: sits in the scroll flow and can be passed without interaction.
 */
export function ReflectionCard({ reflection, onSubmit, error }: ReflectionCardProps) {
  const [isEvening,  setIsEvening]  = useState(false)
  const [wentWell,   setWentWell]   = useState('')
  const [timeWasted, setTimeWasted] = useState('')
  const [biggestWin, setBiggestWin] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // 19:00 = 7pm; the card lives in the scroll flow but stays hidden before evening
    setIsEvening(new Date().getHours() >= 19)
  }, [])

  if (!isEvening) return null

  // Already reflected today → quiet confirmation
  if (reflection) {
    return (
      <div className="flex items-center gap-2 px-1 mb-4">
        <span className="text-teal text-sm">✓</span>
        <p className="text-xs font-body text-white/35">{REFLECTION_DONE_LABEL}</p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = wentWell.trim()
    if (!trimmed) return
    setSubmitting(true)
    try {
      await onSubmit({
        went_well:   trimmed,
        time_wasted: timeWasted.trim() || null,
        biggest_win: biggestWin.trim() || null,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white/[0.03] rounded-2xl px-4 py-4 mb-4">
      <p className="text-xs font-body text-white/40 uppercase tracking-widest mb-3">
        {REFLECTION_HEADING}
      </p>

      {error && (
        <p className="text-xs text-red-400 font-body mb-3">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-body text-white/40 block mb-1.5">
            {REFLECTION_WENT_WELL}
          </label>
          <textarea
            value={wentWell}
            onChange={e => setWentWell(e.target.value)}
            rows={3}
            className="w-full bg-white/10 text-white placeholder-white/25 rounded-xl px-3 py-2.5 text-sm font-body focus:outline-none resize-none"
            placeholder="Something that went well today…"
          />
        </div>

        <div>
          <label className="text-xs font-body text-white/40 block mb-1.5">
            {REFLECTION_TIME_WASTED}
          </label>
          <textarea
            value={timeWasted}
            onChange={e => setTimeWasted(e.target.value)}
            rows={2}
            className="w-full bg-white/10 text-white placeholder-white/25 rounded-xl px-3 py-2.5 text-sm font-body focus:outline-none resize-none"
            placeholder="Anything you'd skip next time…"
          />
        </div>

        <div>
          <label className="text-xs font-body text-white/40 block mb-1.5">
            {REFLECTION_BIGGEST_WIN}
          </label>
          <textarea
            value={biggestWin}
            onChange={e => setBiggestWin(e.target.value)}
            rows={2}
            className="w-full bg-white/10 text-white placeholder-white/25 rounded-xl px-3 py-2.5 text-sm font-body focus:outline-none resize-none"
            placeholder="Your biggest win today…"
          />
        </div>

        <button
          type="submit"
          disabled={!wentWell.trim() || submitting}
          className="w-full py-3 rounded-xl bg-teal text-background text-sm font-body font-medium disabled:opacity-40 active:scale-[0.98]"
        >
          {submitting ? 'Saving…' : 'Save reflection'}
        </button>
      </form>
    </div>
  )
}
