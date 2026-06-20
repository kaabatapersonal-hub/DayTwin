import { formatDateDisplay } from '@/lib/format'

interface TopBarProps {
  date: string // ISO date "YYYY-MM-DD"
}

/**
 * Top bar for the Today screen.
 * Session 2: wordmark + date only.
 * Space is reserved for the streak badge (Session 5) and Sparks balance (Session 11).
 */
export function TopBar({ date }: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-5 pt-8 pb-4">
      <div>
        <h1 className="font-heading text-xl font-bold text-white tracking-tight">
          Day<span className="text-teal">Twin</span>
        </h1>
        <p className="text-xs text-white/40 font-body mt-0.5">
          {formatDateDisplay(date)}
        </p>
      </div>
      {/* Streak badge and Sparks balance go here in Sessions 5 and 11 */}
    </header>
  )
}
