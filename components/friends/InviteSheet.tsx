'use client'

import { useState, useEffect } from 'react'

interface InviteSheetProps {
  onClose: () => void
}

/**
 * Bottom sheet for generating and sharing an invite link.
 * The token is fetched from the API on mount — one token per sheet open.
 * The link is valid for 7 days. When the recipient opens it, they're added
 * as an accepted friend (no pending step — invite was intentional).
 */
export function InviteSheet({ onClose }: InviteSheetProps) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [copied,    setCopied]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    async function generateToken() {
      try {
        const res = await fetch('/api/friends/invite', { method: 'POST' })
        if (!res.ok) throw new Error('Failed to generate invite')
        const { token } = await res.json() as { token: string }
        setInviteUrl(`${window.location.origin}/invite/${token}`)
      } catch {
        setError('Could not generate invite link. Try again.')
      } finally {
        setLoading(false)
      }
    }
    generateToken()
  }, [])

  async function handleCopy() {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable — select the text instead
    }
  }

  async function handleShare() {
    if (!inviteUrl) return
    if (navigator.share) {
      await navigator.share({ title: 'Join me on DayTwin', url: inviteUrl }).catch(() => {})
    } else {
      await handleCopy()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <button onClick={onClose} className="flex-1 bg-black/50" aria-label="Close" />

      <div className="bg-[#141414] rounded-t-3xl px-5 pt-5 pb-safe-bottom pb-8">
        <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />

        <h2 className="font-heading text-lg font-semibold text-white mb-1">Invite a friend</h2>
        <p className="text-xs font-body text-white/35 mb-6">Link expires in 7 days</p>

        {loading && (
          <div className="h-12 bg-white/[0.04] rounded-2xl animate-pulse mb-4" />
        )}

        {error && (
          <p className="text-sm font-body text-red-400 text-center py-4">{error}</p>
        )}

        {inviteUrl && (
          <>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3.5 mb-4">
              <p className="text-xs font-body text-white/50 break-all leading-relaxed">{inviteUrl}</p>
            </div>

            <button
              onClick={handleShare}
              className="w-full py-4 rounded-2xl bg-teal text-background font-body font-semibold text-base active:scale-[0.98] transition-transform mb-3"
            >
              {copied ? 'Copied!' : 'Share Invite Link'}
            </button>

            <button
              onClick={handleCopy}
              className="w-full py-4 rounded-2xl bg-white/[0.06] border border-white/10 text-white/70 font-body font-medium text-base active:scale-[0.98] transition-transform"
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
