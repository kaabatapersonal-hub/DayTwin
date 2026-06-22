'use client'

import { useState }                from 'react'
import { AnimatePresence }          from 'framer-motion'
import { useGoals }                 from '@/hooks/useGoals'
import { GoalCard }                 from './GoalCard'
import { GoalForm, type GoalFormData } from './GoalForm'
import { GrowthEmptyState }         from './GrowthEmptyState'
import { EvidenceOfGrowth }         from './EvidenceOfGrowth'
import { WeeklyTimeSummary }        from '@/components/tracking/WeeklyTimeSummary'
import type { Goal, Reflection, TimeCategorySummary } from '@/types'

interface GrowthScreenProps {
  initialGoals:        Goal[]
  projectCountsByGoal: Record<string, number>
  reflections:         Reflection[]
  weeklySummary:       TimeCategorySummary[]
}

/**
 * Growth tab root — goals list, weekly time summary, and Evidence of Growth timeline.
 * Goal add/archive goes through useGoals (optimistic). The time summary and
 * reflections are server-fetched, static for the session.
 */
export function GrowthScreen({
  initialGoals, projectCountsByGoal, reflections, weeklySummary,
}: GrowthScreenProps) {
  const { goals, add, error } = useGoals(initialGoals)
  const [showForm, setShowForm] = useState(false)

  async function handleAdd(data: GoalFormData) {
    await add(data)
    setShowForm(false)
  }

  const activeGoals    = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')
  const hasGoals       = goals.length > 0

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <header className="pt-safe-top px-5 pb-4 bg-background">
        <h1 className="font-heading text-2xl font-bold text-white">Growth</h1>
        <p className="text-sm font-body text-white/40 mt-0.5">Your goals and projects</p>
      </header>

      {error && (
        <p className="text-xs text-red-400 font-body px-5 mb-2">{error}</p>
      )}

      <main className="flex-1 px-4 pb-32">
        {!hasGoals ? (
          <GrowthEmptyState onAdd={() => setShowForm(true)} />
        ) : (
          <div className="space-y-6">
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

        {/* Weekly time breakdown — always shown (empty state handled inside component) */}
        <WeeklyTimeSummary summaries={weeklySummary} />

        {/* Evidence of Growth — always shown below time summary */}
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
    </div>
  )
}
