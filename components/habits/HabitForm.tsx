'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Habit, HabitType, HabitFrequency, DayOfWeek, NewHabit } from '@/types'

export type HabitFormData = NewHabit

type FreqMode = 'daily' | 'custom'

const DAY_ORDER: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

interface HabitFormProps {
  initialHabit?: Habit   // present when editing
  onSubmit:  (data: HabitFormData) => Promise<void>
  onArchive?: () => Promise<void>
  onClose:   () => void
}

export function HabitForm({ initialHabit, onSubmit, onArchive, onClose }: HabitFormProps) {
  const isEdit = Boolean(initialHabit)

  const [name,        setName]        = useState(initialHabit?.name ?? '')
  const [type,        setType]        = useState<HabitType>(initialHabit?.type ?? 'boolean')
  const [targetRaw,   setTargetRaw]   = useState<string>(() => {
    if (!initialHabit?.target_value) return ''
    if (initialHabit.type === 'timer') return String(Math.round(initialHabit.target_value / 60))
    return String(initialHabit.target_value)
  })
  const [freqMode,    setFreqMode]    = useState<FreqMode>(() => {
    if (!initialHabit || initialHabit.frequency === 'daily') return 'daily'
    return 'custom'
  })
  const [customDays,  setCustomDays]  = useState<DayOfWeek[]>(() => {
    if (initialHabit && initialHabit.frequency !== 'daily') {
      return (initialHabit.frequency as { days: DayOfWeek[] }).days
    }
    return []
  })

  const [submitting,  setSubmitting]  = useState(false)
  const [archiving,   setArchiving]   = useState(false)
  const [formError,   setFormError]   = useState<string | null>(null)

  function toggleDay(day: DayOfWeek) {
    setCustomDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day],
    )
  }

  function buildFrequency(): HabitFrequency {
    if (freqMode === 'daily') return 'daily'
    return { days: DAY_ORDER.filter(d => customDays.includes(d)) }
  }

  function buildTargetValue(): number | null {
    if (type === 'boolean') return null
    const n = parseInt(targetRaw, 10)
    if (isNaN(n) || n <= 0) return null
    // Timer input is in minutes; stored in seconds
    return type === 'timer' ? n * 60 : n
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (freqMode === 'custom' && customDays.length === 0) {
      setFormError('Pick at least one day.')
      return
    }
    setFormError(null)
    setSubmitting(true)
    try {
      await onSubmit({
        name:         trimmed,
        type,
        target_value: buildTargetValue(),
        frequency:    buildFrequency(),
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

  const showTarget = type !== 'boolean'
  const targetLabel = type === 'timer' ? 'Target (minutes)' : 'Target (reps)'
  const targetPlaceholder = type === 'timer' ? '30' : '8'

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-40"
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#141414] rounded-t-3xl px-5 pt-4 pb-safe-bottom"
      >
        <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-5" />
        <h2 className="font-heading text-base font-semibold text-white mb-5">
          {isEdit ? 'Edit habit' : 'New habit'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Habit name"
            className="w-full bg-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm font-body focus:outline-none focus:ring-1 focus:ring-teal/40"
            autoFocus
          />

          {/* Type */}
          <div>
            <label className="block text-xs text-white/40 font-body mb-2">Type</label>
            <div className="flex gap-2">
              {(['boolean', 'count', 'timer'] as HabitType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-body transition-all active:scale-95 capitalize ${
                    type === t ? 'bg-teal text-background' : 'bg-white/8 text-white/50'
                  }`}
                >
                  {t === 'boolean' ? 'Check' : t}
                </button>
              ))}
            </div>
          </div>

          {/* Target (count / timer only) */}
          {showTarget && (
            <div>
              <label className="block text-xs text-white/40 font-body mb-1.5">{targetLabel}</label>
              <input
                type="number"
                min="1"
                value={targetRaw}
                onChange={e => setTargetRaw(e.target.value)}
                placeholder={targetPlaceholder}
                className="w-full bg-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm font-body focus:outline-none focus:ring-1 focus:ring-teal/40"
              />
            </div>
          )}

          {/* Frequency */}
          <div>
            <label className="block text-xs text-white/40 font-body mb-2">Schedule</label>
            <div className="flex gap-2 mb-3">
              {(['daily', 'custom'] as FreqMode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFreqMode(m)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-body transition-all active:scale-95 capitalize ${
                    freqMode === m ? 'bg-teal text-background' : 'bg-white/8 text-white/50'
                  }`}
                >
                  {m === 'daily' ? 'Every day' : 'Custom days'}
                </button>
              ))}
            </div>

            {freqMode === 'custom' && (
              <div className="flex gap-2">
                {DAY_ORDER.map((day, i) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`flex-1 py-2 rounded-lg text-xs font-body transition-all active:scale-90 ${
                      customDays.includes(day)
                        ? 'bg-teal text-background'
                        : 'bg-white/8 text-white/40'
                    }`}
                  >
                    {/* Fri/Sat share "F"/"S" labels — use index position for uniqueness */}
                    {['M','T','W','T','F','S','S'][i]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {formError && (
            <p className="text-xs text-red-400 font-body">{formError}</p>
          )}

          <div className="flex gap-3 pt-2 pb-2">
            {isEdit && onArchive && (
              <button
                type="button"
                onClick={handleArchive}
                disabled={archiving}
                className="px-4 py-3.5 rounded-2xl bg-red-500/10 text-red-400 text-sm font-body disabled:opacity-40 active:bg-red-500/20 transition-colors"
              >
                {archiving ? 'Archiving…' : 'Archive'}
              </button>
            )}
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="flex-1 py-3.5 bg-teal text-background rounded-2xl text-sm font-body font-medium disabled:opacity-40 transition-opacity active:scale-[0.98]"
            >
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add habit'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  )
}
