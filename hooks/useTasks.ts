'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createTask, updateTask, deleteTask } from '@/lib/tasks'
import type { Task, NewTask } from '@/types'

interface UseTasksReturn {
  /** Time-blocked tasks (start_time !== null), sorted by start_time ascending */
  timeBlocked: Task[]
  /** Quick tasks (start_time === null), in insertion order */
  quick: Task[]
  add: (task: NewTask) => Promise<void>
  update: (id: string, updates: Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>) => Promise<void>
  remove: (id: string) => Promise<void>
  /** Toggles completion and sets/clears completed_at. Optimistic — responds instantly. */
  toggleComplete: (task: Task) => Promise<void>
  error: string | null
  clearError: () => void
}

/**
 * Manages task CRUD for the Today screen.
 *
 * Uses optimistic updates for completion toggles and deletes so the UI responds
 * immediately. Edits and creates wait for the server and update state on success.
 * Any server failure surfaces as `error` for display in the UI — never silent.
 */
export function useTasks(initialTasks: Task[]): UseTasksReturn {
  const [tasks, setTasks]   = useState<Task[]>(initialTasks)
  const [error, setError]   = useState<string | null>(null)
  const supabase             = createClient()

  // Keep a ref so callbacks that need the current task list don't close over stale state
  const tasksRef = useRef(tasks)
  useEffect(() => { tasksRef.current = tasks }, [tasks])

  const clearError = useCallback(() => setError(null), [])

  const add = useCallback(async (taskData: NewTask) => {
    setError(null)
    try {
      const created = await createTask(supabase, taskData)
      setTasks(prev => {
        const next = [...prev, created]
        // Keep time-blocked tasks sorted by start_time
        return next.sort((a, b) => {
          if (!a.start_time && !b.start_time) return 0
          if (!a.start_time) return 1
          if (!b.start_time) return -1
          return a.start_time.localeCompare(b.start_time)
        })
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add task')
    }
  }, [supabase])

  const update = useCallback(async (
    id: string,
    updates: Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>,
  ) => {
    setError(null)
    try {
      const saved = await updateTask(supabase, id, updates)
      setTasks(prev => prev.map(t => t.id === id ? saved : t))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task')
    }
  }, [supabase])

  const remove = useCallback(async (id: string) => {
    setError(null)
    // Optimistic: remove from UI immediately
    const snapshot = tasksRef.current.find(t => t.id === id)
    setTasks(prev => prev.filter(t => t.id !== id))
    try {
      await deleteTask(supabase, id)
    } catch (err) {
      // Roll back to the snapshotted task
      if (snapshot) setTasks(prev => [...prev, snapshot])
      setError(err instanceof Error ? err.message : 'Failed to delete task')
    }
  }, [supabase])

  const toggleComplete = useCallback(async (task: Task) => {
    const newCompleted = !task.completed
    const now = new Date().toISOString()
    // Optimistic: check box fills instantly
    setTasks(prev =>
      prev.map(t =>
        t.id === task.id
          ? { ...t, completed: newCompleted, completed_at: newCompleted ? now : null }
          : t,
      ),
    )
    try {
      await updateTask(supabase, task.id, {
        completed:    newCompleted,
        completed_at: newCompleted ? now : null,
      })
    } catch (err) {
      // Roll back to original state
      setTasks(prev => prev.map(t => t.id === task.id ? task : t))
      setError(err instanceof Error ? err.message : 'Failed to update task')
    }
  }, [supabase])

  const timeBlocked = tasks
    .filter(t => t.start_time !== null)
    .sort((a, b) => a.start_time!.localeCompare(b.start_time!))

  const quick = tasks.filter(t => t.start_time === null)

  return { timeBlocked, quick, add, update, remove, toggleComplete, error, clearError }
}
