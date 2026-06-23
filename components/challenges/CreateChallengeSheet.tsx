'use client'

import { useState, useEffect } from 'react'
import { useRouter }                    from 'next/navigation'
import type { ChallengeType }           from '@/types'

interface Habit {
  id:   string
  name: string
}

interface CreateChallengeSheetProps {
  friendId:   string
  friendName: string
  onClose:    () => void
}

const TYPES: { type: ChallengeType; label: string; description: string; color: string }[] = [
  {
    type:        'score_battle',
    label:       'Score Battle',
    description: 'Compete on average daily score over a set number of days.',
    color:       '#2DD4BF',
  },
  {
    type:        'habit_pact',
    label:       'Habit Pact',
    description: 'Both commit to a habit — if either misses with no grace left, the pact breaks.',
    color:       '#D9A653',
  },
  {
    type:        'friends_feed',
    label:       'Friends Feed',
    description: 'No competition — just see each other\'s daily scores side by side.',
    color:       '#8B7AD1',
  },
]

const DURATION_OPTIONS = [7, 14, 21, 30]

export function CreateChallengeSheet({
  friendId, friendName, onClose,
}: CreateChallengeSheetProps) {
  const router = useRouter()

  const [step,          setStep]          = useState<1 | 2 | 3>(1)
  const [selectedType,  setSelectedType]  = useState<ChallengeType | null>(null)
  const [duration,      setDuration]      = useState(14)
  const [habitId,       setHabitId]       = useState<string | null>(null)
  const [habits,        setHabits]        = useState<Habit[]>([])
  const [habitsLoading, setHabitsLoading] = useState(false)
  const [submitting,    setSubmitting]    = useState(false)

  // Load habits when habit_pact is selected
  useEffect(() => {
    if (selectedType !== 'habit_pact') return
    setHabitsLoading(true)
    fetch('/api/habits')
      .then(r => r.json())
      .then((data: Habit[] | { habits?: Habit[] }) => {
        const list = Array.isArray(data) ? data : (data.habits ?? [])
        setHabits(list)
        if (list.length > 0 && !habitId) setHabitId(list[0].id)
      })
      .finally(() => setHabitsLoading(false))
  }, [selectedType]) // eslint-disable-line react-hooks/exhaustive-deps

  function advanceToStep2() {
    if (!selectedType) return
    setStep(2)
  }

  function advanceToStep3() {
    if (selectedType === 'habit_pact' && !habitId) return
    setStep(3)
  }

  async function handleCreate() {
    if (!selectedType) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/challenges/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type:               selectedType,
          invitee_id:         friendId,
          duration_days:      selectedType === 'friends_feed' ? null : duration,
          habit_id:           selectedType === 'habit_pact' ? habitId : null,
          entry_cost_sparks:  0,
        }),
      })
      if (!res.ok) {
        setSubmitting(false)
        return
      }
      const { challenge_id } = await res.json()
      onClose()
      router.push(`/friends/challenges/${challenge_id}`)
    } catch {
      setSubmitting(false)
    }
  }

  const selectedTypeMeta = TYPES.find(t => t.type === selectedType)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0F0F0F] rounded-t-3xl px-5 pb-10 pt-5 max-h-[85vh] overflow-y-auto">
        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-5">
          {[1, 2, 3].map(n => (
            <div
              key={n}
              className={`h-0.5 flex-1 rounded-full transition-colors ${
                n <= step ? 'bg-teal' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Pick type */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-heading font-bold text-white">
              Challenge {friendName}
            </h2>
            <p className="text-sm font-body text-white/40">Choose a challenge type</p>
            <div className="space-y-3">
              {TYPES.map(t => (
                <button
                  key={t.type}
                  onClick={() => setSelectedType(t.type)}
                  className={`w-full text-left px-4 py-4 rounded-2xl border transition-colors ${
                    selectedType === t.type
                      ? 'border-teal bg-teal/[0.06]'
                      : 'border-white/[0.07] bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-body font-medium uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${t.color}18`, color: t.color }}
                    >
                      {t.label}
                    </span>
                  </div>
                  <p className="text-xs font-body text-white/40">{t.description}</p>
                </button>
              ))}
            </div>
            <button
              onClick={advanceToStep2}
              disabled={!selectedType}
              className="w-full py-3.5 rounded-2xl bg-teal text-[#080808] font-body font-semibold text-sm disabled:opacity-30 active:scale-[0.98] transition-transform"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 2: Type-specific options */}
        {step === 2 && selectedType && (
          <div className="space-y-4">
            <button
              onClick={() => setStep(1)}
              className="text-xs font-body text-white/35 flex items-center gap-1"
            >
              ← Back
            </button>
            <h2 className="text-lg font-heading font-bold text-white">
              {selectedTypeMeta?.label}
            </h2>

            {/* Duration picker — score_battle and habit_pact */}
            {(selectedType === 'score_battle' || selectedType === 'habit_pact') && (
              <div>
                <p className="text-xs font-body text-white/40 mb-3">Duration</p>
                <div className="flex gap-2 flex-wrap">
                  {DURATION_OPTIONS.map(d => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`px-4 py-2 rounded-full font-body text-sm transition-colors ${
                        duration === d
                          ? 'bg-teal text-[#080808] font-semibold'
                          : 'bg-white/[0.06] text-white/50'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Habit picker — habit_pact only */}
            {selectedType === 'habit_pact' && (
              <div>
                <p className="text-xs font-body text-white/40 mb-3">Which habit?</p>
                {habitsLoading ? (
                  <p className="text-sm font-body text-white/30">Loading habits…</p>
                ) : habits.length === 0 ? (
                  <p className="text-sm font-body text-white/30">No habits found. Add one in the Habits tab first.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {habits.map(h => (
                      <button
                        key={h.id}
                        onClick={() => setHabitId(h.id)}
                        className={`w-full text-left px-4 py-3 rounded-2xl border text-sm font-body transition-colors ${
                          habitId === h.id
                            ? 'border-gold bg-gold/[0.06] text-gold'
                            : 'border-white/[0.07] bg-white/[0.03] text-white/60'
                        }`}
                      >
                        {h.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Friends feed has no extra options */}
            {selectedType === 'friends_feed' && (
              <p className="text-sm font-body text-white/40">
                No configuration needed — share scores with {friendName} indefinitely. Either of you can end it at any time.
              </p>
            )}

            <button
              onClick={advanceToStep3}
              disabled={selectedType === 'habit_pact' && (!habitId || habitsLoading)}
              className="w-full py-3.5 rounded-2xl bg-teal text-[#080808] font-body font-semibold text-sm disabled:opacity-30 active:scale-[0.98] transition-transform"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && selectedType && (
          <div className="space-y-5">
            <button
              onClick={() => setStep(2)}
              className="text-xs font-body text-white/35 flex items-center gap-1"
            >
              ← Back
            </button>
            <h2 className="text-lg font-heading font-bold text-white">Confirm challenge</h2>

            <div className="bg-white/[0.04] rounded-2xl px-4 py-4 space-y-3">
              <Row label="Challenger" value={friendName} />
              <Row label="Type"       value={selectedTypeMeta?.label ?? selectedType} />
              {selectedType !== 'friends_feed' && (
                <Row label="Duration" value={`${duration} days`} />
              )}
              {selectedType === 'habit_pact' && habitId && (
                <Row
                  label="Habit"
                  value={habits.find(h => h.id === habitId)?.name ?? habitId}
                />
              )}
              <Row label="Entry"  value="0 ⚡ (free)" />
            </div>

            <p className="text-xs font-body text-white/30 text-center">
              {friendName} will see the invite and can accept or decline.
            </p>

            <button
              onClick={handleCreate}
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-teal text-[#080808] font-body font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              {submitting ? 'Sending…' : 'Send challenge'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-body text-white/40">{label}</span>
      <span className="text-sm font-body font-medium text-white">{value}</span>
    </div>
  )
}
