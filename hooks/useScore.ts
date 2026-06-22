'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { computeScorePct, upsertDailyScore } from '@/lib/scores'
import type { Task, TodayHabit } from '@/types'

interface UseScoreReturn {
  score:       number
  recalculate: (
    tasks:          Task[],
    habits:         TodayHabit[],
    reflectionDone: boolean,
    moodLogged:     boolean,
  ) => Promise<void>
}

/**
 * Manages the daily score for the Today screen.
 *
 * Design: the parent (TodayScreen) calls `recalculate()` whenever any
 * contributing factor changes (task toggle, habit check, reflection submit,
 * mood log). The hook computes the new score locally, updates state for
 * instant UI feedback, then upserts to Supabase in the background.
 */
export function useScore(initialScore: number, date: string): UseScoreReturn {
  const [score, setScore] = useState(initialScore)
  const supabase           = createClient()

  const recalculate = useCallback(async (
    tasks:          Task[],
    habits:         TodayHabit[],
    reflectionDone: boolean,
    moodLogged:     boolean,
  ) => {
    const { score: newScore, breakdown } = computeScorePct(
      tasks, habits, reflectionDone, moodLogged,
    )
    setScore(newScore)

    // Upsert is fire-and-forget here — a failed write doesn't break the UI
    try {
      await upsertDailyScore(supabase, date, newScore, breakdown)
    } catch {
      // Silently swallow — the score is still shown correctly in the UI
    }
  }, [supabase, date])

  return { score, recalculate }
}
