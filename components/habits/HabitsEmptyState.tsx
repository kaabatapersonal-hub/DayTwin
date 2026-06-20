'use client'

interface HabitsEmptyStateProps {
  onAdd: () => void
}

export function HabitsEmptyState({ onAdd }: HabitsEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-16">
      <div className="w-14 h-14 rounded-2xl bg-teal/10 flex items-center justify-center mb-5">
        {/* checkmark loop icon */}
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
      </div>
      <h2 className="font-heading text-lg text-white mb-2">
        No habits yet
      </h2>
      <p className="text-sm text-white/45 font-body leading-relaxed mb-8 max-w-xs">
        Habits are the small daily actions that compound into who you&apos;re becoming.
        Start with one thing you want to show up for every day.
      </p>
      <button
        onClick={onAdd}
        className="px-6 py-3 rounded-2xl bg-teal text-background text-sm font-body font-medium active:scale-95 transition-transform"
      >
        Add your first habit
      </button>
    </div>
  )
}
