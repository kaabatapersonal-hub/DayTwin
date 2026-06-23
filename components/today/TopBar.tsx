import { formatDateDisplay } from '@/lib/format'
import { ScoreRing }         from './ScoreRing'
import { SparksBadge }       from './SparksBadge'

interface TopBarProps {
  date:           string  // ISO "YYYY-MM-DD"
  scorePct:       number  // 0–100; drives the compact ring on the right
  onHardDay:      () => void
  userId:         string
  sparksBalance:  number
}

/**
 * Today screen top bar.
 * Left:  DayTwin wordmark + date.
 * Right: Sparks balance | compact score ring (32px) | heart button.
 *
 * The heart button is always visible and easy to reach — this is intentional.
 * On a hard day, someone shouldn't have to hunt for the way in.
 */
export function TopBar({ date, scorePct, onHardDay, userId, sparksBalance }: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-5 pt-safe-top pb-4">
      <div>
        <h1 className="font-heading text-xl font-bold text-white tracking-tight">
          Day<span className="text-teal">Twin</span>
        </h1>
        <p className="text-xs text-white/40 font-body mt-0.5">
          {formatDateDisplay(date)}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <SparksBadge initialBalance={sparksBalance} userId={userId} />

        {/* Compact score ring — always visible, updated reactively */}
        <ScoreRing pct={scorePct} size={32} compact />

        {/* Hard Day button — heart, always in the top-right, easy to reach */}
        <button
          onClick={onHardDay}
          className="w-9 h-9 flex items-center justify-center text-white/40 active:text-white/80 transition-colors"
          aria-label="Hard day — open support screen"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
    </header>
  )
}
