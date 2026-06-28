'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useKeyboardOffset } from '@/hooks/useKeyboardOffset'
import type { Project, ProjectStatus, NewProject, Goal } from '@/types'

export type ProjectFormData = NewProject

interface ProjectFormProps {
  initialProject?: Project
  prefilledGoalId?: string     // when opened from GoalDetail, goal is already set
  goals:            Goal[]      // all active goals for the selector
  onSubmit:         (data: ProjectFormData) => Promise<void>
  onArchive?:       () => Promise<void>
  onClose:          () => void
}

const STATUSES: ProjectStatus[] = ['active', 'completed']

/** Bottom sheet for creating or editing a project. */
export function ProjectForm({
  initialProject, prefilledGoalId, goals, onSubmit, onArchive, onClose,
}: ProjectFormProps) {
  const isEdit = Boolean(initialProject)

  const [title,      setTitle]      = useState(initialProject?.title  ?? '')
  const [goalId,     setGoalId]     = useState<string | null>(
    initialProject?.goal_id ?? prefilledGoalId ?? null,
  )
  const [status,     setStatus]     = useState<ProjectStatus>(initialProject?.status ?? 'active')
  const [submitting, setSubmitting] = useState(false)
  const [archiving,  setArchiving]  = useState(false)
  const [formError,  setFormError]  = useState<string | null>(null)

  const { bottom, maxHeight } = useKeyboardOffset()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    setFormError(null)
    setSubmitting(true)
    try {
      await onSubmit({ title: trimmed, goal_id: goalId, status })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  async function handleArchive() {
    if (!onArchive) return
    setArchiving(true)
    try {
      await onArchive()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to archive')
      setArchiving(false)
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/60 z-40" />

      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 36, stiffness: 400 }}
        className="fixed left-0 right-0 z-50 bg-[#141414] rounded-t-3xl px-5 pt-4 pb-safe-bottom overflow-y-auto"
        style={{ bottom, maxHeight }}
      >
        <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-5" />
        <h2 className="font-heading text-base font-semibold text-white mb-5">
          {isEdit ? 'Edit project' : 'New project'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Project name"
            className="w-full bg-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm font-body focus:outline-none focus:ring-1 focus:ring-teal/40"
            autoFocus
          />

          {/* Goal link — hidden if goal was pre-filled from GoalDetail context */}
          {!prefilledGoalId && (
            <div>
              <label className="block text-xs text-white/40 font-body mb-1.5">
                Linked goal (optional)
              </label>
              <select
                value={goalId ?? ''}
                onChange={e => setGoalId(e.target.value || null)}
                className="w-full bg-white/10 text-white rounded-2xl px-4 py-3 text-sm font-body focus:outline-none focus:ring-1 focus:ring-teal/40 appearance-none"
              >
                <option value="">No goal</option>
                {goals.map(g => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </div>
          )}

          {isEdit && (
            <div>
              <label className="block text-xs text-white/40 font-body mb-2">Status</label>
              <div className="flex gap-2">
                {STATUSES.map(s => (
                  <button key={s} type="button" onClick={() => setStatus(s)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-body capitalize transition-all active:scale-95 ${
                      status === s ? 'bg-teal text-background' : 'bg-white/8 text-white/50'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {formError && <p className="text-xs text-red-400 font-body">{formError}</p>}

          <div className="flex gap-3 pt-2 pb-2">
            {isEdit && onArchive && (
              <button type="button" onClick={handleArchive} disabled={archiving}
                className="px-4 py-3.5 rounded-2xl bg-red-500/10 text-red-400 text-sm font-body disabled:opacity-40">
                {archiving ? 'Archiving…' : 'Archive'}
              </button>
            )}
            <button type="submit" disabled={!title.trim() || submitting}
              className="flex-1 py-3.5 bg-teal text-background rounded-2xl text-sm font-body font-medium disabled:opacity-40 active:scale-[0.98]">
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add project'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  )
}
