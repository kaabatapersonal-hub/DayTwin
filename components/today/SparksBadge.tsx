'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient }                from '@/lib/supabase/client'

interface SparksBadgeProps {
  initialBalance: number
  userId:         string
}

/**
 * Displays the user's current Sparks balance with a live subscription.
 * The DB never allows client writes to sparks_balance; the Realtime event
 * fires when a server-side trigger updates the row via award_sparks().
 */
export function SparksBadge({ initialBalance, userId }: SparksBadgeProps) {
  const [balance, setBalance] = useState(initialBalance)
  const supabase = useRef(createClient()).current

  useEffect(() => {
    const channel = supabase
      .channel(`sparks-${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'users',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const nb = (payload.new as Record<string, unknown>).sparks_balance
          if (typeof nb === 'number') setBalance(nb)
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, userId])

  return (
    <div className="flex items-center gap-1 bg-white/[0.06] px-2.5 py-1 rounded-full">
      <span className="text-gold text-xs leading-none">⚡</span>
      <span className="text-xs font-body text-white/70 tabular-nums">{balance.toLocaleString()}</span>
    </div>
  )
}
