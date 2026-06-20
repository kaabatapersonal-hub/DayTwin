import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Inter, Fraunces } from 'next/font/google'
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
  title: 'DayTwin',
  description: 'Your personal operating system',
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
      </body>
    </html>
  )
}
