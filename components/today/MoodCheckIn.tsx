'use client'

import { useState, useEffect } from 'react'
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
      <div className="flex items-center gap-2 px-1 mb-4">
        <span className="text-sm">✓</span>
        <p className="text-xs font-body text-white/30">{MOOD_CONFIRMATION}</p>
      </div>
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
    <div className="bg-white/[0.03] rounded-2xl px-4 py-4 mb-4">
      <p className="text-xs font-body text-white/40 mb-3">{MOOD_PROMPTS[period]}</p>

      {/* Mood row: 5 emoji buttons */}
      <div className="flex justify-between mb-4">
        {MOOD_EMOJI.map((emoji, i) => {
          const value = i + 1
          const selected = selectedMood === value
          return (
            <button
              key={value}
              onClick={() => setSelectedMood(value)}
              className={`text-2xl transition-all active:scale-95 ${
                selected ? 'scale-110 opacity-100' : 'opacity-50'
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
        <div className="mb-4">
          <p className="text-xs font-body text-white/30 mb-2">Energy level?</p>
          <div className="flex justify-between">
            {['⚡️', '⚡️', '⚡️', '⚡️', '⚡️'].map((_, i) => {
              const value = i + 1
              return (
                <button
                  key={value}
                  onClick={() => setEnergy(prev => prev === value ? null : value)}
                  className={`text-lg transition-all active:scale-95 ${
                    energy !== null && energy >= value ? 'opacity-100' : 'opacity-20'
                  }`}
                  aria-label={`Energy ${value}`}
                >
                  ⚡
                </button>
              )
            })}
          </div>
        </div>
      )}

      {selectedMood !== null && (
        <button
          onClick={handleLog}
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-teal/20 text-teal text-sm font-body disabled:opacity-40 active:scale-[0.98]"
        >
          {saving ? 'Saving…' : 'Log check-in'}
        </button>
      )}
    </div>
  )
}
