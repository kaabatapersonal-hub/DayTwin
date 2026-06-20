'use client'

import { formatDuration } from '@/lib/format'

interface HabitCheckRowProps {
  habitId:      string
  name:         string
  type:         'boolean' | 'count' | 'timer'
  targetValue:  number | null
  currentValue: number    // for count: logged count; for timer: elapsed seconds
  completed:    boolean
  timerRunning: boolean
  onToggleBoolean:  () => void
  onIncrementCount: () => void
  onStartTimer:     () => void
  onStopTimer:      () => void
}

export function HabitCheckRow({
  name, type, targetValue, currentValue, completed,
  timerRunning, onToggleBoolean, onIncrementCount, onStartTimer, onStopTimer,
}: HabitCheckRowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      {/* Name */}
      <span
        className={`flex-1 text-sm font-body truncate transition-colors ${
          completed ? 'text-white/40 line-through' : 'text-white'
        }`}
      >
        {name}
      </span>

      {/* Type-specific control */}
      {type === 'boolean' && (
        <BooleanToggle completed={completed} onToggle={onToggleBoolean} />
      )}
      {type === 'count' && (
        <CountControl
          current={currentValue}
          target={targetValue}
          completed={completed}
          onIncrement={onIncrementCount}
        />
      )}
      {type === 'timer' && (
        <TimerControl
          elapsedSeconds={currentValue}
          targetSeconds={targetValue}
          running={timerRunning}
          completed={completed}
          onStart={onStartTimer}
          onStop={onStopTimer}
        />
      )}
    </div>
  )
}

// ── Sub-controls ──────────────────────────────────────────────────────────────

function BooleanToggle({ completed, onToggle }: { completed: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
        completed
          ? 'border-teal bg-teal'
          : 'border-white/25 bg-transparent'
      }`}
      aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
    >
      {completed && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="#080808" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  )
}

function CountControl({
  current, target, completed, onIncrement,
}: {
  current: number; target: number | null; completed: boolean; onIncrement: () => void
}) {
  const label = target !== null ? `${current}/${target}` : `${current}`
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <span className={`text-xs font-body tabular-nums ${completed ? 'text-teal' : 'text-white/50'}`}>
        {label}
      </span>
      {!completed && (
        <button
          onClick={onIncrement}
          className="w-7 h-7 rounded-lg bg-white/10 text-white/70 flex items-center justify-center text-base leading-none active:scale-90 transition-transform"
          aria-label="Add one"
        >
          +
        </button>
      )}
      {completed && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" fill="#2DD4BF"/>
          <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="#080808" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  )
}

function TimerControl({
  elapsedSeconds, targetSeconds, running, completed, onStart, onStop,
}: {
  elapsedSeconds: number; targetSeconds: number | null
  running: boolean; completed: boolean
  onStart: () => void; onStop: () => void
}) {
  const elapsed = formatDuration(elapsedSeconds)
  const target  = targetSeconds !== null ? formatDuration(targetSeconds) : null

  if (completed) {
    return (
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-xs font-body text-teal tabular-nums">{elapsed}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" fill="#2DD4BF"/>
          <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="#080808" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <span className="text-xs font-body tabular-nums text-white/50">
        {elapsed}{target ? ` / ${target}` : ''}
      </span>
      <button
        onClick={running ? onStop : onStart}
        className={`px-3 py-1 rounded-lg text-xs font-body font-medium transition-all active:scale-90 ${
          running
            ? 'bg-teal/20 text-teal'
            : 'bg-white/10 text-white/70'
        }`}
      >
        {running ? 'Stop' : 'Start'}
      </button>
    </div>
  )
}
