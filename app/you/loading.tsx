export default function YouLoading() {
  return (
    <div className="min-h-screen bg-[#080808] animate-pulse">
      <div className="pt-safe-top px-5 pb-4">
        <div className="h-7 w-16 bg-white/[0.08] rounded-lg" />
      </div>

      {/* Profile card skeleton */}
      <div className="px-4 mb-6">
        <div className="rounded-2xl bg-white/[0.04] p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/[0.08]" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 bg-white/[0.08] rounded" />
            <div className="h-3 w-20 bg-white/[0.04] rounded" />
          </div>
        </div>
      </div>

      {/* Section skeletons */}
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="px-4 mb-4">
          <div className="h-3 w-24 bg-white/[0.06] rounded mb-3" />
          <div className="rounded-2xl bg-white/[0.04] p-4 space-y-3">
            <div className="h-10 bg-white/[0.04] rounded-xl" />
            <div className="h-10 bg-white/[0.04] rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}
