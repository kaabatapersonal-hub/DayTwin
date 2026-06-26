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
      className="fixed inset-0 z-50 bg-background flex flex-col"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 280 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-safe-top pt-4 pb-3 border-b border-white/[0.05]">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-white/35 font-body text-sm active:text-white/60 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Close
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-10">
        <h1 className="font-heading text-2xl font-bold text-white mb-1">Focus session</h1>
        <p className="text-sm font-body text-white/35 mb-8">
          Set a timer, lock in, and get it done.
        </p>

        {/* Duration */}
        <p className="text-xs font-body text-white/35 uppercase tracking-widest mb-3">Duration</p>
        <div className="grid grid-cols-3 gap-2.5 mb-3">
          {PRESET_DURATIONS.map(({ label, seconds }) => (
            <button
              key={seconds}
              onClick={() => { setSelected(seconds); setUseCustom(false) }}
              className="py-4 rounded-2xl text-sm font-body font-medium transition-all active:scale-95 border"
              style={!useCustom && selected === seconds ? {
                backgroundColor: '#D9A65318',
                color: '#D9A653',
                borderColor: '#D9A65340',
              } : {
                backgroundColor: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.45)',
                borderColor: 'transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom duration */}
        <button
          onClick={() => setUseCustom(true)}
          className="w-full py-3.5 rounded-2xl text-sm font-body font-medium mb-6 border transition-all active:scale-95"
          style={useCustom ? {
            backgroundColor: '#D9A65318',
            color: '#D9A653',
            borderColor: '#D9A65340',
          } : {
            backgroundColor: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.45)',
            borderColor: 'transparent',
          }}
        >
          Custom
        </button>

        {useCustom && (
          <div className="flex items-center gap-3 mb-6">
            <input
              type="number"
              min={1}
              max={180}
              value={customMin}
              onChange={e => setCustomMin(e.target.value)}
              placeholder="25"
              className="flex-1 bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-body text-white"
              autoFocus
            />
            <span className="text-sm font-body text-white/40">min (max 180)</span>
          </div>
        )}

        {/* Optional task link */}
        {incompleteTasks.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-body text-white/35 uppercase tracking-widest mb-3">
              Focus on <span className="normal-case text-white/20">(optional)</span>
            </p>
            <select
              value={taskId ?? ''}
              onChange={e => setTaskId(e.target.value || null)}
              className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3.5 text-sm font-body text-white"
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
          className="w-full py-4 rounded-2xl bg-gold text-background font-body font-semibold text-base active:scale-[0.98] transition-transform"
        >
          Start Session
        </button>
      </div>
    </motion.div>
  )
}
