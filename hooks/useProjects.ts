'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createProject, updateProject, archiveProject } from '@/lib/projects'
import type { Project, NewProject } from '@/types'

interface UseProjectsReturn {
  projects: Project[]
  add:      (payload: NewProject) => Promise<Project>
  update:   (id: string, updates: Partial<Pick<Project, 'title' | 'goal_id' | 'status'>>) => Promise<void>
  archive:  (id: string) => Promise<void>
  error:    string | null
}

/**
 * Manages a project list — used both in GoalDetail (filtered by goal)
 * and in the standalone project selector for TaskForm.
 */
export function useProjects(initialProjects: Project[]): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [error, setError]       = useState<string | null>(null)
  const supabase                 = createClient()

  const add = useCallback(async (payload: NewProject): Promise<Project> => {
    setError(null)
    try {
      const created = await createProject(supabase, payload)
      setProjects(prev => [...prev, created])
      return created
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create project'
      setError(msg)
      throw new Error(msg)
    }
  }, [supabase])

  const update = useCallback(async (
    id:      string,
    updates: Partial<Pick<Project, 'title' | 'goal_id' | 'status'>>,
  ) => {
    setError(null)
    try {
      const saved = await updateProject(supabase, id, updates)
      setProjects(prev => prev.map(p => p.id === id ? saved : p))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project')
    }
  }, [supabase])

  const archive = useCallback(async (id: string) => {
    setError(null)
    const snapshot = projects.find(p => p.id === id)
    setProjects(prev => prev.filter(p => p.id !== id))
    try {
      await archiveProject(supabase, id)
    } catch (err) {
      if (snapshot) setProjects(prev => [...prev, snapshot])
      setError(err instanceof Error ? err.message : 'Failed to archive project')
    }
  }, [supabase, projects])

  return { projects, add, update, archive, error }
}
