import type { UserBadge } from '@/types'

interface BadgesListProps {
  badges: UserBadge[]
}

const RARITY_COLOR: Record<string, string> = {
  common:    'text-teal/70',
  rare:      'text-gold/70',
  legendary: 'text-[#C084FC]/70',
}

/**
 * Achievements section in the Growth tab.
 * Shows earned badges as small icon + name cards.
 *
 * Empty state uses a quiet, non-pressuring message — no streak guilting,
 * no "almost there" framing that might feel like push.
 */
export function BadgesList({ badges }: BadgesListProps) {
  return (
    <div className="bg-white/[0.03] rounded-3xl p-5">
      <p className="text-xs font-body text-white/40 uppercase tracking-widest mb-4">
        Achievements
      </p>

      {badges.length === 0 ? (
        <p className="text-sm font-body text-white/25 text-center py-4">
          Badges appear here as you build momentum.
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {badges.map(ub => (
            <BadgePill key={ub.badge_id} badge={ub} />
          ))}
        </div>
      )}
    </div>
  )
}

function BadgePill({ badge: ub }: { badge: UserBadge }) {
  const { badge: b } = ub
  const color = RARITY_COLOR[b.rarity] ?? 'text-white/40'

  return (
    <div
      className="flex items-center gap-2 bg-white/[0.05] rounded-full px-3 py-1.5"
      title={b.description}
    >
      <span className="text-base">{b.icon}</span>
      <span className={`text-xs font-body font-medium ${color}`}>{b.name}</span>
    </div>
  )
}
