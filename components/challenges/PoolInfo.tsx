import type { Challenge } from '@/types'

interface PoolInfoProps {
  challenge: Challenge
}

/**
 * Displays challenge pool info when entry_cost_sparks > 0.
 * No Sparks deduction or payout logic is wired this session (Session 11).
 * Shows a clear "coming soon" label so users understand rewards aren't active yet.
 */
export function PoolInfo({ challenge }: PoolInfoProps) {
  if (challenge.entry_cost_sparks === 0) return null

  return (
    <div className="bg-gold/[0.06] border border-gold/20 rounded-2xl px-4 py-3.5 flex items-center justify-between">
      <div>
        <p className="text-xs font-body text-gold/70 uppercase tracking-widest mb-0.5">Sparks Pool</p>
        <p className="text-lg font-heading font-bold text-gold tabular-nums">
          {challenge.pool_total_sparks} ⚡
        </p>
        <p className="text-[11px] font-body text-white/30 mt-0.5">
          {challenge.entry_cost_sparks} ⚡ entry · rewards activate in a future update
        </p>
      </div>
      <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D9A653"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      </div>
    </div>
  )
}
