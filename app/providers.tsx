'use client'

import { useEffect }              from 'react'
import { ensureAnonymousSession } from '@/lib/auth'
import { TrackingProvider }       from '@/contexts/TrackingContext'
import { TrackingBar }            from '@/components/tracking/TrackingBar'
import { ReducedMotionProvider }  from '@/contexts/ReducedMotionContext'
import { ThemeProvider }          from '@/contexts/ThemeContext'
import { SoundProvider }          from '@/contexts/SoundContext'
import { SoundBar }               from '@/components/sound/SoundBar'

interface ProvidersProps {
  children:       React.ReactNode
  initialThemeId: string | null
  initialAccent:  string
  initialBg:      string
}

export function Providers({
  children,
  initialThemeId,
  initialAccent,
  initialBg,
}: ProvidersProps) {
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
    <ThemeProvider
      initialThemeId={initialThemeId}
      initialAccent={initialAccent}
      initialBg={initialBg}
    >
      <SoundProvider>
        <ReducedMotionProvider>
          <TrackingProvider>
            <TrackingBar />
            {children}
            <SoundBar />
          </TrackingProvider>
        </ReducedMotionProvider>
      </SoundProvider>
    </ThemeProvider>
  )
}
