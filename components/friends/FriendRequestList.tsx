'use client'

import { useState }         from 'react'
import type { FriendRequest } from '@/types'
import { AvatarInitials }    from './FriendList'

interface FriendRequestListProps {
  requests:  FriendRequest[]
  onRefresh: () => void   // called after accept/decline so parent re-fetches
}

/**
 * Shows incoming and outgoing pending friend requests.
 * Incoming: Accept + Decline buttons.
 * Outgoing: "Pending" label with no action (can't cancel in V1).
 */
export function FriendRequestList({ requests, onRefresh }: FriendRequestListProps) {
  const [loading, setLoading] = useState<string | null>(null)   // friendship_id being acted on
  const [errors,  setErrors]  = useState<Record<string, string>>({})

  if (!requests.length) return null

  async function respond(friendshipId: string, action: 'accept' | 'decline') {
    setLoading(friendshipId)
    setErrors(prev => ({ ...prev, [friendshipId]: '' }))
    try {
      const res = await fetch('/api/friends/respond', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ friendship_id: friendshipId, action }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Failed')
      }
      onRefresh()
    } catch (err) {
      setErrors(prev => ({ ...prev, [friendshipId]: err instanceof Error ? err.message : 'Error' }))
    } finally {
      setLoading(null)
    }
  }

  const incoming = requests.filter(r => r.direction === 'incoming')
  const outgoing = requests.filter(r => r.direction === 'outgoing')

  return (
    <div className="mt-4 space-y-4">
      {incoming.length > 0 && (
        <section>
          <h2 className="text-xs font-body text-white/40 uppercase tracking-widest px-4 mb-2">
            Friend requests
          </h2>
          <div className="space-y-1">
            {incoming.map(req => (
              <div key={req.friendship_id} className="flex items-center gap-3 px-4 py-3">
                <AvatarInitials name={req.display_name ?? req.username ?? '?'} userId={req.requester_id} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-medium text-white truncate">
                    {req.display_name ?? req.username}
                  </p>
                  <p className="text-[11px] font-body text-white/30">@{req.username}</p>
                  {errors[req.friendship_id] && (
                    <p className="text-[11px] text-red-400 mt-0.5">{errors[req.friendship_id]}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => respond(req.friendship_id, 'decline')}
                    disabled={loading === req.friendship_id}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.06] text-white/45 font-body text-xs disabled:opacity-40"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => respond(req.friendship_id, 'accept')}
                    disabled={loading === req.friendship_id}
                    className="px-3 py-1.5 rounded-xl bg-teal text-background font-body font-medium text-xs disabled:opacity-40"
                  >
                    {loading === req.friendship_id ? '…' : 'Accept'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {outgoing.length > 0 && (
        <section>
          <h2 className="text-xs font-body text-white/40 uppercase tracking-widest px-4 mb-2">
            Sent
          </h2>
          <div className="space-y-1">
            {outgoing.map(req => (
              <div key={req.friendship_id} className="flex items-center gap-3 px-4 py-3">
                <AvatarInitials name={req.display_name ?? req.username ?? '?'} userId={req.addressee_id} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-medium text-white truncate">
                    {req.display_name ?? req.username}
                  </p>
                  <p className="text-[11px] font-body text-white/30">@{req.username}</p>
                </div>
                <span className="text-[11px] font-body text-white/25 bg-white/[0.04] px-2.5 py-1 rounded-lg">
                  Pending
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
