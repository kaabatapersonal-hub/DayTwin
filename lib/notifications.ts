/**
 * Server-side OneSignal notification utility.
 *
 * Checks the 3/day cap and user's notif_* toggle before sending.
 * Call this from API routes or Edge Functions — never from client components.
 *
 * Requires env vars:
 *   ONESIGNAL_APP_ID      — OneSignal App ID
 *   ONESIGNAL_REST_API_KEY — OneSignal REST API key (server-only, not public)
 */

import { createClient } from '@/lib/supabase/server'

type NotifType =
  | 'task_reminders'
  | 'habit_risk'
  | 'streak_risk'
  | 'friend_activity'
  | 'weekly_review'
  | 'challenge_invites'
  | 'score_updates'
  | 'pact_miss'

const NOTIF_COLUMN_MAP: Record<NotifType, string> = {
  task_reminders:    'notif_task_reminders',
  habit_risk:        'notif_habit_risk',
  streak_risk:       'notif_streak_risk',
  friend_activity:   'notif_friend_activity',
  weekly_review:     'notif_weekly_review',
  challenge_invites: 'notif_challenge_invites',
  score_updates:     'notif_score_updates',
  pact_miss:         'notif_pact_miss',
}

const DAILY_CAP = 3

export async function sendPushNotification({
  userId,
  type,
  heading,
  content,
  url,
}: {
  userId:   string
  type:     NotifType
  heading:  string
  content:  string
  url?:     string
}): Promise<{ sent: boolean; reason?: string }> {
  const appId  = process.env.ONESIGNAL_APP_ID
  const apiKey = process.env.ONESIGNAL_REST_API_KEY
  if (!appId || !apiKey) return { sent: false, reason: 'not_configured' }

  const supabase = await createClient()

  // Fetch player_id + settings row in parallel
  const [userRes, settingsRes] = await Promise.all([
    supabase.from('users').select('onesignal_player_id').eq('id', userId).maybeSingle(),
    supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
  ])

  const playerId = userRes.data?.onesignal_player_id
  if (!playerId) return { sent: false, reason: 'no_player_id' }

  const settings = settingsRes.data
  if (!settings) return { sent: false, reason: 'no_settings' }

  // Check toggle for this notification type
  const toggleCol = NOTIF_COLUMN_MAP[type] as keyof typeof settings
  if (!settings[toggleCol]) return { sent: false, reason: 'toggled_off' }

  // Reset daily count if it's a new day
  const today = new Date().toISOString().slice(0, 10)
  let dailyCount = settings.notif_daily_count as number ?? 0
  if (settings.notif_last_sent_date !== today) dailyCount = 0

  if (dailyCount >= DAILY_CAP) return { sent: false, reason: 'daily_cap' }

  // Send via OneSignal REST API
  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Basic ${apiKey}`,
    },
    body: JSON.stringify({
      app_id:             appId,
      include_player_ids: [playerId],
      headings:           { en: heading },
      contents:           { en: content },
      url:                url ?? 'https://daytwin.app/today',
    }),
  })

  if (!res.ok) return { sent: false, reason: 'onesignal_error' }

  // Increment daily count
  await supabase
    .from('user_settings')
    .update({
      notif_daily_count:    dailyCount + 1,
      notif_last_sent_date: today,
    })
    .eq('user_id', userId)

  return { sent: true }
}
