'use client'

import {
  createContext, useContext, useState, useEffect, useRef,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchActiveEntry, startEntry } from '@/lib/time-entries'
import type { TimeEntry, TrackingCategory } from '@/types'

interface TrackingContextValue {
  activeEntry:   TimeEntry | null
  startTracking: (category: TrackingCategory, taskId?: string | null) => Promise<void>
  stopTracking:  () => Promise<void>
}

const TrackingContext = createContext<TrackingContextValue | null>(null)

/**
 * Provides the running time-entry state to all descendants.
 *
 * On mount, checks Supabase for any entry with end_at IS NULL — this restores
 * a timer that was running before the app was closed or the tab was refreshed.
 * Timer state is intentionally minimal here: the elapsed display lives in
 * TrackingBar (closest to the UI), not in this context, to avoid re-rendering
 * every second across the entire tree.
 */
export function TrackingProvider({ children }: { children: ReactNode }) {
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const supabase = useRef(createClient()).current

  useEffect(() => {
    // Restore in-progress timer on mount (handles app close + reopen)
    fetchActiveEntry(supabase)
      .then(setActiveEntry)
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Write a data attribute to <html> so globals.css can add extra padding to
  // pt-safe-top elements (TopBar etc.) when the tracking bar is visible.
  useEffect(() => {
    document.documentElement.dataset.trackingActive = activeEntry ? 'true' : 'false'
  }, [activeEntry])

  async function startTracking(
    category: TrackingCategory,
    taskId:   string | null = null,
  ) {
    // Only one timer at a time — stop any existing before starting new
    if (activeEntry) await stopTracking()
    const entry = await startEntry(supabase, category, taskId)
    setActiveEntry(entry)
  }

  async function stopTracking() {
    if (!activeEntry) return
    // duration_seconds is computed server-side by the API route
    await fetch('/api/time-entries/stop', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: activeEntry.id }),
    })
    setActiveEntry(null)
  }

  return (
    <TrackingContext.Provider value={{ activeEntry, startTracking, stopTracking }}>
      {children}
    </TrackingContext.Provider>
  )
}

export function useTracking(): TrackingContextValue {
  const ctx = useContext(TrackingContext)
  if (!ctx) throw new Error('useTracking must be used inside TrackingProvider')
  return ctx
}
