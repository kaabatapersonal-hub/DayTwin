'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CATEGORY_CONFIG, ALL_CATEGORIES } from '@/lib/categories'
import { htmlTimeToPg, pgTimeToHtml } from '@/lib/format'
import type { Task, TaskCategory, TaskPriority } from '@/types'

export type FormMode = 'add-time-block' | 'add-quick' | 'edit'

export interface TaskFormData {
  title:      string
  date:       string
  start_time: string | null
  end_time:   string | null
  category:   TaskCategory
  priority:   TaskPriority
  completed:  boolean
  project_id: null  // not wired in Session 2
}

interface TaskFormProps {
  mode:         FormMode
  date:         string
  initialTask?: Task
  onSubmit:     (data: TaskFormData) => Promise<void>
  onDelete?:    () => Promise<void>  // only provided when editing
  onClose:      () => void
}

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high']
const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low', medium: 'Medium', high: 'High',
}

/**
 * Bottom-sheet form for creating and editing tasks.
 * Slides up with a spring animation over a dimmed backdrop.
 *
 * Time fields are shown for:
 *   - 'add-time-block': always (user explicitly chose to plan a time slot)
 *   - 'edit': always (lets user add or remove times on existing tasks)
 *   - 'add-quick': never (quick tasks intentionally have no fixed time)
 */
export function TaskForm({
  mode, date, initialTask, onSubmit, onDelete, onClose,
}: TaskFormProps) {
  const isEdit        = mode === 'edit'
  const showTimeFields = mode !== 'add-quick'

  const [title,     setTitle]     = useState(initialTask?.title    ?? '')
  const [taskDate,  setTaskDate]  = useState(initialTask?.date     ?? date)
  const [startTime, setStartTime] = useState(pgTimeToHtml(initialTask?.start_time ?? null))
  const [endTime,   setEndTime]   = useState(pgTimeToHtml(initialTask?.end_time   ?? null))
  const [category,  setCategory]  = useState<TaskCategory>(initialTask?.category ?? 'deep_work')
  const [priority,  setPriority]  = useState<TaskPriority>(initialTask?.priority  ?? 'medium')
  const [submitting, setSubmitting] = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [formError,  setFormError]  = useState<string | null>(null)

  const heading =
    isEdit               ? 'Edit task'    :
    mode === 'add-time-block' ? 'Time block' :
                           'Quick task'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return

    setFormError(null)
    setSubmitting(true)
    try {
      await onSubmit({
        title:      trimmed,
        date:       taskDate,
        start_time: showTimeFields && startTime ? htmlTimeToPg(startTime) : null,
        end_time:   showTimeFields && endTime   ? htmlTimeToPg(endTime)   : null,
        category,
        priority,
        completed:  initialTask?.completed ?? false,
        project_id: null,
      })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    setFormError(null)
    setDeleting(true)
    try {
      await onDelete()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete')
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Backdrop — tap to close */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-40"
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#141414] rounded-t-3xl px-5 pt-4 pb-safe-bottom"
      >
        {/* Drag handle (decorative) */}
        <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-5" />

        <h2 className="font-heading text-base font-semibold text-white mb-5">
          {heading}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What are you working on?"
            className="w-full bg-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm font-body focus:outline-none focus:ring-1 focus:ring-teal/40"
            autoFocus
          />

          {/* Date */}
          <div>
            <label className="block text-xs text-white/40 font-body mb-1.5">Date</label>
            <input
              type="date"
              value={taskDate}
              onChange={e => setTaskDate(e.target.value)}
              className="w-full bg-white/10 text-white rounded-2xl px-4 py-3 text-sm font-body focus:outline-none focus:ring-1 focus:ring-teal/40"
            />
          </div>

          {/* Time fields — time-blocked tasks only */}
          {showTimeFields && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-white/40 font-body mb-1.5">Start</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full bg-white/10 text-white rounded-2xl px-4 py-3 text-sm font-body focus:outline-none focus:ring-1 focus:ring-teal/40"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-white/40 font-body mb-1.5">End</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full bg-white/10 text-white rounded-2xl px-4 py-3 text-sm font-body focus:outline-none focus:ring-1 focus:ring-teal/40"
                />
              </div>
            </div>
          )}

          {/* Category picker */}
          <div>
            <label className="block text-xs text-white/40 font-body mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map(cat => {
                const cfg      = CATEGORY_CONFIG[cat]
                const selected = category === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className="px-3 py-1.5 rounded-full text-xs font-body transition-all active:scale-95"
                    style={{
                      backgroundColor: selected ? cfg.color : 'rgba(255,255,255,0.08)',
                      color:           selected ? '#080808' : cfg.color,
                    }}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Priority picker */}
          <div>
            <label className="block text-xs text-white/40 font-body mb-2">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-body transition-all active:scale-95 ${
                    priority === p
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-white/35'
                  }`}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Error message */}
          {formError && (
            <p className="text-xs text-red-400 font-body">{formError}</p>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2 pb-2">
            {isEdit && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-3.5 rounded-2xl bg-red-500/10 text-red-400 text-sm font-body disabled:opacity-40 active:bg-red-500/20 transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              className="flex-1 py-3.5 bg-teal text-background rounded-2xl text-sm font-body font-medium disabled:opacity-40 transition-opacity active:scale-[0.98]"
            >
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add task'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  )
}
