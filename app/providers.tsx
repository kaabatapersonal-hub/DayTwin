'use client'

import { useEffect }           from 'react'
import { ensureAnonymousSession } from '@/lib/auth'
import { TrackingProvider }    from '@/contexts/TrackingContext'
import { TrackingBar }         from '@/components/tracking/TrackingBar'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ensureAnonymousSession()
  }, [])

  return (
    <TrackingProvider>
      {/*
        TrackingBar is sticky top-0, part of the normal document flow.
        It returns null when no timer is active (zero height, no layout space).
        When active, it pushes all page content down by its 36px height.
        The pt-safe-top CSS rule in globals.css adds matching padding to TopBars.
      */}
      <TrackingBar />
      {children}
    </TrackingProvider>
  )
}
