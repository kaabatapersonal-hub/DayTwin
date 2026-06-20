'use client'

import { AnimatePresence } from 'framer-motion'
import { TaskCard } from './TaskCard'
import type { Task } from '@/types'

interface TimelineViewProps {
  tasks:            Task[]
  onToggleComplete: (task: Task) => void
  onEdit:           (task: Task) => void
  onAdd:            () => void
}

/**
 * Displays time-blocked tasks sorted by start_time.
 * The "Add block" shortcut is always visible so the user can fill their schedule
 * without hunting for a button. The dashed placeholder appears when empty
 * to reinforce that this section can hold content.
 */
export function TimelineView({ tasks, onToggleComplete, onEdit, onAdd }: TimelineViewProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-body font-medium text-white/40 uppercase tracking-wider">
          Schedule
        </h2>
        <button
          onClick={onAdd}
          className="text-xs text-teal font-body active:opacity-60"
        >
          + Add block
        </button>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={onToggleComplete}
              onEdit={onEdit}
            />
          ))}
        </AnimatePresence>

        {tasks.length === 0 && (
          <button
            onClick={onAdd}
            className="w-full py-8 rounded-2xl border border-dashed border-white/12 text-white/25 text-sm font-body text-center active:border-white/20 transition-colors"
          >
            Tap to plan your first time block
          </button>
        )}
      </div>
    </section>
  )
}
