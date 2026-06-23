'use client'

import { useEffect }              from 'react'
import { ensureAnonymousSession } from '@/lib/auth'
import { TrackingProvider }       from '@/contexts/TrackingContext'
import { TrackingBar }            from '@/components/tracking/TrackingBar'
import { ReducedMotionProvider }  from '@/contexts/ReducedMotionContext'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ensureAnonymousSession()

    // Register PWA service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Init OneSignal when the SDK script has loaded
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
    if (appId) {
      const win = window as typeof window & {
        OneSignalDeferred?: Array<(os: { init: (opts: object) => Promise<void>; User: { PushSubscription: { optedIn: boolean; id?: string } }; Notifications: { requestPermission: () => Promise<void>; addEventListener: (e: string, fn: (sub: { id?: string }) => void) => void } }) => void>
      }
      win.OneSignalDeferred = win.OneSignalDeferred || []
      win.OneSignalDeferred.push(async (OneSignal) => {
        await OneSignal.init({
          appId,
          notifyButton:              { enable: false },
          allowLocalhostAsSecureOrigin: true,
        })
        // When subscription changes, save the player ID
        OneSignal.Notifications.addEventListener('permissionChange', async () => {
          const playerId = OneSignal.User.PushSubscription.id
          if (playerId) {
            await fetch('/api/notifications/register', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ player_id: playerId }),
            }).catch(() => {})
          }
        })
      })
    }
  }, [])

  return (
    <ReducedMotionProvider>
      <TrackingProvider>
        {/*
          TrackingBar is sticky top-0, part of the normal document flow.
          It returns null when no timer is active (zero height, no layout space).
          When active, it pushes all page content down by its 36px height.
        */}
        <TrackingBar />
        {children}
      </TrackingProvider>
    </ReducedMotionProvider>
  )
}
