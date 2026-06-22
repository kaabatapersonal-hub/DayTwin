'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logMood } from '@/lib/mood'
import type { MoodLog, NewMoodLog } from '@/types'

interface UseMoodReturn {
  moods:  MoodLog[]
  log:    (payload: NewMoodLog) => Promise<void>
  error:  string | null
}

/** Manages today's mood logs. Adding a log appends to the list immediately. */
export function useMood(initialMoods: MoodLog[]): UseMoodReturn {
  const [moods, setMoods] = useState<MoodLog[]>(initialMoods)
  const [error, setError] = useState<string | null>(null)
  const supabase           = createClient()

  const log = useCallback(async (payload: NewMoodLog) => {
    setError(null)
    try {
      const created = await logMood(supabase, payload)
      setMoods(prev => [...prev, created])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log mood')
    }
  }, [supabase])

  return { moods, log, error }
}
