'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { submitReflection } from '@/lib/reflections'
import type { Reflection, NewReflection } from '@/types'

interface UseReflectionReturn {
  reflection: Reflection | null
  submit:     (payload: NewReflection) => Promise<void>
  error:      string | null
}

/**
 * Manages tonight's reflection.
 * On submit: writes to Supabase and updates local state so the card
 * switches immediately to the "Reflected ✓" confirmation.
 */
export function useReflection(
  initialReflection: Reflection | null,
  date:              string,
): UseReflectionReturn {
  const [reflection, setReflection] = useState<Reflection | null>(initialReflection)
  const [error, setError]           = useState<string | null>(null)
  const supabase                     = createClient()

  const submit = useCallback(async (payload: NewReflection) => {
    setError(null)
    try {
      const saved = await submitReflection(supabase, date, payload)
      setReflection(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reflection')
    }
  }, [supabase, date])

  return { reflection, submit, error }
}
