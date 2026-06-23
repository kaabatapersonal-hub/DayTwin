import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Inter, Fraunces } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers }  from './providers'
import { BottomNav }  from '@/components/nav/BottomNav'

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
    capable:       true,
    statusBarStyle: 'black-translucent',
    title:         'DayTwin',
  },
}

export const viewport: Viewport = {
  width:          'device-width',
  initialScale:   1,
  viewportFit:    'cover',
  themeColor:     '#080808',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${inter.variable} ${fraunces.variable}`}
    >
      <body className="bg-background text-white font-body antialiased">
        <Providers>{children}</Providers>
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
