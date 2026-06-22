import type { TimeCategorySummary } from '@/types'
import { TRACKING_CATEGORY_CONFIG }  from '@/lib/tracking-categories'

interface WeeklyTimeSummaryProps {
  summaries: TimeCategorySummary[]
}

/**
 * Category breakdown for the current calendar week — shown in the Growth tab.
 * Header copy follows the Warm preset: observational, not judgmental.
 * Social media appears at the same visual weight as any other category.
 * See privacy-and-friend-safety.md: time entries are private; friends never see this.
 */
export function WeeklyTimeSummary({ summaries }: WeeklyTimeSummaryProps) {
  if (summaries.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="text-xs font-body text-white/40 uppercase tracking-widest mb-3">
          Where Your Time Went This Week
        </h2>
        <div className="bg-white/[0.03] rounded-2xl p-5 text-center">
          <p className="text-sm font-body text-white/45 leading-relaxed">
            No time logged this week yet. Start a timer from Today to see your breakdown here.
          </p>
        </div>
      </section>
    )
  }

  const totalSeconds = summaries.reduce((sum, r) => sum + r.total_seconds, 0)

  return (
    <section className="mt-8">
      <h2 className="text-xs font-body text-white/40 uppercase tracking-widest mb-4">
        Where Your Time Went This Week
      </h2>

      <div className="space-y-3">
        {summaries.map(({ category, total_seconds }) => {
          const cfg   = TRACKING_CATEGORY_CONFIG[category]
          const hours = Math.floor(total_seconds / 3600)
          const mins  = Math.floor((total_seconds % 3600) / 60)
          const label = hours > 0
            ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}`
            : `${mins}m`
          const pct   = totalSeconds > 0
            ? Math.round((total_seconds / totalSeconds) * 100)
            : 0

          return (
            <div key={category} className="flex items-center gap-3">
              <p className="text-xs font-body text-white/55 w-24 shrink-0">{cfg.label}</p>
              <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal/50 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs font-body text-white/40 w-10 text-right tabular-nums shrink-0">
                {label}
              </p>
            </div>
          )
        })}

        <p className="text-[10px] font-body text-white/20 text-right mt-1">
          {Math.floor(totalSeconds / 3600)}h {Math.floor((totalSeconds % 3600) / 60)}m total
        </p>
      </div>
    </section>
  )
}
