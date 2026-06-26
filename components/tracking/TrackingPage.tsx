'use client'

import { useState, useEffect } from 'react'
import { motion }               from 'framer-motion'
import { useTracking }          from '@/contexts/TrackingContext'
import {
  TRACKING_CATEGORY_CONFIG,
  ALL_TRACKING_CATEGORIES,
} from '@/lib/tracking-categories'
import type { TrackingCategory, Task } from '@/types'

interface TrackingPageProps {
  tasks:   Task[]
  onClose: () => void
}

// ── Digit box ────────────────────────────────────────────────────────────────
function Digit({ value }: { value: string }) {
  return (
    <div className="w-[3.25rem] h-[4.25rem] bg-white/[0.06] rounded-xl flex items-center justify-center">
      <span className="text-[2.75rem] font-heading font-bold text-white tabular-nums leading-none tracking-tight">
        {value}
      </span>
    </div>
  )
}

function DigitPair({ value, label }: { value: number; label: string }) {
  const str = String(value).padStart(2, '0')
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1.5">
        <Digit value={str[0]} />
        <Digit value={str[1]} />
      </div>
      <span className="text-[9px] font-body text-white/20 uppercase tracking-[0.2em]">{label}</span>
    </div>
  )
}

function Colon() {
  return (
    <div className="flex flex-col gap-2.5 mb-7">
      <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
      <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function TrackingPage({ tasks, onClose }: TrackingPageProps) {
  const { activeEntry, startTracking, stopTracking } = useTracking()

  const [category, setCategory] = useState<TrackingCategory>(
    (activeEntry?.category as TrackingCategory) ?? 'coding'
  )
  const [taskId,   setTaskId]   = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [stopping, setStopping] = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [elapsed,  setElapsed]  = useState(0)

  const isRunning = Boolean(activeEntry)
  const activeConfig = TRACKING_CATEGORY_CONFIG[activeEntry?.category as TrackingCategory ?? 'personal']
  const incompleteTasks = tasks.filter(t => !t.completed)

  useEffect(() => {
    if (!activeEntry) { setElapsed(0); return }
    const startMs = new Date(activeEntry.start_at).getTime()
    setElapsed(Math.floor((Date.now() - startMs) / 1000))
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startMs) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [activeEntry?.id])

  async function handleStart() {
    setLoading(true); setError(null)
    try {
      await startTracking(category, taskId)
    } catch {
      setError('Failed to start. Please try again.')
      setLoading(false)
    }
  }

  async function handleStop() {
    setStopping(true)
    try {
      await stopTracking()
      onClose()
    } finally {
      setStopping(false)
    }
  }

  const hours = Math.floor(elapsed / 3600)
  const mins  = Math.floor((elapsed % 3600) / 60)
  const secs  = elapsed % 60

  const linkedTask = activeEntry?.task_id
    ? tasks.find(t => t.id === activeEntry.task_id)
    : null

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
          {isRunning ? 'Back to app' : 'Close'}
        </button>

        {isRunning && (
          <button
            onClick={handleStop}
            disabled={stopping}
            className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 font-body text-sm font-medium disabled:opacity-40 active:bg-red-500/15 transition-colors"
          >
            {stopping ? 'Stopping…' : 'Stop timer'}
          </button>
        )}
      </div>

      {isRunning ? (
        // ── Running view ────────────────────────────────────────────────────
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">

          {/* Category pill */}
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full border mb-14"
            style={{ borderColor: activeConfig.color + '30', backgroundColor: activeConfig.color + '10' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: activeConfig.color }}
            />
            <span
              className="text-xs font-body font-medium uppercase tracking-widest"
              style={{ color: activeConfig.color }}
            >
              {activeConfig.label}
            </span>
          </div>

          {/* Digital clock */}
          <div className="flex items-center gap-3">
            {hours > 0 && (
              <>
                <DigitPair value={hours} label="hrs" />
                <Colon />
              </>
            )}
            <DigitPair value={mins} label="min" />
            <Colon />
            <DigitPair value={secs} label="sec" />
          </div>

          {/* Linked task */}
          {linkedTask && (
            <p className="mt-12 text-sm font-body text-white/30 max-w-[240px] leading-relaxed">
              {linkedTask.title}
            </p>
          )}

          {!linkedTask && (
            <p className="mt-12 text-xs font-body text-white/15 uppercase tracking-widest">
              Time in motion
            </p>
          )}
        </div>
      ) : (
        // ── Setup view ──────────────────────────────────────────────────────
        <div className="flex-1 overflow-y-auto px-5 pt-6 pb-10">
          <h1 className="font-heading text-2xl font-bold text-white mb-1">Start timer</h1>
          <p className="text-sm font-body text-white/35 mb-8">Track where your time goes.</p>

          <p className="text-xs font-body text-white/35 uppercase tracking-widest mb-3">Category</p>
          <div className="grid grid-cols-3 gap-2.5 mb-8">
            {ALL_TRACKING_CATEGORIES.map(cat => {
              const cfg     = TRACKING_CATEGORY_CONFIG[cat]
              const isActive = category === cat
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className="py-4 rounded-2xl text-sm font-body font-medium transition-all active:scale-95 border"
                  style={isActive ? {
                    backgroundColor: cfg.color + '18',
                    color:           cfg.color,
                    borderColor:     cfg.color + '40',
                  } : {
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    color:           'rgba(255,255,255,0.45)',
                    borderColor:     'transparent',
                  }}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>

          {incompleteTasks.length > 0 && (
            <div className="mb-8">
              <p className="text-xs font-body text-white/35 uppercase tracking-widest mb-3">
                Link to task <span className="normal-case text-white/20">(optional)</span>
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

          {error && <p className="text-xs text-red-400 font-body mb-4">{error}</p>}

          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-teal text-background font-body font-semibold text-base disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            {loading ? 'Starting…' : 'Start Tracking'}
          </button>
        </div>
      )}
    </motion.div>
  )
}
