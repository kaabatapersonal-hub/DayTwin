'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Intention } from '@/types'

interface IntentionCardProps {
  intention:   Intention | null
  showPrompt:  boolean
  onSave:      (text: string) => Promise<void>
  onDismiss:   () => void
}

/**
 * Morning intention card at the top of Today.
 *
 * Two states:
 * - If today's intention is already set: read-only display.
 * - If not set and not dismissed: shows the "What's the one thing?" prompt.
 *
 * Dismissing without answering hides the card for the rest of today
 * (tracked in localStorage by useIntention — no DB write for a non-answer).
 */
export function IntentionCard({ intention, showPrompt, onSave, onDismiss }: IntentionCardProps) {
  const [text, setText]     = useState('')
  const [saving, setSaving] = useState(false)

  // Already set today — read-only
  if (intention) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 p-4 rounded-2xl border border-teal/20 bg-teal/5"
      >
        <p className="text-xs text-teal/60 font-body mb-1">Today&apos;s focus</p>
        <p className="text-white text-sm font-body">{intention.text}</p>
      </motion.div>
    )
  }

  if (!showPrompt) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    setSaving(true)
    await onSave(trimmed)
    setSaving(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="mb-4 p-4 rounded-2xl border border-white/10 bg-white/5"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-white/70 font-body leading-snug">
          What&apos;s the one thing that would make today count?
        </p>
        <button
          onClick={onDismiss}
          className="ml-3 mt-0.5 text-white/25 hover:text-white/50 transition-colors flex-shrink-0 text-xl leading-none"
          aria-label="Dismiss intention prompt"
        >
          ×
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Finish the homepage..."
          className="flex-1 bg-white/10 text-white placeholder-white/25 rounded-xl px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-1 focus:ring-teal/40"
          autoFocus
        />
        <button
          type="submit"
          disabled={!text.trim() || saving}
          className="px-4 py-2.5 bg-teal text-background rounded-xl text-sm font-body font-medium disabled:opacity-40 transition-opacity active:scale-95"
        >
          Set
        </button>
      </form>
    </motion.div>
  )
}
