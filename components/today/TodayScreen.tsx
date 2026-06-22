'use client'

import { useState, useEffect, useRef } from 'react'
import { AnimatePresence }              from 'framer-motion'
import { createClient }                 from '@/lib/supabase/client'
import { startFocusSession }           from '@/lib/focus-sessions'
import { TopBar }                       from './TopBar'
import { IntentionCard }                from './IntentionCard'
import { TimelineView }                 from './TimelineView'
import { QuickTaskList }                from './QuickTaskList'
import { EmptyState }                   from './EmptyState'
import { CoachCard }                    from './CoachCard'
import { MoodCheckIn }                  from './MoodCheckIn'
import { ReflectionCard }               from './ReflectionCard'
import { ScoreRing }                    from './ScoreRing'
import { HardDayOverlay }               from './HardDayOverlay'
import { TaskForm, type FormMode, type TaskFormData } from './TaskForm'
import { TodayHabits }                  from '@/components/habits/TodayHabits'
import { TrackingSheet }                from '@/components/tracking/TrackingSheet'
import { FocusSheet }                   from '@/components/focus/FocusSheet'
import { FocusScreen }                  from '@/components/focus/FocusScreen'
import { FocusComplete }                from '@/components/focus/FocusComplete'
import { useTasks }                     from '@/hooks/useTasks'
import { useIntention }                 from '@/hooks/useIntention'
import { useTodayHabits }               from '@/hooks/useTodayHabits'
import { useScore }                     from '@/hooks/useScore'
import { useMood }                      from '@/hooks/useMood'
import { useReflection }                from '@/hooks/useReflection'
import type {
  Task, Intention, TodayHabit, Reflection, MoodLog, CoachData,
  NewMoodLog, NewReflection, FocusSession,
} from '@/types'

interface FormState {
  mode: FormMode
  task?: Task
}

