'use client'

import { useEffect } from 'react'
import { ensureAnonymousSession } from '@/lib/auth'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ensureAnonymousSession()
  }, [])

  return <>{children}</>
}
