'use client'

import { useState }                     from 'react'
import { motion }                        from 'framer-motion'
import { useTracking }                  from '@/contexts/TrackingContext'
import {
  TRACKING_CATEGORY_CONFIG,
  ALL_TRACKING_CATEGORIES,
}                                        from '@/lib/tracking-categories'
import type { TrackingCategory, Task }  from '@/types'

interface TrackingSheetProps {
  tasks:   Task[]    // today's incomplete tasks for optional linking
  onClose: () => void
}

/**
 * Bottom sheet for starting a manual time-tracking session.
 * The timer begins immediately on confirm and runs until stopped from the
 * persistent TrackingBar. Linking to a task is optional — most sessions won't.
 */
export function TrackingSheet({ tasks, onClose }: TrackingSheetProps) {
  const { startTracking }                    = useTracking()
  const [category, setCategory]             = useState<TrackingCategory>('coding')
  const [taskId,   setTaskId]               = useState<string | null>(null)
  const [loading,  setLoading]              = useState(false)
  const [error,    setError]                = useState<string | null>(null)

  const incompleteTasks = tasks.filter(t => !t.completed)

  async function handleStart() {
    setLoading(true)
    setError(null)
    try {
      await startTracking(category, taskId)
      onClose()
    } catch {
      setError('Failed to start timer. Please try again.')
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button onClick={onClose} className="flex-1 bg-black/50" aria-label="Dismiss" />

      <motion.div
        className="bg-[#141414] rounded-t-3xl px-5 pt-5 pb-safe-bottom pb-8"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />
        <h2 className="font-heading text-base font-semibold text-white mb-5">Start Timer</h2>

        {/* Category picker */}
        <p className="text-xs font-body text-white/35 uppercase tracking-widest mb-2">Category</p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {ALL_TRACKING_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`py-2.5 rounded-xl text-xs font-body font-medium transition-all ${
                category === cat
                  ? 'bg-teal/15 text-teal border border-teal/30'
                  : 'bg-white/[0.04] text-white/45 border border-transparent'
              }`}
            >
              {TRACKING_CATEGORY_CONFIG[cat].label}
            </button>
          ))}
        </div>

        {/* Optional task link — only shown when there are incomplete tasks */}
        {incompleteTasks.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-body text-white/35 uppercase tracking-widest mb-2">
              Link to task (optional)
            </p>
            <select
              value={taskId ?? ''}
              onChange={e => setTaskId(e.target.value || null)}
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-sm font-body text-white"
            >
              <option value="">No task</option>
              {incompleteTasks.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 font-body mb-3">{error}</p>
        )}

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-teal text-background font-body font-medium text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {loading ? 'Starting…' : 'Start Tracking'}
        </button>
      </motion.div>
    </motion.div>
  )
}
