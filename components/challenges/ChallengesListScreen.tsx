'use client'

import { useState }                       from 'react'
import { useRouter }                       from 'next/navigation'
import type { ChallengeWithParticipants }  from '@/types'
import { ChallengeCard }                   from '@/components/challenges/ChallengeCard'

interface ChallengesListScreenProps {
  initialActive: ChallengeWithParticipants[]
  initialPast:   ChallengeWithParticipants[]
  myUserId:      string
}

export function ChallengesListScreen({
  initialActive, initialPast, myUserId,
}: ChallengesListScreenProps) {
  const router = useRouter()
  const [tab, setTab] = useState<'active' | 'past'>('active')

  const items = tab === 'active' ? initialActive : initialPast

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-white/40 text-sm font-body mb-1 active:text-white/60 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Friends
          </button>
          <h1 className="font-heading text-2xl font-bold text-white">Challenges</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 flex gap-2 mb-5">
        {(['active', 'past'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl font-body text-sm font-medium transition-colors capitalize ${
              tab === t
                ? 'bg-teal text-[#080808]'
                : 'bg-white/[0.05] text-white/40'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 px-5 pb-28 space-y-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center px-8">
            <p className="text-sm font-body text-white/30">
              {tab === 'active'
                ? 'No active challenges yet. Challenge a friend from their profile.'
                : 'No past challenges yet.'}
            </p>
          </div>
        ) : (
          items.map(item => (
            <ChallengeCard key={item.challenge.id} item={item} myUserId={myUserId} />
          ))
        )}
      </div>
    </div>
  )
}
