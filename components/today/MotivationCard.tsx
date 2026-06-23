'use client'

import type { MotivationCard as MotivationCardType } from '@/types'

interface MotivationCardProps {
  card: MotivationCardType
}

export function MotivationCard({ card }: MotivationCardProps) {
  return (
    <div className="mx-4 mb-4 bg-white/[0.04] border border-white/[0.06] rounded-2xl px-5 py-4">
      <p className="text-[10px] font-body text-teal/60 uppercase tracking-widest mb-2">
        Today&apos;s spark
      </p>
      <p className="text-sm font-heading font-semibold text-white leading-snug mb-1">
        {card.title}
      </p>
      <p className="text-sm font-body text-white/50 leading-relaxed">
        {card.body}
      </p>
    </div>
  )
}
