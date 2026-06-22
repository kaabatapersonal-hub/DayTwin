'use client'

import { useState }     from 'react'
import { motion }       from 'framer-motion'
import type { Task }    from '@/types'

interface FocusSheetProps {
  tasks:   Task[]
  onStart: (plannedSeconds: number, taskId: string | null) => void
  onClose: () => void
}

const PRESET_DURATIONS = [
  { label: '25 min', seconds: 25 * 60 },
  { label: '45 min', seconds: 45 * 60 },
  { label: '60 min', seconds: 60 * 60 },
] as const

/**
 * Bottom sheet for configuring a focus session before starting it.
 * Offers three presets and a custom minute input. Duration is capped at 3 hours
 * (180 min) so the countdown never runs for longer than a realistic work block.
 */
export function FocusSheet({ tasks, onStart, onClose }: FocusSheetProps) {
  const [selected,  setSelected]  = useState(25 * 60)
  const [useCustom, setUseCustom] = useState(false)
  const [customMin, setCustomMin] = useState('')
  const [taskId,    setTaskId]    = useState<string | null>(null)

  function handleStart() {
    const planned = useCustom
      ? Math.max(1, Math.min(180, parseInt(customMin, 10) || 25)) * 60
      : selected
    onStart(planned, taskId)
  }

  const incompleteTasks = tasks.filter(t => !t.completed)

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
        <h2 className="font-heading text-base font-semibold text-white mb-5">Focus Session</h2>

        {/* Duration presets + custom */}
        <p className="text-xs font-body text-white/35 uppercase tracking-widest mb-2">Duration</p>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {PRESET_DURATIONS.map(({ label, seconds }) => (
            <button
              key={seconds}
              onClick={() => { setSelected(seconds); setUseCustom(false) }}
              className={`py-3 rounded-xl text-xs font-body font-medium transition-all ${
                !useCustom && selected === seconds
                  ? 'bg-gold/15 text-gold border border-gold/30'
                  : 'bg-white/[0.04] text-white/45 border border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setUseCustom(true)}
            className={`py-3 rounded-xl text-xs font-body font-medium transition-all ${
              useCustom
                ? 'bg-gold/15 text-gold border border-gold/30'
                : 'bg-white/[0.04] text-white/45 border border-transparent'
            }`}
          >
            Custom
          </button>
        </div>

        {useCustom && (
          <div className="flex items-center gap-3 mb-4">
            <input
              type="number"
              min={1}
              max={180}
              value={customMin}
              onChange={e => setCustomMin(e.target.value)}
              placeholder="25"
              className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-sm font-body text-white"
              autoFocus
            />
            <span className="text-sm font-body text-white/40">min (max 180)</span>
          </div>
        )}

        {/* Optional task link */}
        {incompleteTasks.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-body text-white/35 uppercase tracking-widest mb-2">
              Focus on (optional)
            </p>
            <select
              value={taskId ?? ''}
              onChange={e => setTaskId(e.target.value || null)}
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-sm font-body text-white"
            >
              <option value="">No specific task</option>
              {incompleteTasks.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={handleStart}
          className="w-full py-4 rounded-2xl bg-gold text-background font-body font-medium text-base active:scale-[0.98] transition-transform"
        >
          Start Session
        </button>
      </motion.div>
    </motion.div>
  )
}
