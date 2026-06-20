'use client'

import { motion } from 'framer-motion'
import type { HabitWithStreak } from '@/types'

const TYPE_LABEL: Record<string, string> = {
  boolean: 'Daily check',
  count:   'Count',
  timer:   'Timer',
}

interface HabitCardProps {
  item:   HabitWithStreak
  onEdit: (item: HabitWithStreak) => void
}

export function HabitCard({ item, onEdit }: HabitCardProps) {
  const { habit, streak } = item
  const pct   = streak.consistency_30d_pct
  const days  = streak.current_streak
  const label = habit.target_value !== null
    ? habit.type === 'timer'
      ? `${Math.round(habit.target_value / 60)} min`
      : `${habit.target_value}×`
    : undefined

  return (
    <motion.div
      layout
      className="bg-white/5 rounded-2xl px-4 py-4 flex items-center gap-4"
    >
      {/* Consistency ring */}
      <ConsistencyRing pct={pct} />

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-body truncate">{habit.name}</p>
        <p className="text-white/35 text-xs font-body mt-0.5">
          {TYPE_LABEL[habit.type]}{label ? ` · ${label}` : ''}&nbsp;·&nbsp;
          {days > 0 ? `${days} day streak` : 'No streak yet'}
        </p>
      </div>

      {/* Edit button */}
      <button
        onClick={() => onEdit(item)}
        className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white/60 transition-colors active:scale-90"
        aria-label={`Edit ${habit.name}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </motion.div>
  )
}

/** SVG ring showing the 30-day consistency percentage. */
function ConsistencyRing({ pct }: { pct: number }) {
  const size   = 48
  const stroke = 4
  const r      = (size - stroke) / 2
  const circ   = 2 * Math.PI * r
  const dash   = (pct / 100) * circ

  const color  =
    pct >= 80 ? '#2DD4BF' :
    pct >= 50 ? '#D9A653' :
                '#8B8B85'

  return (
    <div className="relative flex-shrink-0 w-12 h-12 flex items-center justify-center">
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.4s ease' }}
        />
      </svg>
      <span className="relative text-xs font-body font-medium" style={{ color }}>
        {pct}%
      </span>
    </div>
  )
}
