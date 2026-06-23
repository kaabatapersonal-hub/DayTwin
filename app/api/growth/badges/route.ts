import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserBadge } from '@/types'

/**
 * GET /api/growth/badges
 * Returns all badges the authenticated user has earned, newest first.
 * Each row is joined with the badge details from the badges table.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('user_badges')
      .select('user_id, badge_id, earned_at, badge:badges(id, name, description, icon, rarity, criteria)')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false })

    if (error) throw error

    return NextResponse.json((data ?? []) as unknown as UserBadge[])
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
