import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

/**
 * POST /api/users/profile-items
 *
 * Toggle a profile item in user_settings.active_profile_item_ids (jsonb array).
 * Body: { item_id: string, equipped: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const { item_id, equipped } = await req.json() as { item_id?: string; equipped?: boolean }
    if (!item_id || typeof equipped !== 'boolean') {
      return NextResponse.json({ error: 'item_id and equipped required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Equip-only items the user actually owns; free items (cost_sparks = 0) are always equippable.
    // This prevents equipping items that were never unlocked via the shop.
    const { data: owned } = await supabase
      .from('user_unlocked_items')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('item_id', item_id)
      .maybeSingle()

    if (!owned) {
      // Allow equipping free items even without an explicit unlock row
      const { data: itemDef } = await supabase
        .from('profile_items')
        .select('cost_sparks')
        .eq('id', item_id)
        .maybeSingle()

      if (!itemDef || itemDef.cost_sparks > 0) {
        return NextResponse.json({ error: 'Item not owned' }, { status: 403 })
      }
    }

    // Fetch current equipped list
    const { data: settings } = await supabase
      .from('user_settings')
      .select('active_profile_item_ids')
      .eq('user_id', user.id)
      .single()

    const current: string[] = (settings?.active_profile_item_ids as string[] | null) ?? []
    const updated = equipped
      ? Array.from(new Set([...current, item_id]))
      : current.filter(id => id !== item_id)

    const { error } = await supabase
      .from('user_settings')
      .update({ active_profile_item_ids: updated })
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, active_profile_item_ids: updated })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
