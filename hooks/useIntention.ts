'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveIntention } from '@/lib/intentions'
import type { Intention } from '@/types'

interface UseIntentionReturn {
  intention: Intention | null
  /** True when the prompt should be shown: no intention yet AND not dismissed today. */
  showPrompt: boolean
  save:    (text: string) => Promise<void>
  /** Dismiss without saving. Stores a flag in localStorage so the card stays hidden
   *  for the rest of today without requiring a database write for a non-answer. */
  dismiss: () => void
  error:   string | null
}

/**
 * Manages the morning intention card state.
 *
 * Dismissal is tracked in localStorage keyed by date so it survives page refreshes
 * but resets automatically the next day (different key). The DB is only written when
 * the user actually sets an intention — not on dismiss.
 */
export function useIntention(
  initial: Intention | null,
  date: string,
): UseIntentionReturn {
  const [intention, setIntention] = useState<Intention | null>(initial)
  const [dismissed, setDismissed] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const supabase                   = createClient()

  // Check localStorage on mount — the user may have dismissed earlier this session
  useEffect(() => {
    if (localStorage.getItem(`daytwin_intent_dismissed_${date}`) === '1') {
      setDismissed(true)
    }
  }, [date])

  const dismiss = useCallback(() => {
    localStorage.setItem(`daytwin_intent_dismissed_${date}`, '1')
    setDismissed(true)
  }, [date])

  const save = useCallback(async (text: string) => {
    setError(null)
    try {
      const saved = await saveIntention(supabase, date, text)
      setIntention(saved)
      // If the user previously dismissed but then set an intention, clear the dismissal
      localStorage.removeItem(`daytwin_intent_dismissed_${date}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save intention')
    }
  }, [supabase, date])

  const showPrompt = !intention && !dismissed

  return { intention, showPrompt, save, dismiss, error }
}
