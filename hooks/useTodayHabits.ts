'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { upsertHabitLog, refreshStreak } from '@/lib/habits'
import { todayISO } from '@/lib/format'
import type { TodayHabit, HabitLog } from '@/types'

interface TimerState {
  habitId:   string
  startedAt: number  // Date.now() adjusted so elapsed = now - startedAt
}

interface TodayHabitDisplay extends TodayHabit {
  currentValue: number   // live for timers, logged value for count, 0 for boolean
  timerRunning: boolean
}

interface UseTodayHabitsReturn {
  habits:         TodayHabitDisplay[]
  toggleBoolean:  (habitId: string) => Promise<void>
  incrementCount: (habitId: string) => Promise<void>
  startTimer:     (habitId: string) => void
  stopTimer:      (habitId: string) => Promise<void>
  error:          string | null
}

/**
 * Manages check-off interactions for today's scheduled habits.
 *
 * Timer state lives in-memory only (a ref + setInterval) so it survives
 * re-renders without unnecessary effect churn. The timer value is only
 * persisted to the DB when the user taps Stop.
 *
 * Only one timer can run at a time — starting a new one stops the previous.
 */
export function useTodayHabits(initial: TodayHabit[]): UseTodayHabitsReturn {
  const [habits, setHabits] = useState<TodayHabit[]>(initial)
  const [error, setError]   = useState<string | null>(null)
  // Tick forces re-renders while a timer is running (once per second)
  const [, setTick]         = useState(0)
  const supabase             = createClient()

  const timerRef    = useRef<TimerState | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up interval on unmount
  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  function clearTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    timerRef.current = null
  }

  function elapsedSeconds(habitId: string, logValue: number | null): number {
    if (timerRef.current?.habitId === habitId) {
      return Math.floor((Date.now() - timerRef.current.startedAt) / 1000)
    }
    return logValue ?? 0
  }

  function applyLog(habitId: string, log: HabitLog) {
    setHabits(prev => prev.map(h => h.habit.id === habitId ? { ...h, log } : h))
  }

  // ── Boolean toggle ──────────────────────────────────────────────────────────

  const toggleBoolean = useCallback(async (habitId: string) => {
    setError(null)
    const item    = habits.find(h => h.habit.id === habitId)
    if (!item) return
    const newDone = !(item.log?.completed ?? false)
    // Optimistic
    applyLog(habitId, {
      ...item.log,
      id:        item.log?.id ?? '',
      habit_id:  habitId,
      user_id:   item.log?.user_id ?? '',
      date:      todayISO(),
      value:     null,
      completed: newDone,
    })
    try {
      const saved = await upsertHabitLog(supabase, habitId, todayISO(), null, newDone)
      applyLog(habitId, saved)
      // Streak refresh is fire-and-forget — it updates the DB for the Habits tab
      // to read, but the streak value shown on Today doesn't re-render from this.
      refreshStreak(supabase, item.habit, todayISO()).catch(console.error)
    } catch (err) {
      // Roll back
      setHabits(prev => prev.map(h => h.habit.id === habitId ? item : h))
      setError(err instanceof Error ? err.message : 'Failed to update habit')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits, supabase])

  // ── Count increment ─────────────────────────────────────────────────────────

  const incrementCount = useCallback(async (habitId: string) => {
    setError(null)
    const item = habits.find(h => h.habit.id === habitId)
    if (!item) return
    const prev    = item.log?.value ?? 0
    const newVal  = prev + 1
    const done    = item.habit.target_value !== null && newVal >= item.habit.target_value
    // Optimistic
    applyLog(habitId, {
      ...item.log,
      id:        item.log?.id ?? '',
      habit_id:  habitId,
      user_id:   item.log?.user_id ?? '',
      date:      todayISO(),
      value:     newVal,
      completed: done,
    })
    try {
      const saved = await upsertHabitLog(supabase, habitId, todayISO(), newVal, done)
      applyLog(habitId, saved)
      refreshStreak(supabase, item.habit, todayISO()).catch(console.error)
    } catch (err) {
      setHabits(prevState => prevState.map(h => h.habit.id === habitId ? item : h))
      setError(err instanceof Error ? err.message : 'Failed to update habit')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits, supabase])

  // ── Timer ───────────────────────────────────────────────────────────────────

  const startTimer = useCallback((habitId: string) => {
    const item   = habits.find(h => h.habit.id === habitId)
    if (!item) return
    clearTimer()
    // Adjust start so elapsed = (now - startedAt), accounting for already-logged seconds
    const already   = item.log?.value ?? 0
    timerRef.current = {
      habitId,
      startedAt: Date.now() - already * 1000,
    }
    intervalRef.current = setInterval(() => setTick(t => t + 1), 1000)
  }, [habits])

  const stopTimer = useCallback(async (habitId: string) => {
    if (!timerRef.current || timerRef.current.habitId !== habitId) return
    const elapsed = Math.floor((Date.now() - timerRef.current.startedAt) / 1000)
    clearTimer()
    setError(null)

    const item = habits.find(h => h.habit.id === habitId)
    if (!item) return
    const done = item.habit.target_value !== null && elapsed >= item.habit.target_value
    try {
      const saved = await upsertHabitLog(supabase, habitId, todayISO(), elapsed, done)
      applyLog(habitId, saved)
      refreshStreak(supabase, item.habit, todayISO()).catch(console.error)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save timer')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits, supabase])

  // ── Derived display list ────────────────────────────────────────────────────

  const display: TodayHabitDisplay[] = habits.map(h => ({
    ...h,
    currentValue: elapsedSeconds(h.habit.id, h.log?.value ?? null),
    timerRunning: timerRef.current?.habitId === h.habit.id,
  }))

  return { habits: display, toggleBoolean, incrementCount, startTimer, stopTimer, error }
}
