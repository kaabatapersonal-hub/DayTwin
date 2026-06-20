import type { TaskCategory } from '@/types'

/**
 * Visual config for each task category.
 * Colors match the design tokens in tailwind.config.ts exactly.
 * Used by TaskCard, TaskForm, and anywhere categories are rendered.
 */
export const CATEGORY_CONFIG: Record<
  TaskCategory,
  { label: string; color: string; faintBg: string }
> = {
  deep_work: { label: 'Deep Work', color: '#2DD4BF', faintBg: 'rgba(45,212,191,0.12)' },
  study:     { label: 'Study',     color: '#D9A653', faintBg: 'rgba(217,166,83,0.12)' },
  health:    { label: 'Health',    color: '#D08B68', faintBg: 'rgba(208,139,104,0.12)' },
  admin:     { label: 'Admin',     color: '#8B8B85', faintBg: 'rgba(139,139,133,0.12)' },
  personal:  { label: 'Personal',  color: '#8B8B85', faintBg: 'rgba(139,139,133,0.12)' },
}

export const ALL_CATEGORIES: TaskCategory[] = [
  'deep_work', 'study', 'health', 'admin', 'personal',
]
