'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createGoal, updateGoal, archiveGoal } from '@/lib/goals'
import type { Goal, NewGoal } from '@/types'

interface UseGoalsReturn {
  goals:   Goal[]
  add:     (payload: NewGoal) => Promise<void>
  update:  (id: string, updates: Partial<Pick<Goal, 'title' | 'why_text' | 'deadline' | 'progress_pct' | 'status'>>) => Promise<Goal>
  archive: (id: string) => Promise<void>
  error:   string | null
}

/**
 * Manages the goal list for the Growth tab.
 * Archive is optimistic (removes immediately, rolls back on failure).
 * Add and update wait for the server before updating UI so the returned
 * row (with its DB-generated id / timestamps) drives the state.
 */
export function useGoals(initialGoals: Goal[]): UseGoalsReturn {
  const [goals, setGoals] = useState<Goal[]>(initialGoals)
  const [error, setError] = useState<string | null>(null)
  const supabase           = createClient()

  const add = useCallback(async (payload: NewGoal) => {
    setError(null)
    try {
      const created = await createGoal(supabase, payload)
      setGoals(prev => [created, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create goal')
    }
  }, [supabase])

  const update = useCallback(async (
    id:      string,
    updates: Partial<Pick<Goal, 'title' | 'why_text' | 'deadline' | 'progress_pct' | 'status'>>,
  ): Promise<Goal> => {
    setError(null)
    const saved = await updateGoal(supabase, id, updates)
    setGoals(prev => prev.map(g => g.id === id ? saved : g))
    return saved
  }, [supabase])

  const archive = useCallback(async (id: string) => {
    setError(null)
    const snapshot = goals.find(g => g.id === id)
    setGoals(prev => prev.filter(g => g.id !== id))
    try {
      await archiveGoal(supabase, id)
    } catch (err) {
      if (snapshot) setGoals(prev => [snapshot, ...prev])
      setError(err instanceof Error ? err.message : 'Failed to archive goal')
    }
  }, [supabase, goals])

  return { goals, add, update, archive, error }
}
