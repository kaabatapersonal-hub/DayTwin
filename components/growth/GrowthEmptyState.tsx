interface GrowthEmptyStateProps {
  onAdd: () => void
}

/**
 * Empty state for the Growth tab when the user has no goals yet.
 * Warm tone: encouraging, not instructional.
 */
export function GrowthEmptyState({ onAdd }: GrowthEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-16">
      <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center mb-5">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D9A653" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </div>
      <h2 className="font-heading text-lg text-white mb-2">No goals yet</h2>
      <p className="text-sm text-white/45 font-body leading-relaxed mb-8 max-w-xs">
        A goal gives your daily work somewhere to land.
        What&apos;s the one thing you&apos;re actually building toward right now?
      </p>
      <button
        onClick={onAdd}
        className="px-6 py-3 rounded-2xl bg-gold text-background text-sm font-body font-medium active:scale-95 transition-transform"
      >
        Set your first goal
      </button>
    </div>
  )
}
