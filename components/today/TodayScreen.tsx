'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { TopBar }          from './TopBar'
import { IntentionCard }   from './IntentionCard'
import { TimelineView }    from './TimelineView'
import { QuickTaskList }   from './QuickTaskList'
import { EmptyState }      from './EmptyState'
import { CoachCard }       from './CoachCard'
import { MoodCheckIn }     from './MoodCheckIn'
import { ReflectionCard }  from './ReflectionCard'
import { ScoreRing }       from './ScoreRing'
import { HardDayOverlay }  from './HardDayOverlay'
import { TaskForm, type FormMode, type TaskFormData } from './TaskForm'
import { TodayHabits }     from '@/components/habits/TodayHabits'
import { useTasks }        from '@/hooks/useTasks'
import { useIntention }    from '@/hooks/useIntention'
import { useTodayHabits }  from '@/hooks/useTodayHabits'
import { useScore }        from '@/hooks/useScore'
import { useMood }         from '@/hooks/useMood'
import { useReflection }   from '@/hooks/useReflection'
import type {
  Task, Intention, TodayHabit, Reflection, MoodLog, CoachData, NewMoodLog, NewReflection,
} from '@/types'

interface FormState {
  mode: FormMode
  task?: Task
}

interface TodayScreenProps {
  initialTasks:       Task[]
  initialIntention:   Intention | null
  initialTodayHabits: TodayHabit[]
  date:               string
  initialScore:       number
  initialReflection:  Reflection | null
  initialTodayMoods:  MoodLog[]
  coachData:          CoachData
  activeGoalId:       string | null  // for Hard Day overlay Future Me lookup
}

/**
 * Root client component for the Today screen.
 *
 * Score is recalculated after every change to tasks, habits, mood, or reflection
 * so the ring always reflects the current state without a page reload.
 */
export function TodayScreen({
  initialTasks,
  initialIntention,
  initialTodayHabits,
  date,
  initialScore,
  initialReflection,
  initialTodayMoods,
  coachData,
  activeGoalId,
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

  const {
    habits: todayHabits,
    toggleBoolean, incrementCount, startTimer, stopTimer,
    error: habitError,
  } = useTodayHabits(initialTodayHabits)

  const { moods, log: logMood, error: moodError } = useMood(initialTodayMoods)

  const {
    reflection, submit: submitReflection, error: reflectionError,
  } = useReflection(initialReflection, date)

  const { score, recalculate } = useScore(initialScore, date)

  const [formState,   setFormState]   = useState<FormState | null>(null)
  const [showHardDay, setShowHardDay] = useState(false)

  const hasAnyTasks  = timeBlocked.length > 0 || quick.length > 0
  const hasAnything  = hasAnyTasks || todayHabits.length > 0
  const displayError = taskError ?? intentionError ?? habitError ?? moodError

  // Recalculates score using the freshest in-memory snapshots of all factors.
  // Called after every tracked change — keeps the ring reactive.
  function triggerScoreRecalc(opts?: {
    overrideTasks?:    Task[]
    overrideHabits?:   typeof todayHabits
    overrideReflDone?: boolean
    overrideMoodCount?: number
  }) {
    const tasks      = opts?.overrideTasks    ?? [...timeBlocked, ...quick]
    const habits     = opts?.overrideHabits   ?? todayHabits
    const reflDone   = opts?.overrideReflDone ?? reflection !== null
    const moodLogged = (opts?.overrideMoodCount ?? moods.length) > 0
    recalculate(tasks, habits, reflDone, moodLogged).catch(() => {})
  }

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
    triggerScoreRecalc()
  }

  async function handleDelete() {
    if (!formState?.task) return
    await remove(formState.task.id)
    setFormState(null)
    triggerScoreRecalc()
  }

  async function handleToggleComplete(task: Task) {
    await toggleComplete(task)
    triggerScoreRecalc()
  }

  async function handleMoodLog(payload: NewMoodLog) {
    await logMood(payload)
    // Pass the incremented count since state won't have updated yet
    triggerScoreRecalc({ overrideMoodCount: moods.length + 1 })
  }

  async function handleReflectionSubmit(payload: NewReflection) {
    await submitReflection(payload)
    triggerScoreRecalc({ overrideReflDone: true })
  }

  async function handleHabitToggle(habitId: string) {
    await toggleBoolean(habitId)
    triggerScoreRecalc()
  }

  async function handleHabitStop(habitId: string) {
    await stopTimer(habitId)
    triggerScoreRecalc()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar
        date={date}
        scorePct={score}
        onHardDay={() => setShowHardDay(true)}
      />

      <div className="flex-1 flex flex-col px-4 pb-28">
        {/* Morning coach — hides itself after noon (client-side check in CoachCard) */}
        <CoachCard data={coachData} />

        {/* Mood check-in — shows for the current period if not yet logged */}
        <MoodCheckIn moods={moods} onLog={handleMoodLog} />

        {/* Morning intention */}
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

        {displayError && (
          <div className="mb-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400 font-body">{displayError}</p>
          </div>
        )}

        {!hasAnything ? (
          <EmptyState
            onAddTimeBlock={() => openAdd('add-time-block')}
            onAddQuick={() => openAdd('add-quick')}
          />
        ) : (
          <div className="space-y-7 mt-2">
            {hasAnyTasks && (
              <>
                <TimelineView
                  tasks={timeBlocked}
                  onToggleComplete={handleToggleComplete}
                  onEdit={openEdit}
                  onAdd={() => openAdd('add-time-block')}
                />
                <QuickTaskList
                  tasks={quick}
                  onToggleComplete={handleToggleComplete}
                  onEdit={openEdit}
                  onAdd={() => openAdd('add-quick')}
                />
              </>
            )}

            {todayHabits.length > 0 && (
              <TodayHabits
                habits={todayHabits}
                onToggleBoolean={handleHabitToggle}
                onIncrementCount={incrementCount}
                onStartTimer={startTimer}
                onStopTimer={handleHabitStop}
              />
            )}
          </div>
        )}

        {/* Score ring — always visible, reactively updated */}
        <div className="mt-8 flex justify-center">
          <ScoreRing pct={score} size={88} />
        </div>

        {/* Evening reflection — appears after 7pm, scrollable past, never blocking */}
        <div className="mt-6">
          <ReflectionCard
            reflection={reflection}
            onSubmit={handleReflectionSubmit}
            error={reflectionError}
          />
        </div>
      </div>

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

      {/* Full-screen overlay — not a modal, no swipe-to-dismiss */}
      {showHardDay && (
        <HardDayOverlay
          activeGoalId={activeGoalId}
          onClose={() => setShowHardDay(false)}
        />
      )}
    </div>
  )
}
