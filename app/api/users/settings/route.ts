import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

/**
 * POST /api/users/settings
 *
 * Partial update for user_settings. Only whitelisted keys are applied.
 * Used by the Shop to set active_motivation_pack_id.
 */

const ALLOWED_KEYS = new Set([
  'active_motivation_pack_id',
  'morning_checkin_time',
  'evening_checkin_time',
  'notif_task_reminders',
  'notif_habit_risk',
  'notif_streak_risk',
  'notif_friend_activity',
  'notif_weekly_review',
  'notif_challenge_invites',
  'notif_score_updates',
  'notif_pact_miss',
])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>
    const update: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(body)) {
      if (ALLOWED_KEYS.has(key)) update[key] = val
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid keys provided' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
      .from('user_settings')
      .update(update)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
