/** Skeleton for the Today tab — matches the real screen layout. */
export default function TodayLoading() {
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col animate-pulse">
      {/* Header */}
      <div className="pt-safe-top px-5 pb-4">
        <div className="h-5 w-32 bg-white/[0.06] rounded-lg mb-1" />
        <div className="h-7 w-20 bg-white/[0.08] rounded-lg" />
      </div>

      <div className="flex-1 px-4 pb-32 space-y-4">
        {/* Morning coach card */}
        <div className="h-28 rounded-3xl bg-white/[0.04]" />

        {/* Score bar */}
        <div className="h-14 rounded-2xl bg-white/[0.04]" />

        {/* Task section */}
        <div className="h-4 w-20 bg-white/[0.05] rounded" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-2xl bg-white/[0.04]" />
          ))}
        </div>

        {/* Habits section */}
        <div className="h-4 w-20 bg-white/[0.05] rounded mt-2" />
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-14 rounded-2xl bg-white/[0.04]" />
          ))}
        </div>

        {/* Reflection card */}
        <div className="h-20 rounded-3xl bg-white/[0.04]" />
      </div>
    </div>
  )
}
