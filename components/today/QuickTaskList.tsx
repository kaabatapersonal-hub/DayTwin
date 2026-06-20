'use client'

import { AnimatePresence } from 'framer-motion'
import { TaskCard } from './TaskCard'
import type { Task } from '@/types'

interface QuickTaskListProps {
  tasks:            Task[]
  onToggleComplete: (task: Task) => void
  onEdit:           (task: Task) => void
  onAdd:            () => void
}

/**
 * Quick tasks — things that need doing today but don't have a fixed time slot.
 * Labelled "Also today" so it feels like an overflow list, not a second priority queue.
 */
export function QuickTaskList({ tasks, onToggleComplete, onEdit, onAdd }: QuickTaskListProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-body font-medium text-white/40 uppercase tracking-wider">
          Also today
        </h2>
        <button
          onClick={onAdd}
          className="text-xs text-teal font-body active:opacity-60"
        >
          + Add task
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
            className="w-full py-6 rounded-2xl border border-dashed border-white/12 text-white/25 text-sm font-body text-center active:border-white/20 transition-colors"
          >
            Anything else to get done?
          </button>
        )}
      </div>
    </section>
  )
}
