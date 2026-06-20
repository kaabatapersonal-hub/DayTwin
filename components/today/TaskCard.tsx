'use client'

import { motion } from 'framer-motion'
import { CATEGORY_CONFIG } from '@/lib/categories'
import { formatTime } from '@/lib/format'
import type { Task } from '@/types'

interface TaskCardProps {
  task:             Task
  onToggleComplete: (task: Task) => void
  onEdit:           (task: Task) => void
}

/**
 * Single task row — shared between the timeline and quick task list.
 * Completed tasks are dimmed and struck through but stay visible (not hidden)
 * so users can see what they've accomplished during the day.
 */
export function TaskCard({ task, onToggleComplete, onEdit }: TaskCardProps) {
  const cat       = CATEGORY_CONFIG[task.category]
  const startTime = formatTime(task.start_time)
  const endTime   = formatTime(task.end_time)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: task.completed ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/5 active:bg-white/10 transition-colors"
    >
      {/* Category color dot */}
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: cat.color }}
      />

      {/* Title + time range — tap opens the edit form */}
      <button
        className="flex-1 text-left min-w-0"
        onClick={() => onEdit(task)}
      >
        <p
          className={`text-sm font-body truncate ${
            task.completed ? 'line-through text-white/30' : 'text-white'
          }`}
        >
          {task.title}
        </p>
        {startTime && endTime && (
          <p className="text-xs text-white/30 mt-0.5 font-body">
            {startTime} – {endTime}
          </p>
        )}
      </button>

      {/* Completion toggle — filled circle with checkmark when done */}
      <button
        onClick={() => onToggleComplete(task)}
        className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 active:scale-90"
        style={{
          borderColor:     task.completed ? cat.color : 'rgba(255,255,255,0.2)',
          backgroundColor: task.completed ? cat.color : 'transparent',
        }}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.completed && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M1.5 5.5L4 8L8.5 2.5"
              stroke="#080808"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </motion.div>
  )
}
