'use client'

import { useState } from 'react'

interface SendSparksSheetProps {
  recipientId:   string
  recipientName: string
  senderBalance: number
  onClose:       () => void
  onSent:        (newBalance: number) => void
}

const PRESET_AMOUNTS = [10, 25, 50, 100]

export function SendSparksSheet({
  recipientId, recipientName, senderBalance, onClose, onSent,
}: SendSparksSheetProps) {
  const [amount,    setAmount]    = useState<number | ''>('')
  const [message,   setMessage]   = useState('')
  const [sending,   setSending]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const parsed  = typeof amount === 'number' ? amount : 0
  const canSend = parsed >= 1 && parsed <= 500 && parsed <= senderBalance && !sending

  async function handleSend() {
    if (!canSend) return
    setSending(true)
    setError(null)
    try {
      const res  = await fetch('/api/sparks/gift', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          recipient_id: recipientId,
          amount:       parsed,
          message:      message.trim() || undefined,
        }),
      })
      const data = await res.json() as { success?: boolean; new_balance?: number; error?: string }
      if (!data.success) {
        setError(data.error ?? 'Gift failed')
        return
      }
      onSent(data.new_balance ?? senderBalance - parsed)
    } catch {
      setError('Something went wrong')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <button onClick={onClose} className="flex-1 bg-black/50" aria-label="Close" />

      <div className="bg-[#141414] rounded-t-3xl px-5 pt-5 pb-safe-bottom pb-8">
        <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-6" />

        <p className="text-xs font-body text-white/35 uppercase tracking-widest mb-1">Send Sparks</p>
        <p className="text-xl font-heading font-bold text-white mb-1">
          Gift to {recipientName}
        </p>
        <p className="text-xs font-body text-white/35 mb-6">
          Your balance: ⚡ {senderBalance.toLocaleString()}
        </p>

        {/* Preset amounts */}
        <div className="flex gap-2 mb-4">
          {PRESET_AMOUNTS.map(n => (
            <button
              key={n}
              onClick={() => setAmount(n)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-body font-medium transition-all ${
                amount === n
                  ? 'bg-teal text-background'
                  : 'bg-white/[0.06] text-white/70'
              }`}
            >
              ⚡{n}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="mb-4">
          <input
            type="number"
            min={1}
            max={500}
            placeholder="Custom amount (1–500)"
            value={amount}
            onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full bg-white/[0.06] rounded-xl px-4 py-3 text-sm font-body text-white placeholder:text-white/25 outline-none focus:ring-1 focus:ring-teal/50"
          />
        </div>

        {/* Optional message */}
        <div className="mb-6">
          <input
            type="text"
            maxLength={120}
            placeholder="Add a message (optional)"
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="w-full bg-white/[0.06] rounded-xl px-4 py-3 text-sm font-body text-white placeholder:text-white/25 outline-none focus:ring-1 focus:ring-teal/50"
          />
        </div>

        {error && (
          <p className="text-sm font-body text-red-400 text-center mb-4">{error}</p>
        )}

        {parsed > senderBalance && parsed > 0 && (
          <p className="text-xs font-body text-red-400/80 text-center mb-4">
            You need {parsed - senderBalance} more Sparks
          </p>
        )}

        <button
          onClick={handleSend}
          disabled={!canSend}
          className="w-full py-4 rounded-2xl bg-teal text-background font-body font-semibold text-base disabled:opacity-40 active:scale-[0.98] transition-transform"
        >
          {sending ? 'Sending…' : parsed > 0 ? `Send ⚡ ${parsed}` : 'Send Sparks'}
        </button>
      </div>
    </div>
  )
}
