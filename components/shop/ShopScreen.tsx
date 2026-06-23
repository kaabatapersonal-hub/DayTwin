'use client'

import { useState, useCallback } from 'react'
import { useRouter }             from 'next/navigation'
import { useTheme }              from '@/contexts/ThemeContext'
import { useSound }              from '@/contexts/SoundContext'
import { PurchaseSheet }         from './PurchaseSheet'
import type {
  Theme, ProfileItem, MotivationPack, SoundPack, Badge,
} from '@/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ShopScreenProps {
  themes:           Theme[]
  profileItems:     ProfileItem[]
  motivationPacks:  MotivationPack[]
  soundPacks:       SoundPack[]
  badges:           Badge[]
  earnedBadgeIds:   Set<string>
  unlockedThemeIds: Set<string>
  unlockedItemIds:  Set<string>
  unlockedPackIds:  Set<string>
  unlockedSoundIds: Set<string>
  currentBalance:   number
  activePackId:     string | null
  activeItemIds:    Set<string>   // profile items currently equipped
}

interface PendingPurchase {
  itemName: string
  cost:     number
  itemType: 'theme' | 'profile_item' | 'motivation_pack' | 'sound_pack'
  itemId:   string
  themeAccent?: string
  themeBg?:     string
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ShopScreen({
  themes, profileItems, motivationPacks, soundPacks,
  badges, earnedBadgeIds, unlockedThemeIds, unlockedItemIds,
  unlockedPackIds, unlockedSoundIds,
  currentBalance: initialBalance, activePackId: initialPackId,
  activeItemIds: initialActiveItems,
}: ShopScreenProps) {
  const router                         = useRouter()
  const { activeThemeId, switchTheme } = useTheme()
  const { play, activeSoundId }        = useSound()

  const [balance,        setBalance]        = useState(initialBalance)
  const [unlockedThemes, setUnlockedThemes] = useState(unlockedThemeIds)
  const [unlockedItems,  setUnlockedItems]  = useState(unlockedItemIds)
  const [unlockedPacks,  setUnlockedPacks]  = useState(unlockedPackIds)
  const [unlockedSounds, setUnlockedSounds] = useState(unlockedSoundIds)
  const [activePackId,   setActivePackId]   = useState(initialPackId)
  const [activeItems,    setActiveItems]    = useState(initialActiveItems)

  const [pending,    setPending]    = useState<PendingPurchase | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [notice,     setNotice]     = useState<string | null>(null)

  function showNotice(msg: string) {
    setNotice(msg)
    setTimeout(() => setNotice(null), 3000)
  }

  function startPurchase(p: PendingPurchase) {
    if (balance < p.cost) {
      showNotice(`You need ${p.cost - balance} more Sparks to unlock this`)
      return
    }
    setPending(p)
  }

  const confirmPurchase = useCallback(async () => {
    if (!pending) return
    setConfirming(true)
    try {
      const res  = await fetch('/api/shop/unlock', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ item_type: pending.itemType, item_id: pending.itemId }),
      })
      const data = await res.json() as { success?: boolean; new_balance?: number; error?: string }

      if (!data.success) {
        showNotice(data.error ?? 'Purchase failed')
        setPending(null)
        return
      }

      if (typeof data.new_balance === 'number') setBalance(data.new_balance)

      if (pending.itemType === 'theme') {
        setUnlockedThemes(prev => new Set(Array.from(prev).concat(pending.itemId)))
        if (pending.themeAccent && pending.themeBg) {
          await switchTheme(pending.itemId, pending.themeAccent, pending.themeBg)
        }
      } else if (pending.itemType === 'profile_item') {
        setUnlockedItems(prev => new Set(Array.from(prev).concat(pending.itemId)))
      } else if (pending.itemType === 'motivation_pack') {
        setUnlockedPacks(prev => new Set(Array.from(prev).concat(pending.itemId)))
      } else if (pending.itemType === 'sound_pack') {
        setUnlockedSounds(prev => new Set(Array.from(prev).concat(pending.itemId)))
      }

      showNotice(`${pending.itemName} unlocked!`)
      setPending(null)
    } catch {
      showNotice('Something went wrong')
      setPending(null)
    } finally {
      setConfirming(false)
    }
  }, [pending, switchTheme])

  return (
    <div className="min-h-screen bg-background text-white pb-32">
      {/* Header */}
      <div className="pt-safe-top px-5 pb-5 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0"
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-heading font-bold text-white">Shop</h1>
          <p className="text-xs font-body text-white/35 mt-0.5">
            ⚡ {balance.toLocaleString()} Sparks available
          </p>
        </div>
      </div>

      {notice && (
        <div className="mx-4 mb-4 px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/10">
          <p className="text-sm font-body text-white/70 text-center">{notice}</p>
        </div>
      )}

      <div className="space-y-8">

        {/* ─── Themes ─── */}
        <Section title="Themes" sub="Change the app's colour palette">
          <HScroll>
            {themes.map(theme => {
              const owned = theme.cost_sparks === 0 || unlockedThemes.has(theme.id)
              const isDefault = theme.cost_sparks === 0
              const isActive  = isDefault
                ? activeThemeId === null || activeThemeId === theme.id
                : activeThemeId === theme.id
              return (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  isUnlocked={owned}
                  isActive={isActive}
                  onSelect={() => {
                    if (owned) {
                      switchTheme(isDefault ? null : theme.id, theme.accent_hex, theme.background_hex)
                    } else {
                      startPurchase({
                        itemName: theme.name, cost: theme.cost_sparks,
                        itemType: 'theme', itemId: theme.id,
                        themeAccent: theme.accent_hex, themeBg: theme.background_hex,
                      })
                    }
                  }}
                />
              )
            })}
          </HScroll>
        </Section>

        {/* ─── Profile ─── */}
        <Section title="Profile" sub="Frames, avatars, and icon sets">
          {(['frame', 'avatar', 'border', 'icon'] as const).map(type => {
            const group = profileItems.filter(i => i.type === type)
            if (!group.length) return null
            const label: Record<string, string> = {
              frame: 'Frames', avatar: 'Avatars', border: 'Borders', icon: 'Icon Sets',
            }
            return (
              <div key={type} className="mb-4">
                <p className="px-5 text-xs font-body text-white/30 mb-2 uppercase tracking-widest">
                  {label[type]}
                </p>
                <HScroll>
                  {group.map(item => {
                    const owned = item.cost_sparks === 0 || unlockedItems.has(item.id)
                    const equipped = activeItems.has(item.id)
                    return (
                      <ProfileItemCard
                        key={item.id}
                        item={item}
                        isUnlocked={owned}
                        isEquipped={equipped}
                        onSelect={async () => {
                          if (!owned) {
                            startPurchase({
                              itemName: item.name, cost: item.cost_sparks,
                              itemType: 'profile_item', itemId: item.id,
                            })
                            return
                          }
                          // Toggle equip
                          const newEquipped = equipped
                            ? new Set(Array.from(activeItems).filter(id => id !== item.id))
                            : new Set(Array.from(activeItems).concat(item.id))
                          setActiveItems(newEquipped)
                          await fetch('/api/users/profile-items', {
                            method:  'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body:    JSON.stringify({ item_id: item.id, equipped: !equipped }),
                          }).catch(() => {})
                        }}
                      />
                    )
                  })}
                </HScroll>
              </div>
            )
          })}
        </Section>

        {/* ─── Motivation Packs ─── */}
        <Section title="Motivation Packs" sub="A daily rotating card on your Today screen">
          <HScroll>
            {motivationPacks.map(pack => (
              <PackCard
                key={pack.id}
                name={pack.name}
                cost={pack.cost_sparks}
                cardCount={pack.content.length}
                isUnlocked={unlockedPacks.has(pack.id)}
                isActive={activePackId === pack.id}
                onSelect={async () => {
                  if (!unlockedPacks.has(pack.id)) {
                    startPurchase({
                      itemName: pack.name, cost: pack.cost_sparks,
                      itemType: 'motivation_pack', itemId: pack.id,
                    })
                    return
                  }
                  const newId = activePackId === pack.id ? null : pack.id
                  setActivePackId(newId)
                  await fetch('/api/users/settings', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ active_motivation_pack_id: newId }),
                  }).catch(() => {})
                }}
              />
            ))}
          </HScroll>
        </Section>

        {/* ─── Sound Packs ─── */}
        <Section title="Sound Packs" sub="Focus-friendly background audio">
          <HScroll>
            {soundPacks.map(sp => (
              <SoundCard
                key={sp.id}
                pack={sp}
                isUnlocked={unlockedSounds.has(sp.id)}
                isActive={activeSoundId === sp.id}
                onSelect={() => {
                  if (!unlockedSounds.has(sp.id)) {
                    startPurchase({
                      itemName: sp.name, cost: sp.cost_sparks,
                      itemType: 'sound_pack', itemId: sp.id,
                    })
                    return
                  }
                  play(sp.id, sp.name, sp.audio_url)
                }}
              />
            ))}
          </HScroll>
        </Section>

        {/* ─── Badges ─── */}
        <Section title="Badges" sub="Earn these by reaching milestones">
          <div className="px-4 grid grid-cols-2 gap-3">
            {badges.map(badge => {
              const earned = earnedBadgeIds.has(badge.id)
              return (
                <div
                  key={badge.id}
                  className={`bg-white/[0.04] rounded-2xl p-4 ${earned ? '' : 'opacity-40'}`}
                >
                  <p className="text-2xl mb-2">{badge.icon}</p>
                  <p className="text-sm font-heading font-semibold text-white leading-tight">
                    {badge.name}
                  </p>
                  <p className="text-xs font-body text-white/35 mt-1 leading-relaxed">
                    {badge.criteria}
                  </p>
                  {earned && (
                    <span className="inline-block mt-2 text-[10px] font-body text-teal bg-teal/10 px-2 py-0.5 rounded-full">
                      Earned
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </Section>

      </div>

      {pending && (
        <PurchaseSheet
          itemName={pending.itemName}
          cost={pending.cost}
          currentBalance={balance}
          onConfirm={confirmPurchase}
          onCancel={() => setPending(null)}
          confirming={confirming}
        />
      )}
    </div>
  )
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-5 mb-3">
        <h2 className="text-base font-heading font-semibold text-white">{title}</h2>
        <p className="text-xs font-body text-white/35 mt-0.5">{sub}</p>
      </div>
      {children}
    </div>
  )
}

function HScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-none">
      {children}
    </div>
  )
}

// ─── Cards ────────────────────────────────────────────────────────────────────

function ThemeCard({ theme, isUnlocked, isActive, onSelect }: {
  theme: Theme; isUnlocked: boolean; isActive: boolean; onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`shrink-0 w-28 rounded-2xl overflow-hidden border-2 transition-all active:scale-95 ${
        isActive ? 'border-teal' : 'border-white/[0.08]'
      }`}
    >
      <div
        className="h-16 w-full flex items-center justify-center relative"
        style={{ background: theme.background_hex }}
      >
        <div className="w-6 h-6 rounded-full" style={{ background: theme.accent_hex }} />
        {isActive && (
          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-teal flex items-center justify-center">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        )}
        {!isUnlocked && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
        )}
      </div>
      <div className="bg-white/[0.04] px-2 py-2">
        <p className="text-xs font-body text-white font-medium leading-tight truncate">{theme.name}</p>
        {!isUnlocked
          ? <p className="text-[10px] font-body text-gold mt-0.5">⚡ {theme.cost_sparks}</p>
          : <p className="text-[10px] font-body text-teal/70 mt-0.5">Owned</p>
        }
      </div>
    </button>
  )
}

function ProfileItemCard({ item, isUnlocked, isEquipped, onSelect }: {
  item: ProfileItem; isUnlocked: boolean; isEquipped: boolean; onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`shrink-0 w-28 rounded-2xl bg-white/[0.04] border-2 p-3 text-left transition-all active:scale-95 ${
        isEquipped ? 'border-teal' : 'border-white/[0.06]'
      }`}
    >
      <div className="h-12 flex items-center justify-center mb-2">
        <div className={`w-9 h-9 rounded-full bg-white/10 ${isUnlocked ? '' : 'opacity-30'}`} />
      </div>
      <p className="text-xs font-body text-white font-medium leading-tight truncate">{item.name}</p>
      {!isUnlocked
        ? <p className="text-[10px] font-body text-gold mt-0.5">⚡ {item.cost_sparks}</p>
        : <p className="text-[10px] font-body text-teal/70 mt-0.5">
            {isEquipped ? 'Equipped ✓' : 'Owned'}
          </p>
      }
    </button>
  )
}

