import Link from 'next/link'
import type { Goal } from '@/types'

interface GoalCardProps {
  goal:         Goal
  projectCount: number
}

/**
 * Tappable goal row for the Growth tab list.
 * The progress ring is the primary visual — it shows manually-set progress_pct,
 * not an auto-calculated value. Colour scale: gold for in-progress, teal for near-done.
 */
export function GoalCard({ goal, projectCount }: GoalCardProps) {
  const pct = goal.progress_pct

  const ringColor =
    pct >= 80 ? '#2DD4BF' :
    pct >= 20 ? '#D9A653' :
                'rgba(255,255,255,0.2)'

  const size   = 44
  const stroke = 3.5
  const r      = (size - stroke) / 2
  const circ   = 2 * Math.PI * r
  const dash   = (pct / 100) * circ

  const deadlineLabel = goal.deadline
    ? new Date(`${goal.deadline}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  return (
    <Link
      href={`/growth/goals/${goal.id}`}
      className="flex items-center gap-4 bg-white/5 rounded-2xl px-4 py-4 active:bg-white/10 transition-colors"
    >
      {/* Progress ring */}
      <div className="relative flex-shrink-0 w-11 h-11 flex items-center justify-center">
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={ringColor} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.4s ease' }} />
        </svg>
        <span className="relative text-[10px] font-body font-medium" style={{ color: ringColor }}>
          {pct}%
        </span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-body truncate ${goal.status === 'completed' ? 'text-white/40' : 'text-white'}`}>
          {goal.title}
        </p>
        <p className="text-xs text-white/30 font-body mt-0.5">
          {projectCount > 0 ? `${projectCount} project${projectCount !== 1 ? 's' : ''}` : 'No projects yet'}
          {deadlineLabel ? ` · ${deadlineLabel}` : ''}
        </p>
      </div>

      {/* Chevron */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 3 11 8 6 13"/>
      </svg>
    </Link>
  )
}
