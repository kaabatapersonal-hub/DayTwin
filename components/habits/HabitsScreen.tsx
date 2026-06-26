'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { HabitCard }        from './HabitCard'
import { HabitForm, type HabitFormData } from './HabitForm'
import { HabitsEmptyState } from './HabitsEmptyState'
import { useHabits }        from '@/hooks/useHabits'
import type { HabitWithStreak } from '@/types'

interface HabitsScreenProps {
  initialHabits: HabitWithStreak[]
}

/**
 * Root client component for the Habits tab.
 *
 * The consistency ring (% of last 30 days completed) leads the visual hierarchy
 * because it's emotionally more accurate than a streak: missing one day in a month
 * shows 97% rather than "0 streak," keeping motivation intact.
 */
export function HabitsScreen({ initialHabits }: HabitsScreenProps) {
  const { habits, add, update, archive, error } = useHabits(initialHabits)
  const [editTarget,  setEditTarget]  = useState<HabitWithStreak | null>(null)
  const [showAdd,     setShowAdd]     = useState(false)
  const [prefillName, setPrefillName] = useState<string | undefined>()

  async function handleAdd(data: HabitFormData) {
    await add(data)
    setShowAdd(false)
  }

  function handleSuggestion(name: string) {
    setPrefillName(name)
    setShowAdd(true)
  }

  async function handleUpdate(data: HabitFormData) {
    if (!editTarget) return
    await update(editTarget.habit.id, data)
    setEditTarget(null)
  }

  async function handleArchive() {
    if (!editTarget) return
    await archive(editTarget.habit.id)
    setEditTarget(null)
  }

  const closeForm = () => { setShowAdd(false); setEditTarget(null); setPrefillName(undefined) }
  const formOpen  = showAdd || Boolean(editTarget)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="page-header px-4 pt-safe-top pb-3 flex items-center justify-between">
        <span className="font-heading text-lg font-semibold text-white">Habits</span>
        <button
          onClick={() => setShowAdd(true)}
          className="w-8 h-8 rounded-xl bg-teal flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Add habit"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#080808" strokeWidth="2.2" strokeLinecap="round">
            <line x1="8" y1="3" x2="8" y2="13"/>
            <line x1="3" y1="8" x2="13" y2="8"/>
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-4 pb-24">
        {error && (
          <div className="mb-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400 font-body">{error}</p>
          </div>
        )}

        {!habits.length ? (
          <HabitsEmptyState onAdd={() => setShowAdd(true)} onAddWithSuggestion={handleSuggestion} />
        ) : (
          <div className="space-y-3 mt-2">
            {habits.map(item => (
              <HabitCard
                key={item.habit.id}
                item={item}
                onEdit={setEditTarget}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form sheet */}
      <AnimatePresence>
        {formOpen && (
          <HabitForm
            initialHabit={editTarget?.habit}
            prefillName={editTarget ? undefined : prefillName}
            onSubmit={editTarget ? handleUpdate : handleAdd}
            onArchive={editTarget ? handleArchive : undefined}
            onClose={closeForm}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
