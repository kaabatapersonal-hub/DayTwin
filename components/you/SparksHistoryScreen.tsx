'use client'

import { useState, useCallback } from 'react'
import { reasonLabel }           from '@/lib/sparks'
import type { SparkTransaction } from '@/types'

interface SparksHistoryScreenProps {
  initialItems: SparkTransaction[]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour:   'numeric',
    minute: '2-digit',
  })
}

/** Groups transactions by local date string for section headers. */
function groupByDate(items: SparkTransaction[]): Array<{ date: string; rows: SparkTransaction[] }> {
  const groups: Record<string, SparkTransaction[]> = {}
  for (const item of items) {
    const d = item.created_at.slice(0, 10)
    ;(groups[d] ??= []).push(item)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, rows]) => ({ date, rows }))
}

export function SparksHistoryScreen({ initialItems }: SparksHistoryScreenProps) {
  const [items,    setItems]    = useState<SparkTransaction[]>(initialItems)
  const [loading,  setLoading]  = useState(false)
  const [hasMore,  setHasMore]  = useState(initialItems.length === 20)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const oldest  = items[items.length - 1]?.created_at
      const url     = oldest ? `/api/sparks/history?cursor=${encodeURIComponent(oldest)}` : '/api/sparks/history'
      const res     = await fetch(url)
      if (!res.ok) return
      const next    = await res.json() as SparkTransaction[]
      setItems(prev => [...prev, ...next])
      if (next.length < 20) setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [items, loading, hasMore])

  const groups = groupByDate(items)

  return (
    <div className="min-h-screen bg-[#080808] pb-32">
      {/* Header */}
      <div className="pt-safe-top px-5 pb-5 flex items-center gap-3">
        <a
          href="/you"
          className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0"
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </a>
        <div>
          <h1 className="text-xl font-heading font-bold text-white">Sparks History</h1>
          <p className="text-xs font-body text-white/35 mt-0.5">All your earned and reversed Sparks</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm font-body text-white/30 text-center mt-16 px-8">
          No Sparks earned yet — complete tasks and habits to start earning.
        </p>
      ) : (
        <div className="px-4 space-y-6">
          {groups.map(group => (
            <section key={group.date}>
              <p className="text-xs font-body text-white/30 uppercase tracking-widest mb-3">
                {formatDate(group.date + 'T00:00:00')}
              </p>

              <div className="bg-white/[0.04] rounded-3xl overflow-hidden divide-y divide-white/[0.05]">
                {group.rows.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="text-sm font-body text-white truncate">
                        {reasonLabel(tx.reason)}
                      </p>
                      <p className="text-xs font-body text-white/30 mt-0.5">
                        {formatTime(tx.created_at)}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      <span className="text-gold text-xs leading-none">⚡</span>
                      <span className={`text-sm font-body tabular-nums font-medium ${
                        tx.amount > 0 ? 'text-teal' : 'text-white/40'
                      }`}>
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-white/[0.04] text-white/40 font-body text-sm disabled:opacity-40 active:bg-white/[0.06] transition-colors"
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
