import { createClient }    from '@/lib/supabase/server'
import { SettingsScreen }  from '@/components/you/SettingsScreen'
import type { UserFullProfile, UserSettings } from '@/types'

const DEFAULT_SETTINGS: Omit<UserSettings, 'user_id'> = {
  notif_task_reminders:    true,
  notif_habit_risk:        true,
  notif_streak_risk:       true,
  notif_friend_activity:   true,
  notif_weekly_review:     true,
  notif_challenge_invites: true,
  notif_score_updates:     true,
  notif_pact_miss:         true,
  morning_checkin_time:    '07:00:00',
  evening_checkin_time:    '20:00:00',
  notif_daily_count:       0,
  notif_last_sent_date:    null,
}

export default async function YouPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <SettingsScreen
        profile={null}
        settings={{ user_id: '', ...DEFAULT_SETTINGS }}
        sparksBalance={0}
      />
    )
  }

  const [profileRes, settingsRes, balanceRes] = await Promise.all([
    supabase
      .from('users')
      .select('id, is_anonymous, email, username, username_changed_at, display_name, preferred_name, tone_preference, reduced_motion, onesignal_player_id')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('users')
      .select('sparks_balance')
      .eq('id', user.id)
      .single(),
  ])

  const profile       = profileRes.data  as UserFullProfile | null
  const settings      = (settingsRes.data ?? { user_id: user.id, ...DEFAULT_SETTINGS }) as UserSettings
  const sparksBalance = balanceRes.data?.sparks_balance ?? 0

  // Backfill email from auth if not yet in users table
  const resolvedProfile: UserFullProfile = profile ?? {
    id:                  user.id,
    is_anonymous:        true,
    email:               user.email ?? null,
    username:            null,
    username_changed_at: null,
    display_name:        null,
    preferred_name:      null,
    tone_preference:     'warm',
    reduced_motion:      false,
    onesignal_player_id: null,
  }

  return <SettingsScreen profile={resolvedProfile} settings={settings} sparksBalance={sparksBalance} />
}
