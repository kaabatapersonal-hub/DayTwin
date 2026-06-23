/** Skeleton for the Habits tab — matches the real screen layout. */
export default function HabitsLoading() {
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col animate-pulse">
      {/* Header */}
      <div className="pt-safe-top px-5 pb-4">
        <div className="h-7 w-20 bg-white/[0.08] rounded-lg" />
        <div className="h-4 w-36 bg-white/[0.05] rounded mt-1" />
      </div>

      <div className="flex-1 px-4 pb-32 space-y-3">
        {/* Habit cards — each has a name, streak badge, and completion control */}
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
    </div>
  )
}
