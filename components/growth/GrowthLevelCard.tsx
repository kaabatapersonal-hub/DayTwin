import { growthLevelInfo } from '@/lib/sparks'

interface GrowthLevelCardProps {
  sparksLifetime: number
}

export function GrowthLevelCard({ sparksLifetime }: GrowthLevelCardProps) {
  const info = growthLevelInfo(sparksLifetime)

  return (
    <div className="bg-white/[0.04] rounded-3xl p-5">
      <p className="text-xs font-body text-white/40 uppercase tracking-widest mb-4">
        Growth Level
      </p>

      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-heading font-bold text-white tabular-nums">
              {info.level}
            </span>
            <span className="text-base font-body text-white/50">{info.label}</span>
          </div>
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-gold text-xs leading-none">⚡</span>
            <span className="text-xs font-body text-white/35 tabular-nums">
              {sparksLifetime.toLocaleString()} lifetime Sparks
            </span>
          </div>
        </div>

        {info.nextThreshold !== null && (
          <div className="text-right">
            <p className="text-xs font-body text-white/25">Next</p>
            <p className="text-sm font-body text-white/45 tabular-nums">
              {info.nextThreshold.toLocaleString()} ⚡
            </p>
          </div>
        )}
      </div>

      {/* Progress bar to next level */}
      <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-teal to-teal/60 rounded-full transition-all duration-700"
          style={{ width: `${info.progress}%` }}
        />
      </div>

      {info.level < 10 ? (
        <p className="text-xs font-body text-white/25 mt-1.5">
          {info.progress}% to Level {info.level + 1} — {GROWTH_LEVEL_LABELS[info.level + 1]}
        </p>
      ) : (
        <p className="text-xs font-body text-gold/60 mt-1.5">Max level reached</p>
      )}
    </div>
  )
}

const GROWTH_LEVEL_LABELS: Record<number, string> = {
  2:  'Building',
  3:  'Consistent',
  4:  'Focused',
  5:  'Disciplined',
  6:  'Driven',
  7:  'Momentum',
  8:  'Elite',
  9:  'Legendary',
  10: 'DayTwin',
}
