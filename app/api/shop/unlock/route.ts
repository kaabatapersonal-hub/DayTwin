import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

/**
 * POST /api/shop/unlock
 *
 * Purchases a shop item by calling deduct_sparks() (SECURITY DEFINER Postgres
 * function). The client never writes Sparks directly — this is the only path
 * through which a spend can happen outside of DB triggers.
 *
 * Body: {
 *   item_type: 'theme' | 'profile_item' | 'motivation_pack' | 'sound_pack'
 *   item_id:   string (uuid)
 * }
 *
 * Returns: { success: bool, new_balance?: number, error?: string, shortfall?: number }
 */

type ItemType = 'theme' | 'profile_item' | 'motivation_pack' | 'sound_pack'

const COST_TABLE: Record<ItemType, string> = {
  theme:           'themes',
  profile_item:    'profile_items',
  motivation_pack: 'motivation_packs',
  sound_pack:      'sound_packs',
}


export async function POST(req: NextRequest) {
  try {
    const { item_type, item_id } = await req.json() as {
      item_type?: ItemType
      item_id?:   string
    }

    if (!item_type || !item_id) {
      return NextResponse.json({ error: 'item_type and item_id are required' }, { status: 400 })
    }

    if (!COST_TABLE[item_type]) {
      return NextResponse.json({ error: 'Invalid item_type' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Look up the item's cost from its own table
    const { data: item, error: itemError } = await supabase
      .from(COST_TABLE[item_type])
      .select('cost_sparks')
      .eq('id', item_id)
      .maybeSingle()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const cost = item.cost_sparks as number

    // Free items (Default theme) skip the deduction entirely
    if (cost === 0) {
      // Still insert the unlock row so the client sees it as owned
      if (item_type === 'theme') {
        await supabase.from('user_unlocked_themes').upsert(
          { user_id: user.id, theme_id: item_id },
          { onConflict: 'user_id,theme_id' },
        )
      }
      const { data: profile } = await supabase
        .from('users')
        .select('sparks_balance')
        .eq('id', user.id)
        .maybeSingle()

      return NextResponse.json({ success: true, new_balance: profile?.sparks_balance ?? 0 })
    }

    // Call deduct_sparks() — atomically checks balance, deducts, inserts unlock
    const { data: result, error: rpcError } = await supabase.rpc('deduct_sparks', {
      p_user_id:   user.id,
      p_amount:    cost,
      p_reason:    `${item_type}_purchase`,
      p_item_type: item_type,
      p_item_id:   item_id,
    })

    if (rpcError) {
      return NextResponse.json({ error: 'Purchase failed', detail: rpcError.message }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
