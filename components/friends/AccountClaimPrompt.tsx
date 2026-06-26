'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { linkEmail, linkGoogle } from '@/lib/auth'

export function AccountClaimPrompt() {
  const [step,        setStep]        = useState<'username' | 'email' | 'success'>('username')
  const [username,    setUsername]    = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email,       setEmail]       = useState('')
  const [error,       setError]       = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)

  const usernameValid = /^[a-z0-9_]{3,20}$/.test(username)
  const charCount     = username.length

  async function saveProfile(): Promise<boolean> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No session — please refresh.')

    const { error: updateError } = await supabase
      .from('users')
      .update({
        username,
        display_name: displayName.trim() || username,
        is_anonymous: false,
      })
      .eq('id', user.id)

    if (updateError) {
      if (updateError.code === '23505') throw new Error('That username is already taken. Try another one.')
      throw new Error(updateError.message)
    }
    return true
  }

  async function handleContinue() {
    if (!usernameValid) return
    setSaving(true)
    setError(null)
    try {
      await saveProfile()
      setStep('email')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleGoogle() {
    if (!usernameValid) return
    setSaving(true)
    setError(null)
    try {
      await saveProfile()
      await linkGoogle('/friends')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Google')
      setSaving(false)
    }
  }

  async function handleEmail() {
    if (!email) return
    setSaving(true)
    setError(null)
    try {
      await linkEmail(email)
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send link')
    } finally {
      setSaving(false)
    }
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-teal/15 flex items-center justify-center mb-6">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.71h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.09 6.09l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </div>
        <h2 className="font-heading text-2xl font-bold text-white mb-3">Check your email</h2>
        <p className="text-sm font-body text-white/50 leading-relaxed max-w-xs">
          We sent a sign-in link to{' '}
          <span className="text-white/80">{email}</span>.
          Tap it to finish, then come back to add friends.
        </p>
      </div>
    )
  }

  // ── Step 2: email ────────────────────────────────────────────────────────────
  if (step === 'email') {
    return (
      <div className="flex-1 flex flex-col px-6 pt-6">
        {/* back */}
        <button
          onClick={() => { setStep('username'); setError(null) }}
          className="flex items-center gap-1.5 text-white/35 font-body text-sm mb-8 self-start active:text-white/60 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>

        {/* step indicator */}
        <div className="flex gap-1.5 mb-6">
          <div className="h-1 w-6 rounded-full bg-teal/40" />
          <div className="h-1 w-6 rounded-full bg-teal" />
        </div>

        <h2 className="font-heading text-2xl font-bold text-white mb-1">Add a recovery email</h2>
        <p className="text-sm font-body text-white/45 mb-8 leading-relaxed">
          So you can sign in from any device. We&apos;ll send a one-tap link — no password needed.
        </p>

        <label className="text-xs font-body text-white/40 uppercase tracking-widest mb-2 block">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(null) }}
          onKeyDown={e => e.key === 'Enter' && handleEmail()}
          placeholder="you@example.com"
          autoFocus
          className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3.5 text-white font-body text-base placeholder:text-white/20 mb-6 focus:outline-none focus:border-teal/40 transition-colors"
        />

        {error && <p className="text-xs text-red-400 font-body mb-4">{error}</p>}

        <button
          onClick={handleEmail}
          disabled={!email.includes('@') || saving}
          className="w-full py-4 rounded-2xl bg-teal text-background font-body font-semibold text-base disabled:opacity-40 active:scale-[0.98] transition-transform mb-3"
        >
          {saving ? 'Sending…' : 'Send sign-in link'}
        </button>

        <button
          onClick={() => setStep('username')}
          className="w-full py-3 text-white/30 font-body text-sm active:text-white/50 transition-colors"
        >
          Skip for now
        </button>
      </div>
    )
  }

  // ── Step 1: username ─────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col px-6 pt-6">
      {/* step indicator */}
      <div className="flex gap-1.5 mb-8">
        <div className="h-1 w-6 rounded-full bg-teal" />
        <div className="h-1 w-6 rounded-full bg-white/15" />
      </div>

      <h2 className="font-heading text-2xl font-bold text-white mb-2">Choose a username</h2>
      <p className="text-sm font-body text-white/45 mb-8 leading-relaxed">
        So friends can find you. Your habits, tasks, and streaks stay exactly as they are.
      </p>

      {/* Username with @ prefix */}
      <label className="text-xs font-body text-white/40 uppercase tracking-widest mb-2 block">
        Username
      </label>
      <div className="relative mb-1.5">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-body text-base select-none">
          @
        </span>
        <input
          type="text"
          value={username}
          onChange={e => {
            setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))
            setError(null)
          }}
          onKeyDown={e => e.key === 'Enter' && usernameValid && handleContinue()}
          placeholder="your_username"
          maxLength={20}
          autoFocus
          className="w-full bg-white/[0.06] border border-white/10 rounded-2xl pl-8 pr-14 py-3.5 text-white font-body text-base placeholder:text-white/20 focus:outline-none focus:border-teal/40 transition-colors"
        />
        <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-body tabular-nums ${
          charCount >= 18 ? 'text-amber-400/70' : 'text-white/20'
        }`}>
          {charCount}/20
        </span>
      </div>
      <p className="text-[11px] font-body text-white/25 mb-6">
        3–20 characters · letters, numbers, underscores
      </p>

      {/* Display name */}
      <label className="text-xs font-body text-white/40 uppercase tracking-widest mb-2 block">
        Display name <span className="normal-case text-white/20">(optional)</span>
      </label>
      <input
        type="text"
        value={displayName}
        onChange={e => { setDisplayName(e.target.value); setError(null) }}
        placeholder="How friends see you"
        maxLength={40}
        className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3.5 text-white font-body text-base placeholder:text-white/20 mb-6 focus:outline-none focus:border-teal/40 transition-colors"
      />

      {error && <p className="text-xs text-red-400 font-body mb-4">{error}</p>}

      {/* Primary CTA */}
      <button
        onClick={handleContinue}
        disabled={!usernameValid || saving}
        className="w-full py-4 rounded-2xl bg-teal text-background font-body font-semibold text-base disabled:opacity-40 active:scale-[0.98] transition-transform mb-3"
      >
        {saving ? 'Saving…' : 'Continue'}
      </button>

      {/* Google as alternative */}
      <button
        onClick={handleGoogle}
        disabled={!usernameValid || saving}
        className="w-full py-4 rounded-2xl bg-white/[0.06] border border-white/10 text-white font-body font-medium text-base disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-3 mb-4"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      {/* Escape hatch */}
      <button
        onClick={() => window.history.back()}
        className="w-full py-2 text-white/20 font-body text-sm active:text-white/40 transition-colors"
      >
        Maybe later
      </button>
    </div>
  )
}
