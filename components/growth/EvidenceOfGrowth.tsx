import type { Reflection } from '@/types'

interface EvidenceOfGrowthProps {
  reflections: Reflection[]
}

/**
 * Evidence of Growth timeline — all went_well answers shown chronologically.
 *
 * This is a read-only section in the Growth tab. It uses only reflections data
 * already fetched server-side, so no additional client-side fetches are needed.
 *
 * Design note: this screen is meant to be screenshot-worthy — each entry gets
 * its own visual weight so it reads as a genuine record of progress, not a list.
 *
 * Privacy: reflections are owner-only (RLS). This component never receives
 * or displays another user's data.
 */
export function EvidenceOfGrowth({ reflections }: EvidenceOfGrowthProps) {
  const MIN_FOR_FULL = 3  // below this, show the warm nudge instead of an empty list

  if (reflections.length < MIN_FOR_FULL) {
    return (
      <section className="mt-8">
        <h2 className="text-xs font-body text-white/40 uppercase tracking-widest mb-3">
          Evidence of Growth
        </h2>
        <div className="bg-white/[0.03] rounded-2xl p-5 text-center">
          <p className="text-sm font-body text-white/45 leading-relaxed">
            {reflections.length === 0
              ? "Your wins will appear here as you reflect each evening — start tonight."
              : `${reflections.length === 1 ? 'One entry so far' : 'Two entries so far'}. Keep reflecting each evening and you'll see your story take shape.`}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-8">
      <h2 className="text-xs font-body text-white/40 uppercase tracking-widest mb-4">
        Evidence of Growth
      </h2>

      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/[0.06]" />

        <div className="space-y-5 pl-6">
          {reflections.map((r, i) => {
            const d = new Date(`${r.date}T00:00:00`)
            const label = d.toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })
            // Day number = position in the user's reflection history (not calendar day)
            const dayNum = i + 1

            return (
              <div key={r.id} className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-6 mt-1 w-3.5 h-3.5 rounded-full border border-teal/30 bg-background flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal/50" />
                </div>

                <div>
                  <p className="text-[10px] font-body text-white/25 mb-1">
                    Day {dayNum} · {label}
                  </p>
                  <p className="text-sm font-body text-white/75 leading-snug">
                    {r.went_well}
                  </p>
                  {r.biggest_win && (
                    <p className="text-xs font-body text-gold/70 mt-1 leading-snug">
                      ✦ {r.biggest_win}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
