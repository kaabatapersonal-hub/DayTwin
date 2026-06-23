/** Skeleton for the Growth tab — matches the real screen layout. */
export default function GrowthLoading() {
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col animate-pulse">
      {/* Header */}
      <div className="pt-safe-top px-5 pb-4">
        <div className="h-7 w-20 bg-white/[0.08] rounded-lg" />
        <div className="h-4 w-40 bg-white/[0.05] rounded mt-1" />
      </div>

      <div className="flex-1 px-4 pb-32 space-y-4">
        {/* Section label */}
        <div className="h-3 w-12 bg-white/[0.05] rounded" />

        {/* Goal cards */}
        {[1, 2].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-white/[0.04]" />
        ))}

        {/* Consistency heatmap */}
        <div className="h-44 rounded-3xl bg-white/[0.03]" />

        {/* Weekly review card */}
        <div className="h-36 rounded-3xl bg-white/[0.03]" />

        {/* Achievements */}
        <div className="h-20 rounded-3xl bg-white/[0.03]" />

        {/* Time summary */}
        <div className="h-28 rounded-3xl bg-white/[0.03]" />
      </div>
    </div>
  )
}
