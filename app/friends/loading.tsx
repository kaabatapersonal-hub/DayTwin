/** Skeleton for the Friends tab — matches the real screen layout. */
export default function FriendsLoading() {
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col animate-pulse">
      {/* Header */}
      <div className="pt-safe-top px-5 pb-3 flex items-center justify-between">
        <div className="h-7 w-24 bg-white/[0.08] rounded-lg" />
        <div className="flex gap-2">
          <div className="h-8 w-16 rounded-xl bg-white/[0.06]" />
          <div className="h-8 w-12 rounded-xl bg-white/[0.08]" />
        </div>
      </div>

      <div className="flex-1 px-4 pb-32 space-y-3">
        {/* Challenges row */}
        <div className="h-12 rounded-2xl bg-white/[0.04]" />

        {/* Friend list items */}
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
    </div>
  )
}
