'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { updateGoal, archiveGoal } from '@/lib/goals'
import { createProject, updateProject, archiveProject } from '@/lib/projects'
import { GoalForm, type GoalFormData } from './GoalForm'
import { ProjectForm, type ProjectFormData } from './ProjectForm'
import { ProjectCard } from './ProjectCard'
import { FutureMe } from './FutureMe'
import type { Goal, Project } from '@/types'

interface GoalDetailProps {
  initialGoal:     Goal
  initialProjects: Project[]
}

// Slider saves on gesture release (onMouseUp/onTouchEnd) — progress_pct is manual-only, no auto-calc
export function GoalDetail({ initialGoal, initialProjects }: GoalDetailProps) {
  const router  = useRouter()
  const supabase = createClient()

  const [goal,     setGoal]     = useState<Goal>(initialGoal)
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [pct,      setPct]      = useState(initialGoal.progress_pct)
  const [showGoalForm,    setShowGoalForm]    = useState(false)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProject,  setEditingProject]  = useState<Project | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  // ── Progress slider ───────────────────────────────────────────────────────────

  async function flushProgress() {
    try {
      const updated = await updateGoal(supabase, goal.id, { progress_pct: pct })
      setGoal(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save progress')
    }
  }

  // ── Goal edit/archive ─────────────────────────────────────────────────────────

  const handleGoalSubmit = useCallback(async (data: GoalFormData) => {
    const updated = await updateGoal(supabase, goal.id, data)
    setGoal(updated)
    setPct(updated.progress_pct)
    setShowGoalForm(false)
  }, [supabase, goal.id])

  const handleGoalArchive = useCallback(async () => {
    await archiveGoal(supabase, goal.id)
    router.push('/growth')
  }, [supabase, goal.id, router])

  // ── Project create/edit/archive ───────────────────────────────────────────────

  const handleProjectSubmit = useCallback(async (data: ProjectFormData) => {
    if (editingProject) {
      const saved = await updateProject(supabase, editingProject.id, data)
      setProjects(prev => prev.map(p => p.id === editingProject.id ? saved : p))
    } else {
      const created = await createProject(supabase, { ...data, goal_id: goal.id })
      setProjects(prev => [...prev, created])
    }
    setShowProjectForm(false)
    setEditingProject(null)
  }, [supabase, editingProject, goal.id])

  const handleProjectArchive = useCallback(async () => {
    if (!editingProject) return
    await archiveProject(supabase, editingProject.id)
    setProjects(prev => prev.filter(p => p.id !== editingProject.id))
    setShowProjectForm(false)
    setEditingProject(null)
  }, [supabase, editingProject])

  // ── UI ────────────────────────────────────────────────────────────────────────

  const deadlineLabel = goal.deadline
    ? new Date(`${goal.deadline}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const ringColor =
    pct >= 80 ? '#2DD4BF' :
    pct >= 20 ? '#D9A653' :
                'rgba(255,255,255,0.2)'

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 pt-safe-top">
        <div className="flex items-center gap-3 px-4 pb-3">
          <Link href="/growth"
            className="p-2 -ml-2 text-white/50 active:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </Link>
          <h1 className="flex-1 font-heading text-base font-semibold text-white truncate">
            {goal.title}
          </h1>
          <span className={`text-[10px] font-body px-2 py-1 rounded-full ${
            goal.status === 'completed'
              ? 'bg-white/10 text-white/40'
              : 'bg-gold/10 text-gold'
          }`}>
            {goal.status}
          </span>
          <button onClick={() => setShowGoalForm(true)}
            className="p-2 -mr-2 text-white/40 active:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>
      </header>

      <main className="px-4 pb-32 space-y-6 pt-2">
        {error && <p className="text-xs text-red-400 font-body">{error}</p>}

        {/* Progress ring + slider */}
        <section className="bg-white/[0.03] rounded-2xl p-5">
          <div className="flex items-center gap-5 mb-4">
            {/* Ring */}
            <div className="relative flex-shrink-0 w-14 h-14 flex items-center justify-center">
              <svg width="56" height="56" className="absolute inset-0 -rotate-90">
                {(() => {
                  const size = 56, stroke = 4, r = (size - stroke) / 2
                  const circ = 2 * Math.PI * r
                  const dash = (pct / 100) * circ
                  return (
                    <>
                      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
                      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={ringColor} strokeWidth={stroke}
                        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 0.15s ease, stroke 0.15s ease' }} />
                    </>
                  )
                })()}
              </svg>
              <span className="relative text-sm font-body font-medium" style={{ color: ringColor }}>
                {pct}%
              </span>
            </div>
            <div>
              <p className="text-sm font-body text-white/70">Progress</p>
              <p className="text-xs font-body text-white/30 mt-0.5">Set manually · drag to update</p>
            </div>
          </div>

          {/* Slider */}
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={pct}
            onChange={e => setPct(Number(e.target.value))}
            onMouseUp={flushProgress}
            onTouchEnd={flushProgress}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${ringColor} ${pct}%, rgba(255,255,255,0.08) ${pct}%)`,
            }}
          />
        </section>

        {/* Deadline */}
        {deadlineLabel && (
          <div className="flex items-center gap-2 px-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="3"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="text-xs font-body text-white/40">Due {deadlineLabel}</span>
          </div>
        )}

        {/* WHY — the emotional anchor: Fraunces italic, gold tint */}
        {goal.why_text && (
          <section>
            <h3 className="text-xs font-body text-white/40 uppercase tracking-widest mb-2">Your WHY</h3>
            <p className="font-display italic text-white/80 text-base leading-relaxed">
              &ldquo;{goal.why_text}&rdquo;
            </p>
          </section>
        )}

        {/* Projects */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-body text-white/40 uppercase tracking-widest">Projects</h3>
            <button
              onClick={() => { setEditingProject(null); setShowProjectForm(true) }}
              className="text-xs font-body text-teal active:text-teal/70">
              + Add
            </button>
          </div>

          {projects.length > 0 ? (
            <div className="bg-white/[0.03] rounded-2xl divide-y divide-white/5 overflow-hidden">
              {projects.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  taskCount={0}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white/[0.03] rounded-2xl p-6 text-center">
              <p className="text-sm font-body text-white/30">
                Break this goal into projects to track what needs to get done.
              </p>
            </div>
          )}
        </section>

        {/* Future Me */}
        <FutureMe goalId={goal.id} goalTitle={goal.title} />
      </main>

      {/* Bottom sheets */}
      <AnimatePresence>
        {showGoalForm && (
          <GoalForm
            key="goal-form"
            initialGoal={goal}
            onSubmit={handleGoalSubmit}
            onArchive={handleGoalArchive}
            onClose={() => setShowGoalForm(false)}
          />
        )}
        {showProjectForm && (
          <ProjectForm
            key="project-form"
            initialProject={editingProject ?? undefined}
            prefilledGoalId={goal.id}
            goals={[]}
            onSubmit={handleProjectSubmit}
            onArchive={editingProject ? handleProjectArchive : undefined}
            onClose={() => { setShowProjectForm(false); setEditingProject(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
