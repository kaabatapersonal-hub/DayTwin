import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Inter, Fraunces } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers }    from './providers'
import { BottomNav }   from '@/components/nav/BottomNav'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_ACCENT = '#2DD4BF'
const DEFAULT_BG     = '#080808'

const geist = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist',
  weight: '100 900',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-inter',
  display: 'swap',
})

// Loaded but not yet used — reserved for WHY screen, Future Me, Hard Day quote.
const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['italic'],
  weight: ['400'],
  variable: '--font-fraunces',
  display: 'swap',
})

export const metadata: Metadata = {
  title:       'DayTwin',
  description: 'Your personal operating system',
  manifest:    '/manifest.json',
  appleWebApp: {
    statusBarStyle: 'black-translucent',
    title:         'DayTwin',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  icons: {
    apple: '/icons/icon-192.svg',
    icon:  '/icons/icon-192.svg',
  },
}

export const viewport: Viewport = {
  width:          'device-width',
  initialScale:   1,
  maximumScale:   1,
  viewportFit:    'cover',
  themeColor:     '#080808',
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Fetch active theme for server-side CSS variable hydration.
  // Runs on every request so theme is correct on first paint without a flash.
  let initialThemeId: string | null = null
  let initialAccent  = DEFAULT_ACCENT
  let initialBg      = DEFAULT_BG

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('active_theme_id')
        .eq('id', user.id)
        .single()

      if (profile?.active_theme_id) {
        initialThemeId = profile.active_theme_id
        const { data: theme } = await supabase
          .from('themes')
          .select('accent_hex, background_hex')
          .eq('id', profile.active_theme_id)
          .single()

        if (theme) {
          initialAccent = theme.accent_hex
          initialBg     = theme.background_hex
        }
      }
    }
  } catch {
    // Auth not ready (e.g. login page) — use defaults
  }

  return (
    <html
      lang="en"
      className={`${geist.variable} ${inter.variable} ${fraunces.variable}`}
    >
      <body className="bg-background text-white font-body antialiased">
        <Providers
          initialThemeId={initialThemeId}
          initialAccent={initialAccent}
          initialBg={initialBg}
        >
          {children}
        </Providers>
        <BottomNav />
        {process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID && (
          <Script
            src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
            defer
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  )
}
