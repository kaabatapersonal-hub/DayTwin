'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { updateProject, archiveProject } from '@/lib/projects'
import { fetchGoals } from '@/lib/goals'
import { ProjectForm, type ProjectFormData } from './ProjectForm'
import type { Project, Task, Goal } from '@/types'

interface ProjectDetailProps {
  initialProject: Project
  initialTasks:   Task[]
  initialGoal:    Goal | null
}

export function ProjectDetail({ initialProject, initialTasks, initialGoal }: ProjectDetailProps) {
  const router   = useRouter()
  const supabase = createClient()

  const [project,        setProject]        = useState<Project>(initialProject)
  const [tasks]                             = useState<Task[]>(initialTasks)
  const [goals,          setGoals]          = useState<Goal[]>(initialGoal ? [initialGoal] : [])
  const [showForm,       setShowForm]       = useState(false)
  const [goalsLoaded,    setGoalsLoaded]    = useState(false)

  // Lazy-load all goals so the selector is populated when the form opens
  async function openEditForm() {
    if (!goalsLoaded) {
      try {
        const all = await fetchGoals(supabase, 'active')
        setGoals(all)
        setGoalsLoaded(true)
      } catch {
        // Proceed with partial list if fetch fails
      }
    }
    setShowForm(true)
  }

  const handleSubmit = useCallback(async (data: ProjectFormData) => {
    const saved = await updateProject(supabase, project.id, data)
    setProject(saved)
    setShowForm(false)
  }, [supabase, project.id])

  const handleArchive = useCallback(async () => {
    await archiveProject(supabase, project.id)
    router.push('/growth')
  }, [supabase, project.id, router])

  const completedTasks = tasks.filter(t => t.completed)
  const pendingTasks   = tasks.filter(t => !t.completed)

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
            {project.title}
          </h1>
          <span className={`text-[10px] font-body px-2 py-1 rounded-full ${
            project.status === 'completed'
              ? 'bg-white/10 text-white/40'
              : 'bg-teal/10 text-teal'
          }`}>
            {project.status}
          </span>
          <button onClick={openEditForm}
            className="p-2 -mr-2 text-white/40 active:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>
      </header>

      <main className="px-4 pb-32 pt-2 space-y-6">
          {/* Linked goal */}
        {initialGoal && (
          <Link href={`/growth/goals/${initialGoal.id}`}
            className="flex items-center gap-2 px-1 active:opacity-70">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D9A653" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span className="text-xs font-body text-gold">{initialGoal.title}</span>
          </Link>
        )}

        {/* Tasks */}
        <section>
          <h3 className="text-xs font-body text-white/40 uppercase tracking-widest mb-3">
            Tasks
          </h3>
          <p className="text-[10px] font-body text-white/25 mb-3">
            Tag tasks to this project from the Today screen.
          </p>

          {tasks.length === 0 ? (
            <div className="bg-white/[0.03] rounded-2xl p-6 text-center">
              <p className="text-sm font-body text-white/30">
                No tasks linked yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTasks.length > 0 && (
                <div className="bg-white/[0.03] rounded-2xl divide-y divide-white/5 overflow-hidden">
                  {pendingTasks.map(task => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              )}
              {completedTasks.length > 0 && (
                <>
                  <p className="text-xs font-body text-white/25 px-1 mt-4">Done</p>
                  <div className="bg-white/[0.03] rounded-2xl divide-y divide-white/5 overflow-hidden">
                    {completedTasks.map(task => (
                      <TaskRow key={task.id} task={task} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </main>

      <AnimatePresence>
        {showForm && (
          <ProjectForm
            key="project-form"
            initialProject={project}
            goals={goals}
            onSubmit={handleSubmit}
            onArchive={handleArchive}
            onClose={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function TaskRow({ task }: { task: Task }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center ${
        task.completed
          ? 'bg-teal/20 border-teal/40'
          : 'border-white/20'
      }`}>
        {task.completed && (
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2 5 4.5 7.5 8 3"/>
          </svg>
        )}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-body ${task.completed ? 'text-white/30 line-through' : 'text-white'}`}>
          {task.title}
        </p>
        <p className="text-xs font-body text-white/25 mt-0.5">
          {new Date(`${task.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  )
}
