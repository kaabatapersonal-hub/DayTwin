'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchActiveHabits, createHabit, updateHabit, archiveHabit,
} from '@/lib/habits'
import type { Habit, HabitWithStreak, NewHabit } from '@/types'

interface UseHabitsReturn {
  habits: HabitWithStreak[]
  add:    (payload: NewHabit) => Promise<void>
  update: (id: string, updates: Partial<Pick<Habit, 'name' | 'type' | 'target_value' | 'frequency'>>) => Promise<void>
  archive: (id: string) => Promise<void>
  reload:  () => Promise<void>
  error:   string | null
}

/**
 * Manages the active habit list for the Habits tab.
 *
 * add/update wait for the server before updating UI (habits are slow-path writes).
 * archive is optimistic — removes the row instantly, rolls back on failure.
 */
export function useHabits(initialHabits: HabitWithStreak[]): UseHabitsReturn {
  const [habits, setHabits] = useState<HabitWithStreak[]>(initialHabits)
  const [error, setError]   = useState<string | null>(null)
  const supabase             = createClient()

  const reload = useCallback(async () => {
    try {
      const fresh = await fetchActiveHabits(supabase)
      setHabits(fresh)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reload habits')
    }
  }, [supabase])

  const add = useCallback(async (payload: NewHabit) => {
    setError(null)
    try {
      const habit = await createHabit(supabase, payload)
      setHabits(prev => [...prev, {
        habit,
        streak: {
          habit_id:                 habit.id,
          current_streak:           0,
          consistency_30d_pct:      0,
          grace_day_used_this_week: false,
          last_grace_reset:         null,
        },
      }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create habit')
    }
  }, [supabase])

  const update = useCallback(async (
    id:      string,
    updates: Partial<Pick<Habit, 'name' | 'type' | 'target_value' | 'frequency'>>,
  ) => {
    setError(null)
    try {
      const saved = await updateHabit(supabase, id, updates)
      setHabits(prev => prev.map(h => h.habit.id === id ? { ...h, habit: saved } : h))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update habit')
    }
  }, [supabase])

  const archive = useCallback(async (id: string) => {
    setError(null)
    const snapshot = habits.find(h => h.habit.id === id)
    // Optimistic: remove immediately
    setHabits(prev => prev.filter(h => h.habit.id !== id))
    try {
      await archiveHabit(supabase, id)
    } catch (err) {
      if (snapshot) setHabits(prev => [...prev, snapshot])
      setError(err instanceof Error ? err.message : 'Failed to archive habit')
    }
  }, [supabase, habits])

  return { habits, add, update, archive, reload, error }
}
