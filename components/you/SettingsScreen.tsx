'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { createClient }            from '@/lib/supabase/client'
import { useReducedMotion }        from '@/contexts/ReducedMotionContext'
import type { UserFullProfile, UserSettings, TonePreference } from '@/types'

// ── Tone example copy ─────────────────────────────────────────────────────────

const TONE_CARDS: Array<{
  tone:    TonePreference
  label:   string
  example: string
}> = [
  {
    tone:    'warm',
    label:   'Warm',
    example: "Morning. You logged 2.5h of focus this week. Today’s priority: Deep work session.",
  },
  {
    tone:    'direct',
    label:   'Direct',
    example: '2.5h focus this week. Priority: Deep work session.',
  },
  {
    tone:    'hype',
    label:   'Hype',
    example: "Let's go! 2.5h of focus already — you're on fire. Today: Deep work session. Make it happen.",
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-xs font-body text-white/30 uppercase tracking-widest px-4 mb-2">
      {label}
    </p>
  )
}

function SettingRow({
  label,
  sub,
  right,
  onPress,
}: {
  label:    string
  sub?:     string
  right?:   React.ReactNode
  onPress?: () => void
}) {
  return (
    <button
      className="w-full flex items-center justify-between px-4 py-3.5 active:bg-white/[0.03] transition-colors"
      onClick={onPress}
      disabled={!onPress}
    >
      <div className="text-left">
        <p className="text-sm font-body text-white">{label}</p>
        {sub && <p className="text-xs font-body text-white/35 mt-0.5">{sub}</p>}
      </div>
      {right}
    </button>
  )
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={e => { e.stopPropagation(); onToggle() }}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
        on ? 'bg-teal' : 'bg-white/15'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
          on ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function Divider() {
  return <div className="h-px bg-white/[0.06] mx-4" />
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/[0.04] rounded-2xl overflow-hidden border border-white/[0.05] mx-4 ${className}`}>
      {children}
    </div>
  )
}

// ── Profile section ───────────────────────────────────────────────────────────

function ProfileSection({ profile }: { profile: UserFullProfile }) {
  const supabase = createClient()
  const [displayName,   setDisplayName]   = useState(profile.display_name   ?? '')
  const [preferredName, setPreferredName] = useState(profile.preferred_name ?? '')
  const [username,      setUsername]      = useState(profile.username        ?? '')
  const [saving, setSaving]               = useState(false)
  const [saved,  setSaved]                = useState(false)
  const [error,  setError]                = useState<string | null>(null)

  // 30-day username edit lock
  const usernameLockedUntil = profile.username_changed_at
    ? new Date(new Date(profile.username_changed_at).getTime() + 30 * 24 * 60 * 60 * 1000)
    : null
  const usernameLocked = usernameLockedUntil ? usernameLockedUntil > new Date() : false
  const unlockDateLabel = usernameLockedUntil
    ? usernameLockedUntil.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  async function handleSave() {
    setSaving(true)
    setError(null)
    const updates: Record<string, string | null> = {
      display_name:   displayName.trim()   || null,
      preferred_name: preferredName.trim() || null,
    }
    if (!usernameLocked && username.trim()) {
      const slug = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
      updates.username             = slug
      updates.username_changed_at  = new Date().toISOString()
    }
    const { error: err } = await supabase
      .from('users')
      .update(updates)
      .eq('id', profile.id)

    setSaving(false)
    if (err) { setError(err.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const initials = (profile.display_name ?? profile.username ?? '?')
    .slice(0, 2).toUpperCase()

  // Deterministic avatar colour from user id
  const hue = profile.id
    ? parseInt(profile.id.replace(/-/g, '').slice(0, 8), 16) % 360
    : 180

  return (
    <div className="mb-6">
      <div className="flex items-center gap-4 px-4 mb-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `hsl(${hue},40%,22%)` }}
        >
          <span className="text-xl font-heading font-bold" style={{ color: `hsl(${hue},60%,70%)` }}>
            {initials}
          </span>
        </div>
        <div>
          <p className="text-lg font-heading font-semibold text-white leading-tight">
            {profile.display_name ?? 'Set your name'}
          </p>
          {profile.username && (
            <p className="text-xs font-body text-white/40">@{profile.username}</p>
          )}
          {profile.is_anonymous && (
            <span className="inline-block mt-1 text-[10px] font-body text-gold/70 bg-gold/10 px-2 py-0.5 rounded-full">
              Guest account
            </span>
          )}
        </div>
      </div>

      <Card>
        <div className="px-4 pt-4 pb-1 space-y-3">
          <div>
            <label className="text-[10px] font-body text-white/30 uppercase tracking-widest block mb-1">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="How others see you"
              className="w-full bg-transparent text-sm font-body text-white placeholder-white/20 outline-none border-b border-white/[0.08] pb-2 focus:border-teal/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-body text-white/30 uppercase tracking-widest block mb-1">
              Preferred name
            </label>
            <input
              type="text"
              value={preferredName}
              onChange={e => setPreferredName(e.target.value)}
              placeholder="How the coach addresses you"
              className="w-full bg-transparent text-sm font-body text-white placeholder-white/20 outline-none border-b border-white/[0.08] pb-2 focus:border-teal/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-body text-white/30 uppercase tracking-widest block mb-1">
              Username
              {usernameLocked && (
                <span className="ml-2 normal-case text-white/20">
                  · editable from {unlockDateLabel}
                </span>
              )}
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={usernameLocked}
              placeholder="your_username"
              className="w-full bg-transparent text-sm font-body text-white placeholder-white/20 outline-none border-b border-white/[0.08] pb-2 focus:border-teal/50 transition-colors disabled:opacity-30"
            />
          </div>
        </div>

        {error && (
          <p className="px-4 pt-2 text-xs text-red-400 font-body">{error}</p>
        )}

        <div className="px-4 py-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-teal/15 border border-teal/25 text-teal text-sm font-body font-medium active:bg-teal/20 transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save profile'}
          </button>
        </div>
      </Card>
    </div>
  )
}

// ── Account claim card (anonymous users only) ─────────────────────────────────

function ClaimAccountCard() {
  const supabase = createClient()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleClaim() {
    if (!email.trim() || !password) return
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.updateUser({ email, password })
    if (err) { setError(err.message); setLoading(false); return }
    // Mark as no longer anonymous
    await supabase.from('users').update({ is_anonymous: false }).eq('id',
      (await supabase.auth.getUser()).data.user?.id ?? '')
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="mx-4 mb-6 rounded-2xl bg-teal/[0.08] border border-teal/20 p-4">
        <p className="text-sm font-body text-teal">
          Check your email to confirm your account. Your progress is now saved to the cloud.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-4 mb-6 rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4">
      <p className="text-xs font-body text-white/40 uppercase tracking-widest mb-1">Save your account</p>
      <p className="text-sm font-body text-white/70 mb-4 leading-relaxed">
        Your progress is on this device only. Add an email to sync it to the cloud.
      </p>
      <div className="space-y-2 mb-3">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm font-body text-white placeholder-white/25 outline-none focus:border-teal/40 transition-colors"
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Choose a password"
          className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm font-body text-white placeholder-white/25 outline-none focus:border-teal/40 transition-colors"
        />
      </div>
      {error && <p className="text-xs text-red-400 mb-2 font-body">{error}</p>}
      <button
        onClick={handleClaim}
        disabled={loading || !email.trim() || !password}
        className="w-full py-3 rounded-xl bg-teal text-background text-sm font-body font-medium disabled:opacity-40 active:scale-[0.98] transition-transform"
      >
        {loading ? 'Claiming…' : 'Claim your account'}
      </button>
    </div>
  )
}

// ── Tone preference section ───────────────────────────────────────────────────

function ToneSection({ initial }: { initial: TonePreference }) {
  const supabase = createClient()
  const [tone, setTone] = useState<TonePreference>(initial)

  async function handleSelect(t: TonePreference) {
    setTone(t)
    await supabase.from('users').update({ tone_preference: t })
      .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
  }

  return (
    <div className="mb-6">
      <SectionHeader label="My tone" />
      <div className="px-4 space-y-2">
        {TONE_CARDS.map(({ tone: t, label, example }) => (
          <button
            key={t}
            onClick={() => handleSelect(t)}
            className={`w-full text-left rounded-2xl border p-4 transition-colors ${
              tone === t
                ? 'bg-teal/[0.08] border-teal/30'
                : 'bg-white/[0.04] border-white/[0.06] active:bg-white/[0.06]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-body font-medium ${tone === t ? 'text-teal' : 'text-white/70'}`}>
                {label}
              </p>
              {tone === t && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#2DD4BF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
            <p className="text-xs font-body text-white/40 leading-relaxed">{example}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Notifications section ─────────────────────────────────────────────────────

const NOTIF_ITEMS: Array<{ key: keyof UserSettings; label: string; sub?: string }> = [
  { key: 'notif_task_reminders',    label: 'Task reminders',    sub: 'Before your scheduled tasks' },
  { key: 'notif_habit_risk',        label: 'Habit at risk',     sub: 'When a habit has no log by evening' },
  { key: 'notif_streak_risk',       label: 'Streak at risk',    sub: 'Day before a streak would break' },
  { key: 'notif_friend_activity',   label: 'Friend activity',   sub: 'Friend requests and scores' },
  { key: 'notif_weekly_review',     label: 'Weekly review',     sub: 'Ready every Sunday' },
  { key: 'notif_challenge_invites', label: 'Challenge invites', sub: 'New challenge requests' },
  { key: 'notif_score_updates',     label: 'Score updates',     sub: 'Score changes in active challenges' },
  { key: 'notif_pact_miss',         label: 'Pact miss',         sub: 'When your pact partner misses a day' },
]

function NotificationsSection({ initial }: { initial: UserSettings }) {
  const supabase = createClient()
  const [settings, setSettings] = useState<UserSettings>(initial)
  const [morningTime, setMorningTime] = useState(initial.morning_checkin_time.slice(0, 5))
  const [eveningTime, setEveningTime] = useState(initial.evening_checkin_time.slice(0, 5))

  async function toggle(key: keyof UserSettings) {
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('user_settings').upsert({
      user_id: user.id,
      [key]: next[key],
    }, { onConflict: 'user_id' })
  }

  async function saveTime(field: 'morning_checkin_time' | 'evening_checkin_time', val: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('user_settings').upsert({
      user_id: user.id,
      [field]: `${val}:00`,
    }, { onConflict: 'user_id' })
  }

  return (
    <div className="mb-6">
      <SectionHeader label="Notifications" />
      <Card>
        {NOTIF_ITEMS.map((item, idx) => (
          <div key={item.key}>
            {idx > 0 && <Divider />}
            <SettingRow
              label={item.label}
              sub={item.sub}
              right={
                <Toggle
                  on={settings[item.key] as boolean}
                  onToggle={() => toggle(item.key)}
                />
              }
            />
          </div>
        ))}
        <Divider />
        <div className="px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-sm font-body text-white">Morning check-in</p>
            <p className="text-xs font-body text-white/35 mt-0.5">Daily reminder to plan your day</p>
          </div>
          <input
            type="time"
            value={morningTime}
            onChange={e => setMorningTime(e.target.value)}
            onBlur={e => saveTime('morning_checkin_time', e.target.value)}
            className="bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-1.5 text-sm font-body text-white outline-none focus:border-teal/40 transition-colors"
            style={{ colorScheme: 'dark' }}
          />
        </div>
        <Divider />
        <div className="px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-sm font-body text-white">Evening check-in</p>
            <p className="text-xs font-body text-white/35 mt-0.5">Reminder to log your reflection</p>
          </div>
          <input
            type="time"
            value={eveningTime}
            onChange={e => setEveningTime(e.target.value)}
            onBlur={e => saveTime('evening_checkin_time', e.target.value)}
            className="bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-1.5 text-sm font-body text-white outline-none focus:border-teal/40 transition-colors"
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </Card>
    </div>
  )
}

// ── Appearance section ────────────────────────────────────────────────────────

function AppearanceSection() {
  const { reducedMotion, setReducedMotion } = useReducedMotion()
  return (
    <div className="mb-6">
      <SectionHeader label="Appearance" />
      <Card>
        <SettingRow
          label="Reduce motion"
          sub="Disables animations and transitions"
          right={
            <Toggle
              on={reducedMotion}
              onToggle={() => setReducedMotion(!reducedMotion)}
            />
          }
        />
      </Card>
    </div>
  )
}

// ── Account section ───────────────────────────────────────────────────────────

function AccountSection({ isAnonymous, sparksBalance }: { isAnonymous: boolean; sparksBalance: number }) {
  const supabase  = createClient()
  const router    = useRouter()
  const [confirm,       setConfirm]       = useState(false)
  const [signing,       setSigning]       = useState(false)
  const [deletePhase,   setDeletePhase]   = useState<'idle' | 'confirm' | 'deleting'>('idle')
  const [deleteError,   setDeleteError]   = useState<string | null>(null)
  const [, startTransition] = useTransition()

  async function handleSignOut() {
    if (!confirm) { setConfirm(true); return }
    setSigning(true)
    await supabase.auth.signOut()
    startTransition(() => { router.push('/today') })
  }

  async function handleDelete() {
    if (deletePhase === 'idle')    { setDeletePhase('confirm');   return }
    if (deletePhase === 'confirm') {
      setDeletePhase('deleting')
      setDeleteError(null)
      try {
        const res = await fetch('/api/users/delete', { method: 'POST' })
        if (!res.ok) {
          const body = await res.json() as { error?: string }
          setDeleteError(body.error ?? 'Something went wrong.')
          setDeletePhase('confirm')
          return
        }
        // Session is now invalid — navigate to Today which starts a fresh anonymous session
        startTransition(() => { router.push('/today') })
      } catch {
        setDeleteError('Something went wrong.')
        setDeletePhase('confirm')
      }
    }
  }

  async function handleExport() {
    const res = await fetch('/api/users/export')
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    const date = new Date().toISOString().slice(0, 10)
    a.download = `daytwin-export-${date}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mb-8">
      <SectionHeader label="Account" />
      <Card>
        <SettingRow
          label="Shop"
          sub="Themes, sounds, and more"
          onPress={() => router.push('/you/shop')}
          right={
            <div className="flex items-center gap-2">
              <span className="text-sm font-body text-gold tabular-nums">⚡ {sparksBalance.toLocaleString()}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white/30">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          }
        />
        <Divider />
        <SettingRow
          label="Sparks history"
          sub="See all your earned and reversed Sparks"
          onPress={() => router.push('/you/sparks-history')}
          right={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white/30">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          }
        />
        <Divider />
        <SettingRow
          label="Export my data"
          sub="Download everything as JSON"
          onPress={handleExport}
          right={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white/30">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          }
        />
        <Divider />
        <button
          onClick={handleSignOut}
          disabled={signing}
          className="w-full px-4 py-3.5 text-left active:bg-white/[0.03] transition-colors disabled:opacity-40"
        >
          {confirm ? (
            <p className="text-sm font-body text-red-400">
              Tap again to confirm sign out
            </p>
          ) : (
            <p className="text-sm font-body text-red-400/80">
              {signing ? 'Signing out…' : isAnonymous ? 'Sign out (your data stays on this device)' : 'Sign out'}
            </p>
          )}
        </button>
      </Card>

      {/* Delete account — separate card so it's visually distant from the rest */}
      {!isAnonymous && (
        <div className="mt-4 mx-4">
          {deletePhase === 'idle' && (
            <button
              onClick={handleDelete}
              className="w-full py-3 text-center text-xs font-body text-white/20 active:text-red-400/60 transition-colors"
            >
              Delete my account
            </button>
          )}

          {(deletePhase === 'confirm' || deletePhase === 'deleting') && (
            <div className="bg-red-950/40 border border-red-500/20 rounded-2xl px-4 py-4">
              <p className="text-sm font-body font-semibold text-red-400 mb-1">
                Delete account permanently?
              </p>
              <p className="text-xs font-body text-white/40 mb-4 leading-relaxed">
                All your goals, habits, tasks, reflections, and Sparks will be deleted. This cannot be undone. Export your data first if you want a copy.
              </p>
              {deleteError && (
                <p className="text-xs font-body text-red-400 mb-3">{deleteError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setDeletePhase('idle'); setDeleteError(null) }}
                  disabled={deletePhase === 'deleting'}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-sm font-body text-white/60 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deletePhase === 'deleting'}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/80 text-sm font-body font-semibold text-white disabled:opacity-40"
                >
                  {deletePhase === 'deleting' ? 'Deleting…' : 'Yes, delete everything'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

interface SettingsScreenProps {
  profile:       UserFullProfile | null
  settings:      UserSettings
  sparksBalance: number
}

export function SettingsScreen({ profile, settings, sparksBalance }: SettingsScreenProps) {
  return (
    <div className="min-h-screen bg-[#080808] pb-32">
      {/* Header */}
      <div className="page-header pt-safe-top px-5 pb-5">
        <h1 className="text-2xl font-heading font-bold text-white">You</h1>
      </div>

      {profile && <ProfileSection profile={profile} />}
      {profile?.is_anonymous && <ClaimAccountCard />}

      <ToneSection initial={profile?.tone_preference ?? 'warm'} />
      <NotificationsSection initial={settings} />
      <AppearanceSection />
      <AccountSection isAnonymous={profile?.is_anonymous ?? true} sparksBalance={sparksBalance} />
    </div>
  )
}
