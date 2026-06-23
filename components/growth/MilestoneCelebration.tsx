'use client'

import type { UserBadge }      from '@/types'

interface MilestoneCelebrationProps {
  badge:      UserBadge
  tone:       'warm' | 'direct' | 'hype'
  onDismiss:  () => void
}

/**
 * Copy for each badge × tone preset combination.
 * Uses the Warm preset language from the voice guide as the primary template.
 * Every message references what the user actually did — no generic platitudes.
 */
const COPY: Record<string, Record<string, string>> = {
  'ba1e0001-0000-0000-0000-000000000001': {  // One Week
    warm:   'Seven days in a row. That\'s not luck, that\'s you choosing to keep going.',
    direct: '7-day streak. Keep it going.',
    hype:   '7 days straight. You\'re unstoppable right now.',
  },
  'ba1e0002-0000-0000-0000-000000000002': {  // One Month
    warm:   'Thirty days. That\'s a habit now — not willpower, just who you are.',
    direct: '30 days. Habit locked in.',
    hype:   '30 days in a row. You\'re built different 🔥',
  },
  'ba1e0003-0000-0000-0000-000000000003': {  // First Win
    warm:   'Your first goal, complete. You said you\'d do it. You did.',
    direct: 'First goal done. On to the next.',
    hype:   'First goal DONE. You set it and you got it. Let\'s go!',
  },
}

const RARITY_COLORS: Record<string, string> = {
  common:    'text-teal',
  rare:      'text-gold',
  legendary: 'text-[#C084FC]',
}

const RARITY_BG: Record<string, string> = {
  common:    'bg-teal/[0.06] border-teal/20',
  rare:      'bg-gold/[0.06] border-gold/20',
  legendary: 'bg-[#C084FC]/[0.06] border-[#C084FC]/20',
}

/**
 * Full-screen milestone celebration overlay.
 *
 * Appears once per badge, controlled by localStorage:
 * the parent (GrowthScreen) already filtered to unseen badges before passing this in.
 * No auto-dismiss timer — the user taps the dismiss button when ready.
 *
 * Copy is personalised by tone_preference. Badge ID is used to select the right line;
 * unknown badge IDs fall back to the badge's own description field.
 */
export function MilestoneCelebration({ badge, tone, onDismiss }: MilestoneCelebrationProps) {
  const { badge: b } = badge
  const copy     = COPY[b.id]?.[tone] ?? b.description
  const rarityColor = RARITY_COLORS[b.rarity] ?? 'text-white'
  const rarityBg    = RARITY_BG[b.rarity]    ?? 'bg-white/[0.06] border-white/10'

  return (
    <div className="fixed inset-0 z-[60] bg-[#080808] flex flex-col items-center justify-center px-8">
      {/* Badge icon — large, centred, same visual weight as the Hard Day screen */}
      <div
        className={`w-28 h-28 rounded-full border flex items-center justify-center mb-8 ${rarityBg}`}
      >
        <span className="text-6xl">{b.icon}</span>
      </div>

      {/* Rarity label */}
      <p className={`text-xs font-body uppercase tracking-widest mb-2 ${rarityColor}`}>
        {b.rarity}
      </p>

      {/* Badge name */}
      <h1 className="font-heading text-4xl font-bold text-white text-center mb-4">
        {b.name}
      </h1>

      {/* Tone-aware celebration copy */}
      <p className="text-base font-body text-white/60 text-center leading-relaxed max-w-xs mb-2">
        {copy}
      </p>

      {/* One-line badge description */}
      <p className="text-xs font-body text-white/30 text-center mb-14">
        {b.description}
      </p>

      {/* Dismiss button — let the user sit in the moment as long as they want */}
      <button
        onClick={onDismiss}
        className="w-full max-w-xs py-4 rounded-2xl bg-white/[0.08] text-white/70 font-body font-medium text-base active:bg-white/[0.12] transition-colors"
      >
        Keep going
      </button>
    </div>
  )
}
