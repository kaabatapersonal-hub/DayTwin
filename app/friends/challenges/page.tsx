/**
 * Challenges placeholder page.
 * Routes from the "Challenge" button on individual friend profiles.
 * No challenge logic is built in V1 — this page signals that the feature
 * is coming and explains what it will be.
 */
export default function ChallengesPage() {
  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <header className="pt-safe-top px-5 pb-4">
        <h1 className="font-heading text-2xl font-bold text-white">Challenges</h1>
        <p className="text-sm font-body text-white/40 mt-0.5">Compete with friends</p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center pb-32">
        <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mb-8">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D9A653"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>

        <h2 className="font-heading text-2xl font-bold text-white mb-3">Coming soon</h2>

        <p className="text-sm font-body text-white/45 leading-relaxed max-w-xs">
          Challenges let you compete head-to-head on daily scores, lock in a shared habit streak,
          or run a points battle over a set number of days. Building it next.
        </p>

        <div className="mt-10 space-y-3 w-full max-w-xs">
          {[
            { label: 'Score Battle', desc: 'Who ends the week with the higher daily score?' },
            { label: 'Habit Pact',   desc: 'Both commit to the same habit. One break and the streak resets for both.' },
          ].map(item => (
            <div
              key={item.label}
              className="flex gap-3 p-4 bg-white/[0.04] rounded-2xl border border-white/[0.06] text-left"
            >
              <div className="w-1.5 rounded-full bg-gold/50 flex-shrink-0" />
              <div>
                <p className="text-sm font-body font-medium text-white/70">{item.label}</p>
                <p className="text-xs font-body text-white/30 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
