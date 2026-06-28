'use client'

import { useState, useCallback } from 'react'
import Link                        from 'next/link'
import { AnimatePresence }         from 'framer-motion'
import type { FriendView, FriendRequest } from '@/types'
import { AccountClaimPrompt }    from './AccountClaimPrompt'
import { FriendList }             from './FriendList'
import { FriendRequestList }      from './FriendRequestList'
import { AddFriendSheet }         from './AddFriendSheet'
import { InviteSheet }            from './InviteSheet'
import { FriendProfile }          from './FriendProfile'

interface FriendsScreenProps {
  isAnonymous:      boolean
  initialFriends:   FriendView[]
  initialRequests:  FriendRequest[]
}

/**
 * Root of the Friends tab.
 *
 * Anonymous users see the AccountClaimPrompt — no friends UI is shown until
 * they have a username, since they can't be found or added.
 *
 * Claimed users see: pending requests, friends list, Add/Invite action buttons.
 *
 * Refresh is triggered after any mutating action (accept, decline, remove, block,
 * send request) by re-fetching via the API so the list stays in sync without
 * a full page reload. This keeps the UX snappy while preserving server-side
 * data integrity.
 */
export function FriendsScreen({
  isAnonymous, initialFriends, initialRequests,
}: FriendsScreenProps) {
  const [friends,    setFriends]    = useState<FriendView[]>(initialFriends)
  const [requests,   setRequests]   = useState<FriendRequest[]>(initialRequests)
  const [refreshing, setRefreshing] = useState(false)

  const [showAddSheet,     setShowAddSheet]     = useState(false)
  const [showInviteSheet,  setShowInviteSheet]  = useState(false)
  const [openProfile,      setOpenProfile]      = useState<FriendView | null>(null)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        fetch('/api/friends/list'),
        fetch('/api/friends/requests'),
      ])
      if (friendsRes.ok)   setFriends(await friendsRes.json() as FriendView[])
      if (requestsRes.ok)  setRequests(await requestsRes.json() as FriendRequest[])
    } finally {
      setRefreshing(false)
    }
  }, [])

  if (isAnonymous) {
    return (
      <div className="h-screen bg-background text-white flex flex-col">
        <header className="page-header pt-safe-top px-5 pb-4 bg-background">
          <h1 className="font-heading text-2xl font-bold text-white">Friends</h1>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-y-none">
          <AccountClaimPrompt />
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background text-white flex flex-col">
      <header className="page-header pt-safe-top px-5 pb-3 bg-background flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Friends</h1>
          {refreshing && (
            <p className="text-[10px] font-body text-white/25">Refreshing…</p>
          )}
        </div>

        <div className="flex gap-2">
          {/* Invite link button */}
          <button
            onClick={() => setShowInviteSheet(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] text-white/60 font-body text-xs"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            Invite
          </button>

          {/* Add by username button */}
          <button
            onClick={() => setShowAddSheet(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal text-background font-body font-semibold text-xs"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5"  y1="12" x2="19" y2="12"/>
            </svg>
            Add
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-y-none pb-32">
        {/* Challenges shortcut */}
        <Link
          href="/friends/challenges"
          className="mx-4 mt-3 mb-1 flex items-center justify-between px-4 py-3 bg-white/[0.04] border border-white/[0.06] rounded-2xl active:bg-white/[0.07] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">⚡</span>
            <span className="text-sm font-body font-medium text-white/70">Challenges</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" className="text-white/25">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </Link>

        {requests.length > 0 && (
          <FriendRequestList requests={requests} onRefresh={refresh} />
        )}

        {friends.length > 0 && (
          <section className="mt-4">
            <h2 className="text-xs font-body text-white/40 uppercase tracking-widest px-4 mb-1">
              Friends · {friends.length}
            </h2>
            <FriendList friends={friends} onOpenProfile={setOpenProfile} />
          </section>
        )}

        {friends.length === 0 && requests.length === 0 && (
          <div className="flex flex-col items-center text-center px-8 pt-20">
            <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p className="text-white font-heading text-lg font-semibold mb-2">No friends yet</p>
            <p className="text-sm font-body text-white/35 leading-relaxed">
              Add someone by username or share your invite link.
            </p>
          </div>
        )}
      </main>

      {/* Sheets & overlays */}
      <AnimatePresence>
        {showAddSheet && (
          <AddFriendSheet
            key="add-friend"
            onClose={() => setShowAddSheet(false)}
            onSent={refresh}
          />
        )}
        {showInviteSheet && (
          <InviteSheet
            key="invite"
            onClose={() => setShowInviteSheet(false)}
          />
        )}
      </AnimatePresence>

      {openProfile && (
        <FriendProfile
          friend={openProfile}
          onClose={() => setOpenProfile(null)}
          onRemoved={() => { setOpenProfile(null); refresh() }}
        />
      )}
    </div>
  )
}