interface TodayScreenProps {
  initialTasks:              Task[]
  initialIntention:          Intention | null
  initialTodayHabits:        TodayHabit[]
  date:                      string
  initialScore:              number
  initialReflection:         Reflection | null
  initialTodayMoods:         MoodLog[]
  coachData:                 CoachData
  activeGoalId:              string | null
  initialActiveFocusSession: FocusSession | null  // non-null if app reopened mid-session
}

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
  initialActiveFocusSession,
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

  const { moods, log: logMood, error: moodError }       = useMood(initialTodayMoods)
  const { reflection, submit: submitReflection, error: reflectionError } = useReflection(initialReflection, date)
  const { score, recalculate }                          = useScore(initialScore, date)

  const [formState,        setFormState]        = useState<FormState | null>(null)
  const [showHardDay,      setShowHardDay]      = useState(false)
  const [showTrackSheet,   setShowTrackSheet]   = useState(false)
  const [showFocusSheet,   setShowFocusSheet]   = useState(false)
  const [focusSession,     setFocusSession]     = useState<FocusSession | null>(null)
  const [focusTaskTitle,   setFocusTaskTitle]   = useState<string | null>(null)
  const [showFocusComplete, setShowFocusComplete] = useState(false)
  const [focusWasComplete, setFocusWasComplete] = useState(false)

  const supabase = useRef(createClient()).current

  // Restore focus session if the app was reopened while one was running.
  // Computes remaining time — if already expired, calls the complete API.
  useEffect(() => {
    if (!initialActiveFocusSession) return

    const s          = initialActiveFocusSession
    const elapsedMs  = Date.now() - new Date(s.started_at).getTime()
    const remaining  = s.planned_duration_seconds - Math.floor(elapsedMs / 1000)

    if (remaining > 0) {
      // Still running — restore the FocusScreen
      const linkedTask = [...timeBlocked, ...quick].find(t => t.id === s.task_id)
      setFocusTaskTitle(linkedTask?.title ?? null)
      setFocusSession(s)
    } else {
      // Timer has already elapsed — auto-complete server-side
      fetch('/api/focus-sessions/complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: s.id }),
      }).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recalculates score using the freshest in-memory snapshots of all factors
  function triggerScoreRecalc(opts?: {
    overrideTasks?:     Task[]
    overrideHabits?:    typeof todayHabits
    overrideReflDone?:  boolean
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

  async function handleFocusStart(plannedSeconds: number, taskId: string | null) {
    setShowFocusSheet(false)
    try {
      const session    = await startFocusSession(supabase, plannedSeconds, taskId)
      const linkedTask = taskId ? [...timeBlocked, ...quick].find(t => t.id === taskId) : undefined
      setFocusTaskTitle(linkedTask?.title ?? null)
      setFocusSession(session)
    } catch {
      // If session creation fails, the sheet is already closed — no orphaned UI
    }
  }

  function handleFocusComplete(isActuallyComplete: boolean) {
    setFocusSession(null)
    setFocusWasComplete(isActuallyComplete)
    setShowFocusComplete(true)
  }

  function handleFocusCancel() {
    setFocusSession(null)
    setFocusTaskTitle(null)
  }

  const hasAnyTasks  = timeBlocked.length > 0 || quick.length > 0
  const hasAnything  = hasAnyTasks || todayHabits.length > 0
  const displayError = taskError ?? intentionError ?? habitError ?? moodError
  const allTasks     = [...timeBlocked, ...quick]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar date={date} scorePct={score} onHardDay={() => setShowHardDay(true)} />

      <div className="flex-1 flex flex-col px-4 pb-28">
        <CoachCard data={coachData} />
        <MoodCheckIn moods={moods} onLog={handleMoodLog} />

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
                  onEdit={task => setFormState({ mode: 'edit', task })}
                  onAdd={() => openAdd('add-time-block')}
                />
                <QuickTaskList
                  tasks={quick}
                  onToggleComplete={handleToggleComplete}
                  onEdit={task => setFormState({ mode: 'edit', task })}
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

        <div className="mt-8 flex justify-center">
          <ScoreRing pct={score} size={88} />
        </div>

        <div className="mt-6">
          <ReflectionCard
            reflection={reflection}
            onSubmit={handleReflectionSubmit}
            error={reflectionError}
          />
        </div>
      </div>

      {/* FABs — only shown when not in a focus session */}
      {!focusSession && (
        <>
          {/* Tracking FAB — manual timer (stopwatch icon) */}
          <button
            onClick={() => setShowTrackSheet(true)}
            className="fixed bottom-40 right-5 w-12 h-12 rounded-full bg-teal/15 border border-teal/30 text-teal flex items-center justify-center shadow-lg active:scale-90 transition-transform z-20"
            aria-label="Start time tracking"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="13" r="8"/>
              <polyline points="12 9 12 13 14.5 15.5"/>
              <path d="M5 3 2 6"/>
              <path d="M22 6l-3-3"/>
              <path d="M6.38 18.7 4 21"/>
              <path d="M17.64 18.67 20 21"/>
            </svg>
          </button>

          {/* Focus Session FAB — countdown mode (lightning icon) */}
          <button
            onClick={() => setShowFocusSheet(true)}
            className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-gold text-background flex items-center justify-center shadow-lg active:scale-90 transition-transform z-20"
            aria-label="Start focus session"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </button>
        </>
      )}

      {/* Bottom sheets */}
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
        {showTrackSheet && (
          <TrackingSheet
            tasks={allTasks}
            onClose={() => setShowTrackSheet(false)}
          />
        )}
        {showFocusSheet && (
          <FocusSheet
            tasks={allTasks}
            onStart={handleFocusStart}
            onClose={() => setShowFocusSheet(false)}
          />
        )}
      </AnimatePresence>

      {/* Full-screen overlays */}
      {showHardDay && (
        <HardDayOverlay activeGoalId={activeGoalId} onClose={() => setShowHardDay(false)} />
      )}
      {focusSession && (
        <FocusScreen
          session={focusSession}
          taskTitle={focusTaskTitle}
          onComplete={handleFocusComplete}
          onCancel={handleFocusCancel}
        />
      )}
      {showFocusComplete && (
        <FocusComplete
          isComplete={focusWasComplete}
          onDismiss={() => setShowFocusComplete(false)}
        />
      )}
    </div>
  )
}
