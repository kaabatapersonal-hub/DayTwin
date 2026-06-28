'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence }                    from 'framer-motion'
import { useGoals }                           from '@/hooks/useGoals'
import { GoalCard }                           from './GoalCard'
import { GoalForm, type GoalFormData }        from './GoalForm'
import { GrowthEmptyState }                   from './GrowthEmptyState'
import { EvidenceOfGrowth }                   from './EvidenceOfGrowth'
import { WeeklyTimeSummary }                  from '@/components/tracking/WeeklyTimeSummary'
import { ConsistencyHeatmap }                 from './ConsistencyHeatmap'
import { WeeklyReviewCard }                   from './WeeklyReviewCard'
import { GrowthLevelCard }                    from './GrowthLevelCard'
import { MilestoneCelebration }               from './MilestoneCelebration'
import { BadgesList }                         from './BadgesList'
import { getWeekStart, todayISO }             from '@/lib/format'
import type {
  Goal, Reflection, TimeCategorySummary,
  WeeklyReview, UserBadge, HeatmapDay,
} from '@/types'

interface GrowthScreenProps {
  initialGoals:        Goal[]
  projectCountsByGoal: Record<string, number>
  reflections:         Reflection[]
  weeklySummary:       TimeCategorySummary[]
  initialReviews:      WeeklyReview[]
  initialBadges:       UserBadge[]
  heatmapData:         HeatmapDay[]
  tonePreference:      'warm' | 'direct' | 'hype'
  sparksLifetime:      number
}

/** Local storage key for tracking which badge celebrations have been dismissed. */
const SEEN_BADGES_KEY = 'daytwin_seen_badges'

function readSeenBadges(): Set<string> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(SEEN_BADGES_KEY) : null
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function markBadgeSeen(badgeId: string): void {
  try {
    const current = readSeenBadges()
    current.add(badgeId)
    localStorage.setItem(SEEN_BADGES_KEY, JSON.stringify(Array.from(current)))
  } catch { /* localStorage unavailable (private mode / SSR) — silent */ }
}

/**
 * Growth tab root — goals, weekly review, consistency heatmap,
 * achievements, time summary, and Evidence of Growth timeline.
 *
 * Milestone celebrations fire at most once per badge per device.
 * The badge ID is stored in localStorage after the first dismissal.
 * Server-side triggers guarantee the badge is only awarded once in the DB;
 * this check only guards the UI overlay.
 */
export function GrowthScreen({
  initialGoals, projectCountsByGoal, reflections, weeklySummary,
  initialReviews, initialBadges, heatmapData, tonePreference, sparksLifetime,
}: GrowthScreenProps) {
  const { goals, add, error } = useGoals(initialGoals)
  const [showForm, setShowForm] = useState(false)

  // Weekly review
  const [reviews,     setReviews]     = useState<WeeklyReview[]>(initialReviews)
  const [generating,  setGenerating]  = useState(false)
  const thisWeekStart  = getWeekStart(todayISO())
  const currentReview  = reviews.find(r => r.week_start === thisWeekStart) ?? null

  // Milestone celebration queue
  // Checked client-side on mount; only fires for badges not yet in localStorage
  const [pendingBadges,  setPendingBadges]  = useState<UserBadge[]>([])
  const [celebrationBadge, setCelebrationBadge] = useState<UserBadge | null>(null)

  useEffect(() => {
    const seen = readSeenBadges()
    const unseen = initialBadges.filter(ub => !seen.has(ub.badge_id))
    if (unseen.length > 0) {
      setPendingBadges(unseen.slice(1))   // queue the rest
      setCelebrationBadge(unseen[0])      // show the first immediately
    }
  }, [initialBadges])

  function handleDismissCelebration() {
    if (celebrationBadge) markBadgeSeen(celebrationBadge.badge_id)
    const next = pendingBadges[0] ?? null
    setCelebrationBadge(next)
    if (next) setPendingBadges(prev => prev.slice(1))
  }

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/growth/weekly-review', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ week_start: thisWeekStart }),
      })
      if (!res.ok) return
      const review = await res.json() as WeeklyReview
      setReviews(prev => [review, ...prev.filter(r => r.week_start !== review.week_start)])
    } finally {
      setGenerating(false)
    }
  }, [thisWeekStart])

  async function handleAdd(data: GoalFormData) {
    await add(data)
    setShowForm(false)
  }

  const activeGoals    = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')
  const hasGoals       = goals.length > 0

  return (
    <div className="h-screen bg-background text-white flex flex-col">
      <header className="page-header pt-safe-top px-5 pb-4 bg-background">
        <h1 className="font-heading text-2xl font-bold text-white">Growth</h1>
        <p className="text-sm font-body text-white/40 mt-0.5">Your goals and progress</p>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-y-none px-4 pb-32 space-y-5">
        {error && (
          <p className="text-xs text-red-400 font-body mb-2">{error}</p>
        )}
        {/* Goals */}
        {!hasGoals ? (
          <GrowthEmptyState onAdd={() => setShowForm(true)} />
        ) : (
          <div className="space-y-4">
            {activeGoals.length > 0 && (
              <section>
                <h2 className="text-xs font-body text-white/40 uppercase tracking-widest mb-3">
                  Active
                </h2>
                <div className="space-y-3">
                  {activeGoals.map(goal => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      projectCount={projectCountsByGoal[goal.id] ?? 0}
                    />
                  ))}
                </div>
              </section>
            )}

            {completedGoals.length > 0 && (
              <section>
                <h2 className="text-xs font-body text-white/40 uppercase tracking-widest mb-3">
                  Done
                </h2>
                <div className="space-y-3">
                  {completedGoals.map(goal => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      projectCount={projectCountsByGoal[goal.id] ?? 0}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Consistency heatmap — below goals, above Evidence of Growth per spec */}
        <ConsistencyHeatmap data={heatmapData} />

        {/* Weekly review card */}
        <WeeklyReviewCard
          review={currentReview}
          canGenerate={!currentReview}
          onGenerate={handleGenerate}
          generating={generating}
        />

        {/* Growth level + Sparks progress */}
        <GrowthLevelCard sparksLifetime={sparksLifetime} />

        {/* Achievements — badges earned so far */}
        <BadgesList badges={initialBadges} />

        {/* Weekly time breakdown */}
        <WeeklyTimeSummary summaries={weeklySummary} />

        {/* Evidence of Growth — unchanged from Session 5 */}
        <EvidenceOfGrowth reflections={reflections} />
      </main>

      {hasGoals && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-gold text-background flex items-center justify-center shadow-lg active:scale-90 transition-transform z-10"
          aria-label="Add goal"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5"  y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      )}

      <AnimatePresence>
        {showForm && (
          <GoalForm key="goal-form" onSubmit={handleAdd} onClose={() => setShowForm(false)} />
        )}
      </AnimatePresence>

      {/* Milestone celebration overlay — shown once per badge, gated by localStorage */}
      {celebrationBadge && (
        <MilestoneCelebration
          badge={celebrationBadge}
          tone={tonePreference}
          onDismiss={handleDismissCelebration}
        />
      )}
    </div>
  )
}
