'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { TopBar }        from './TopBar'
import { IntentionCard } from './IntentionCard'
import { TimelineView }  from './TimelineView'
import { QuickTaskList } from './QuickTaskList'
import { EmptyState }    from './EmptyState'
import { TaskForm, type FormMode, type TaskFormData } from './TaskForm'
import { useTasks }     from '@/hooks/useTasks'
import { useIntention } from '@/hooks/useIntention'
import type { Task, Intention } from '@/types'

interface FormState {
  mode: FormMode
  task?: Task  // present only when mode === 'edit'
}

interface TodayScreenProps {
  initialTasks:     Task[]
  initialIntention: Intention | null
  date:             string  // ISO "YYYY-MM-DD"
}

/**
 * Root client component for the Today screen.
 *
 * Owns all mutable state and wires up the task and intention hooks.
 * The TaskForm sheet is rendered at this level so it overlays the full screen.
 * Sub-components receive only the data and callbacks they need — no prop drilling
 * of the whole task list.
 */
export function TodayScreen({
  initialTasks, initialIntention, date,
}: TodayScreenProps) {
  const {
    timeBlocked, quick,
    add, update, remove, toggleComplete,
    error: taskError,
  } = useTasks(initialTasks)

  const {
    intention, showPrompt,
    save: saveIntention, dismiss,
    error: intentionError,
  } = useIntention(initialIntention, date)

  const [formState, setFormState] = useState<FormState | null>(null)

  const hasAnyTasks   = timeBlocked.length > 0 || quick.length > 0
  const displayError  = taskError ?? intentionError

  function openAdd(mode: 'add-time-block' | 'add-quick') {
    setFormState({ mode })
  }

  function openEdit(task: Task) {
    setFormState({ mode: 'edit', task })
  }

  async function handleFormSubmit(data: TaskFormData) {
    if (!formState) return
    if (formState.mode === 'edit' && formState.task) {
      await update(formState.task.id, data)
    } else {
      await add(data)
    }
    setFormState(null)
  }

  async function handleDelete() {
    if (!formState?.task) return
    await remove(formState.task.id)
    setFormState(null)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar date={date} />

      <div className="flex-1 flex flex-col px-4 pb-12">
        {/* Morning intention — always sits at the top of the content area */}
        <AnimatePresence>
          {(showPrompt || intention) && (
            <IntentionCard
              intention={intention}
              showPrompt={showPrompt}
              onSave={saveIntention}
              onDismiss={dismiss}
            />
          )}
        </AnimatePresence>

        {/* Error banner — surfaces Supabase failures; never silent */}
        {displayError && (
          <div className="mb-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400 font-body">{displayError}</p>
          </div>
        )}

        {!hasAnyTasks ? (
          <EmptyState
            onAddTimeBlock={() => openAdd('add-time-block')}
            onAddQuick={() => openAdd('add-quick')}
          />
        ) : (
          <div className="space-y-7 mt-2">
            <TimelineView
              tasks={timeBlocked}
              onToggleComplete={toggleComplete}
              onEdit={openEdit}
              onAdd={() => openAdd('add-time-block')}
            />
            <QuickTaskList
              tasks={quick}
              onToggleComplete={toggleComplete}
              onEdit={openEdit}
              onAdd={() => openAdd('add-quick')}
            />
          </div>
        )}
      </div>

      {/* Task form bottom sheet — rendered at root so it overlays everything */}
      <AnimatePresence>
        {formState && (
          <TaskForm
            mode={formState.mode}
            date={date}
            initialTask={formState.task}
            onSubmit={handleFormSubmit}
            onDelete={formState.mode === 'edit' ? handleDelete : undefined}
            onClose={() => setFormState(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
