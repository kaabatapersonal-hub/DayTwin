import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShopScreen }   from '@/components/shop/ShopScreen'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Shop — DayTwin' }

export default async function ShopPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // All fetches in parallel
  const [
    { data: themes },
    { data: profileItems },
    { data: motivationPacks },
    { data: soundPacks },
    { data: badges },
    { data: userBadges },
    { data: unlockedThemes },
    { data: unlockedItems },
    { data: unlockedPacks },
    { data: unlockedSounds },
    { data: userProfile },
    { data: userSettings },
  ] = await Promise.all([
    supabase.from('themes').select('*').order('cost_sparks'),
    supabase.from('profile_items').select('*').order('cost_sparks'),
    supabase.from('motivation_packs').select('id, name, cost_sparks, content').order('cost_sparks'),
    supabase.from('sound_packs').select('*').order('cost_sparks'),
    supabase.from('badges').select('*').order('name'),
    supabase.from('user_badges').select('badge_id').eq('user_id', user.id),
    supabase.from('user_unlocked_themes').select('theme_id').eq('user_id', user.id),
    supabase.from('user_unlocked_items').select('item_id').eq('user_id', user.id),
    supabase.from('user_unlocked_packs').select('pack_id').eq('user_id', user.id),
    supabase.from('user_unlocked_sounds').select('sound_id').eq('user_id', user.id),
    supabase.from('users').select('sparks_balance').eq('id', user.id).single(),
    supabase.from('user_settings').select('active_motivation_pack_id, active_profile_item_ids').eq('user_id', user.id).single(),
  ])

  const earnedBadgeIds   = new Set((userBadges   ?? []).map(r => r.badge_id))
  const unlockedThemeIds = new Set((unlockedThemes ?? []).map(r => r.theme_id))
  const unlockedItemIds  = new Set((unlockedItems  ?? []).map(r => r.item_id))
  const unlockedPackIds  = new Set((unlockedPacks  ?? []).map(r => r.pack_id))
  const unlockedSoundIds = new Set((unlockedSounds ?? []).map(r => r.sound_id))
  const activeItemIds    = new Set<string>(
    (userSettings?.active_profile_item_ids as string[] | null) ?? []
  )

  return (
    <ShopScreen
      themes={themes ?? []}
      profileItems={profileItems ?? []}
      motivationPacks={motivationPacks ?? []}
      soundPacks={soundPacks ?? []}
      badges={badges ?? []}
      earnedBadgeIds={earnedBadgeIds}
      unlockedThemeIds={unlockedThemeIds}
      unlockedItemIds={unlockedItemIds}
      unlockedPackIds={unlockedPackIds}
      unlockedSoundIds={unlockedSoundIds}
      currentBalance={userProfile?.sparks_balance ?? 0}
      activePackId={userSettings?.active_motivation_pack_id ?? null}
      activeItemIds={activeItemIds}
    />
  )
}
