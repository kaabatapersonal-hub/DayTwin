'use client'

import type { FriendView } from '@/types'
import { growthLevel } from '@/lib/format'

interface FriendListProps {
  friends:         FriendView[]
  onOpenProfile:   (friend: FriendView) => void
}

/**
 * Renders the list of accepted friends.
 * Each row shows avatar, display name, today's score, and growth level.
 * Tapping a row opens the FriendProfile overlay.
 */
export function FriendList({ friends, onOpenProfile }: FriendListProps) {
  if (!friends.length) {
    return (
      <div className="mt-6 flex flex-col items-center text-center px-6 py-10">
        <p className="text-sm font-body text-white/30 leading-relaxed">
          No friends yet. Add someone by username or share your invite link.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-1">
      {friends.map(friend => (
        <button
          key={friend.friendship_id}
          onClick={() => onOpenProfile(friend)}
          className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl active:bg-white/[0.04] transition-colors text-left"
        >
          <AvatarInitials name={friend.display_name ?? friend.username ?? '?'} userId={friend.user_id} />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-body font-medium text-white truncate">
              {friend.display_name ?? friend.username ?? 'Unknown'}
            </p>
            <p className="text-[11px] font-body text-white/35">
              @{friend.username} · Level {growthLevel(friend.sparks_lifetime)}
            </p>
          </div>

          <div className="flex flex-col items-end gap-0.5">
            {friend.today_score_pct !== null ? (
              <>
                <span className="text-lg font-heading font-bold text-teal tabular-nums leading-none">
                  {friend.today_score_pct}
                </span>
                <span className="text-[10px] font-body text-white/30">today</span>
              </>
            ) : (
              <span className="text-xs font-body text-white/20">—</span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

/**
 * Deterministic avatar circle with initials.
 * Background colour is derived from the user_id so the same person always
 * gets the same colour regardless of which device renders it.
 * Size defaults to 40px (list rows); pass size="lg" for the 80px profile hero.
 */
function AvatarInitials({
  name, userId, size = 'sm',
}: {
  name:   string
  userId: string
  size?:  'sm' | 'lg'
}) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  // Hash the first 6 chars of the UUID to pick from a small palette
  const PALETTE = ['#2DD4BF', '#D9A653', '#D08B68', '#8B7AD1', '#5B8DD9', '#D16B8B']
  const idx     = parseInt(userId.slice(0, 2), 16) % PALETTE.length
  const bg      = PALETTE[idx]

  const sizeClass = size === 'lg'
    ? 'w-20 h-20 text-2xl'
    : 'w-10 h-10 text-sm'

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0 font-heading font-bold text-background`}
      style={{ backgroundColor: bg }}
    >
      {initials}
    </div>
  )
}

// Exported for reuse in FriendProfile and FriendRequestList
export { AvatarInitials }
