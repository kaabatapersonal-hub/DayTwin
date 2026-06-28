'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getCurrentPeriod, isPeriodLogged } from '@/lib/mood'
import { MOOD_PROMPTS, MOOD_CONFIRMATION } from '@/lib/copy'
import type { MoodLog, MoodPeriod, NewMoodLog } from '@/types'

interface MoodCheckInProps {
  moods:  MoodLog[]
  onLog:  (payload: NewMoodLog) => Promise<void>
}

const MOOD_EMOJI = ['😔', '😕', '😐', '🙂', '😄']

/**
 * Period-aware mood check-in card.
 *
 * Shows the check-in card for the current period (morning/midday/evening)
 * if that period hasn't been logged yet. After logging, shows a one-line
 * confirmation — never blocks access to the rest of the screen.
 *
 * The period is computed client-side on mount so the server can render a
 * placeholder without knowing the user's local time.
 */
export function MoodCheckIn({ moods, onLog }: MoodCheckInProps) {
  const [period,      setPeriod]      = useState<MoodPeriod | null>(null)
  const [selectedMood, setSelectedMood] = useState<number | null>(null)
  const [energy,      setEnergy]      = useState<number | null>(null)
  const [confirmed,   setConfirmed]   = useState(false)
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    setPeriod(getCurrentPeriod())
  }, [])

  // Nothing to show until we know the period
  if (!period) return null

  // Period already logged — don't show the card again
  if (isPeriodLogged(moods, period) || confirmed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 px-1 mb-4"
      >
        <span className="text-xs text-teal/60">✓</span>
        <p className="text-xs font-body text-white/30">{MOOD_CONFIRMATION}</p>
      </motion.div>
    )
  }

  async function handleLog() {
    if (selectedMood === null || !period) return
    setSaving(true)
    try {
      await onLog({ period, mood_value: selectedMood, energy_value: energy })
      setConfirmed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-2xl px-4 py-4 mb-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <p className="text-xs font-body text-white/40 mb-4">{MOOD_PROMPTS[period]}</p>

      {/* Mood row: 5 emoji buttons */}
      <div className="flex justify-between mb-4">
        {MOOD_EMOJI.map((emoji, i) => {
          const value = i + 1
          const selected = selectedMood === value
          return (
            <button
              key={value}
              onClick={() => setSelectedMood(value)}
              className={`text-3xl transition-all active:scale-90 ${
                selected ? 'scale-[1.18] opacity-100' : 'opacity-40 hover:opacity-70'
              }`}
              aria-label={`Mood ${value}`}
            >
              {emoji}
            </button>
          )
        })}
      </div>

      {/* Energy row — only shown once a mood is picked */}
      {selectedMood !== null && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 overflow-hidden"
        >
          <p className="text-xs font-body text-white/30 mb-2">Energy level?</p>
          <div className="flex justify-between">
            {[1, 2, 3, 4, 5].map(value => (
              <button
                key={value}
                onClick={() => setEnergy(prev => prev === value ? null : value)}
                className={`text-xl transition-all active:scale-90 ${
                  energy !== null && energy >= value ? 'opacity-100' : 'opacity-20'
                }`}
                aria-label={`Energy ${value}`}
              >
                ⚡
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {selectedMood !== null && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleLog}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-teal/15 border border-teal/25 text-teal text-sm font-body disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Log check-in'}
        </motion.button>
      )}
    </motion.div>
  )
}