function PackCard({ name, cost, cardCount, isUnlocked, isActive, onSelect }: {
  name: string; cost: number; cardCount: number; isUnlocked: boolean; isActive: boolean; onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`shrink-0 w-44 rounded-2xl bg-white/[0.04] border-2 p-4 text-left transition-all active:scale-95 ${
        isActive ? 'border-teal' : 'border-white/[0.06]'
      }`}
    >
      <p className="text-sm font-heading font-semibold text-white leading-snug mb-1">{name}</p>
      <p className="text-xs font-body text-white/35">{cardCount} cards</p>
      <div className="mt-3">
        {isUnlocked
          ? <span className="text-xs font-body text-teal">{isActive ? 'Active ✓' : 'Set active'}</span>
          : <span className="text-xs font-body text-gold">⚡ {cost}</span>
        }
      </div>
    </button>
  )
}

function SoundCard({ pack, isUnlocked, isActive, onSelect }: {
  pack: SoundPack; isUnlocked: boolean; isActive: boolean; onSelect: () => void
}) {
  const ICONS: Record<string, string> = {
    Rain: '🌧', 'Coffee Shop': '☕', Forest: '🌲', Keyboard: '⌨',
  }
  return (
    <button
      onClick={onSelect}
      className={`shrink-0 w-36 rounded-2xl bg-white/[0.04] border-2 p-4 text-left transition-all active:scale-95 ${
        isActive ? 'border-teal' : 'border-white/[0.06]'
      }`}
    >
      <p className="text-2xl mb-2">{ICONS[pack.name] ?? '🔊'}</p>
      <p className="text-sm font-body text-white font-medium">{pack.name}</p>
      <div className="mt-2">
        {isUnlocked
          ? <span className="text-xs font-body text-teal">{isActive ? 'Playing ▶' : 'Tap to play'}</span>
          : <span className="text-xs font-body text-gold">⚡ {pack.cost_sparks}</span>
        }
      </div>
    </button>
  )
}
