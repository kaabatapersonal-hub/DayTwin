'use client'

import { HabitCheckRow } from './HabitCheckRow'
import type { TodayHabit } from '@/types'

interface TodayHabitDisplay extends TodayHabit {
  currentValue: number
  timerRunning: boolean
}

interface TodayHabitsProps {
  habits:         TodayHabitDisplay[]
  onToggleBoolean:  (habitId: string) => void
  onIncrementCount: (habitId: string) => void
  onStartTimer:     (habitId: string) => void
  onStopTimer:      (habitId: string) => void
}

/**
 * Today's habits section — rendered inside TodayScreen below the task list.
 * Receives already-enriched display items from useTodayHabits.
 */
export function TodayHabits({
  habits, onToggleBoolean, onIncrementCount, onStartTimer, onStopTimer,
}: TodayHabitsProps) {
  if (!habits.length) return null

  const doneCount  = habits.filter(h => h.log?.completed).length
  const totalCount = habits.length

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xs font-body text-white/40 uppercase tracking-widest">
          Habits
        </h2>
        <span className="text-xs font-body text-white/25">
          {doneCount}/{totalCount}
        </span>
      </div>

      <div className="bg-white/[0.03] rounded-2xl divide-y divide-white/[0.06]">
        {habits.map(item => (
          <div key={item.habit.id} className="px-4">
            <HabitCheckRow
              habitId={item.habit.id}
              name={item.habit.name}
              type={item.habit.type}
              targetValue={item.habit.target_value}
              currentValue={item.currentValue}
              completed={item.log?.completed ?? false}
              timerRunning={item.timerRunning}
              onToggleBoolean={() => onToggleBoolean(item.habit.id)}
              onIncrementCount={() => onIncrementCount(item.habit.id)}
              onStartTimer={() => onStartTimer(item.habit.id)}
              onStopTimer={() => onStopTimer(item.habit.id)}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
