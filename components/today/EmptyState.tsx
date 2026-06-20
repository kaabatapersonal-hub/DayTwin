interface EmptyStateProps {
  onAddTimeBlock: () => void
  onAddQuick:     () => void
}

/**
 * Shown when a user has zero tasks for the day.
 * This is the "aha moment" from the onboarding design — the copy should feel
 * like a friend nudging them to get started, not a generic placeholder.
 * Warm tone per voice-and-tone-guide.md.
 */
export function EmptyState({ onAddTimeBlock, onAddQuick }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center py-24">
      <p className="font-heading text-2xl font-semibold text-white mb-3">
        Your day is wide open.
      </p>
      <p className="text-sm text-white/40 font-body mb-10 max-w-xs leading-relaxed">
        Start with one thing — a time block for focused work, or a quick task
        you want to get done today.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onAddTimeBlock}
          className="w-full py-4 rounded-2xl border border-teal/30 bg-teal/10 text-teal text-sm font-body font-medium active:bg-teal/20 transition-colors"
        >
          Add a time block
        </button>
        <button
          onClick={onAddQuick}
          className="w-full py-4 rounded-2xl border border-white/10 bg-white/5 text-white/60 text-sm font-body active:bg-white/10 transition-colors"
        >
          Add a quick task
        </button>
      </div>
    </div>
  )
}
