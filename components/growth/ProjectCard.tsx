import Link from 'next/link'
import type { Project } from '@/types'

const STATUS_COLOR: Record<string, string> = {
  active:    'text-teal/70',
  completed: 'text-white/30',
  archived:  'text-white/20',
}

interface ProjectCardProps {
  project:   Project
  taskCount: number
}

/** Tappable project row — used inside GoalDetail's project list. */
export function ProjectCard({ project, taskCount }: ProjectCardProps) {
  return (
    <Link
      href={`/growth/projects/${project.id}`}
      className="flex items-center gap-3 px-4 py-3.5 active:bg-white/5 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-body truncate ${project.status === 'completed' ? 'text-white/40' : 'text-white'}`}>
          {project.title}
        </p>
        <p className={`text-xs font-body mt-0.5 ${STATUS_COLOR[project.status]}`}>
          {project.status === 'completed' ? 'Done' : `${taskCount} task${taskCount !== 1 ? 's' : ''}`}
        </p>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 3 11 8 6 13"/>
      </svg>
    </Link>
  )
}
