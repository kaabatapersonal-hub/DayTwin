'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useKeyboardOffset } from '@/hooks/useKeyboardOffset'
import type { Goal, GoalStatus, NewGoal } from '@/types'

export type GoalFormData = NewGoal

interface GoalFormProps {
  initialGoal?: Goal
  onSubmit:     (data: GoalFormData) => Promise<void>
  onArchive?:   () => Promise<void>
  onClose:      () => void
}

const STATUSES: GoalStatus[] = ['active', 'completed']
const STATUS_LABEL: Record<GoalStatus, string> = { active: 'Active', completed: 'Completed', archived: 'Archived' }

/**
 * Bottom sheet for creating or editing a goal.
 * why_text is labeled "Your WHY" — the emotional anchor of the goal.
 * Status only shows 'active' and 'completed' for manual toggling;
 * archiving is a separate destructive action via the Archive button.
 */
export function GoalForm({ initialGoal, onSubmit, onArchive, onClose }: GoalFormProps) {
  const isEdit = Boolean(initialGoal)

  const [title,     setTitle]     = useState(initialGoal?.title    ?? '')
  const [whyText,   setWhyText]   = useState(initialGoal?.why_text ?? '')
  const [deadline,  setDeadline]  = useState(initialGoal?.deadline ?? '')
  const [status,    setStatus]    = useState<GoalStatus>(initialGoal?.status ?? 'active')
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
      await onSubmit({
        title:    trimmed,
        why_text: whyText.trim() || null,
        deadline: deadline || null,
        status,
      })
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
          {isEdit ? 'Edit goal' : 'New goal'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Goal title"
            className="w-full bg-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm font-body focus:outline-none focus:ring-1 focus:ring-gold/40"
            autoFocus
          />

          <div>
            <label className="block text-xs text-white/40 font-body mb-1.5">Your WHY (optional)</label>
            <textarea
              value={whyText}
              onChange={e => setWhyText(e.target.value)}
              placeholder="Why does this goal matter to you?"
              rows={3}
              className="w-full bg-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm font-body focus:outline-none focus:ring-1 focus:ring-gold/40 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-white/40 font-body mb-1.5">Deadline (optional)</label>
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="w-full bg-white/10 text-white rounded-2xl px-4 py-3 text-sm font-body focus:outline-none focus:ring-1 focus:ring-gold/40"
            />
          </div>

          {isEdit && (
            <div>
              <label className="block text-xs text-white/40 font-body mb-2">Status</label>
              <div className="flex gap-2">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-body transition-all active:scale-95 ${
                      status === s ? 'bg-gold text-background' : 'bg-white/8 text-white/50'
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {formError && <p className="text-xs text-red-400 font-body">{formError}</p>}

          <div className="flex gap-3 pt-2 pb-2">
            {isEdit && onArchive && (
              <button type="button" onClick={handleArchive} disabled={archiving}
                className="px-4 py-3.5 rounded-2xl bg-red-500/10 text-red-400 text-sm font-body disabled:opacity-40 active:bg-red-500/20">
                {archiving ? 'Archiving…' : 'Archive'}
              </button>
            )}
            <button type="submit" disabled={!title.trim() || submitting}
              className="flex-1 py-3.5 bg-gold text-background rounded-2xl text-sm font-body font-medium disabled:opacity-40 active:scale-[0.98]">
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add goal'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  )
}
