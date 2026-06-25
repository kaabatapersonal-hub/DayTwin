'use client'

import { useState } from 'react'
import { AvatarInitials } from './FriendList'

interface AddFriendSheetProps {
  onClose:   () => void
  onSent:    () => void    // called after a request is successfully sent so parent can refresh
}

type SearchState =
  | { phase: 'idle' }
  | { phase: 'searching' }
  | { phase: 'not_found' }
  | { phase: 'claim_required' }
  | { phase: 'found'; user_id: string; display_name: string | null; username: string; avatar_url: string | null; friendship_status: string | null }

/**
 * Bottom sheet for searching a user by exact username and sending a friend request.
 * Search is exact-match only — no partial matches, no browsable directory.
 * Two-step: first search, then confirm with "Send Request".
 */
export function AddFriendSheet({ onClose, onSent }: AddFriendSheetProps) {
  const [input,   setInput]   = useState('')
  const [state,   setState]   = useState<SearchState>({ phase: 'idle' })
  const [sending, setSending] = useState(false)
  const [sentTo,  setSentTo]  = useState<string | null>(null)

  async function handleSearch() {
    const username = input.trim().toLowerCase()
    if (!username) return
    setState({ phase: 'searching' })
    try {
      const res = await fetch(`/api/friends/search?username=${encodeURIComponent(username)}`)
      if (res.status === 403) {
        const body = await res.json() as { error?: string }
        if (body.error === 'claim_account') { setState({ phase: 'claim_required' }); return }
      }
      if (res.status === 404) { setState({ phase: 'not_found' }); return }
      if (!res.ok) { setState({ phase: 'not_found' }); return }
      const data = await res.json() as {
        user_id: string; display_name: string | null; username: string;
        avatar_url: string | null; friendship_status: string | null
      }
      setState({ phase: 'found', ...data })
    } catch {
      setState({ phase: 'not_found' })
    }
  }

  async function handleSend() {
    if (state.phase !== 'found') return
    setSending(true)
    try {
      const res = await fetch('/api/friends/request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ addressee_id: state.user_id }),
      })
      if (res.ok || res.status === 409) {
        setSentTo(state.username)
        onSent()
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <button onClick={onClose} className="flex-1 bg-black/50" aria-label="Close" />

      <div className="bg-[#141414] rounded-t-3xl px-5 pt-5 pb-safe-bottom pb-8">
        <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />

        <h2 className="font-heading text-lg font-semibold text-white mb-1">Add by username</h2>
        <p className="text-xs font-body text-white/35 mb-5">Exact match only</p>

        {sentTo ? (
          <div className="py-8 text-center">
            <p className="text-sm font-body text-white/60">
              Request sent to <span className="text-teal">@{sentTo}</span>
            </p>
            <button
              onClick={onClose}
              className="mt-6 text-xs font-body text-white/30 underline underline-offset-2"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={input}
                onChange={e => { setInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setState({ phase: 'idle' }) }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="username"
                className="flex-1 bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3 text-white font-body text-base placeholder:text-white/20 focus:outline-none focus:border-teal/40"
              />
              <button
                onClick={handleSearch}
                disabled={!input.trim() || state.phase === 'searching'}
                className="px-5 rounded-2xl bg-teal text-background font-body font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                {state.phase === 'searching' ? '…' : 'Search'}
              </button>
            </div>

            {state.phase === 'not_found' && (
              <p className="text-sm font-body text-white/35 py-4 text-center">
                No user found with that username
              </p>
            )}

            {state.phase === 'claim_required' && (
              <div className="py-4 px-1">
                <p className="text-sm font-body text-white/50 mb-1">Set a username first</p>
                <p className="text-xs font-body text-white/30 leading-relaxed">
                  Go to You → set your username so people can find you too, then come back to add friends.
                </p>
              </div>
            )}

            {state.phase === 'found' && (
              <div className="flex items-center gap-3 p-4 bg-white/[0.04] rounded-2xl">
                <AvatarInitials
                  name={state.display_name ?? state.username}
                  userId={state.user_id}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-medium text-white">{state.display_name ?? state.username}</p>
                  <p className="text-[11px] font-body text-white/35">@{state.username}</p>
                </div>

                {state.friendship_status === 'accepted' && (
                  <span className="text-xs font-body text-teal">Friends</span>
                )}
                {state.friendship_status === 'pending' && (
                  <span className="text-xs font-body text-white/30">Pending</span>
                )}
                {!state.friendship_status && (
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="px-4 py-2 rounded-xl bg-teal text-background font-body font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform"
                  >
                    {sending ? '…' : 'Add'}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
