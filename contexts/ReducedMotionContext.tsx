'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ReducedMotionContextValue {
  reducedMotion: boolean
  setReducedMotion: (val: boolean) => void
}

const ReducedMotionContext = createContext<ReducedMotionContextValue>({
  reducedMotion: false,
  setReducedMotion: () => {},
})

export function ReducedMotionProvider({ children }: { children: React.ReactNode }) {
  const [reducedMotion, setReducedMotionState] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // OS-level preference takes immediate effect
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotionState(mq.matches)

    // DB preference overrides OS if explicitly set to true
    async function syncFromDb() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('users')
        .select('reduced_motion')
        .eq('id', user.id)
        .maybeSingle()
      if (data?.reduced_motion) setReducedMotionState(true)
    }
    syncFromDb()

    const handler = (e: MediaQueryListEvent) => {
      if (!e.matches) setReducedMotionState(false)
      // Only auto-disable; DB setting still wins for enabling
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function setReducedMotion(val: boolean) {
    setReducedMotionState(val)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('users').update({ reduced_motion: val }).eq('id', user.id)
  }

  return (
    <ReducedMotionContext.Provider value={{ reducedMotion, setReducedMotion }}>
      {children}
    </ReducedMotionContext.Provider>
  )
}

export function useReducedMotion() {
  return useContext(ReducedMotionContext)
}
