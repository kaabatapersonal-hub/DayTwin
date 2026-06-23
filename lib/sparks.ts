/**
 * Growth level config, mirroring the `growth_levels` Postgres table.
 * Used client-side to avoid an extra DB round-trip for display purposes.
 */

export interface GrowthLevelInfo {
  level:         number
  label:         string
  threshold:     number       // sparks_lifetime required to reach this level
  nextThreshold: number | null
  progress:      number       // 0–100 percent through current level
}

const GROWTH_LEVELS = [
  { level: 1,  threshold: 0,     label: 'Starter'     },
  { level: 2,  threshold: 100,   label: 'Building'    },
  { level: 3,  threshold: 300,   label: 'Consistent'  },
  { level: 4,  threshold: 600,   label: 'Focused'     },
  { level: 5,  threshold: 1000,  label: 'Disciplined' },
  { level: 6,  threshold: 1500,  label: 'Driven'      },
  { level: 7,  threshold: 2500,  label: 'Momentum'    },
  { level: 8,  threshold: 4000,  label: 'Elite'       },
  { level: 9,  threshold: 6000,  label: 'Legendary'   },
  { level: 10, threshold: 10000, label: 'DayTwin'     },
] as const

export function growthLevelInfo(sparksLifetime: number): GrowthLevelInfo {
  let currentIdx = 0

  for (let i = GROWTH_LEVELS.length - 1; i >= 0; i--) {
    if (sparksLifetime >= GROWTH_LEVELS[i].threshold) {
      currentIdx = i
      break
    }
  }

  const current = GROWTH_LEVELS[currentIdx]
  const next    = GROWTH_LEVELS[currentIdx + 1] ?? null

  const progress = next
    ? Math.min(100, Math.max(0, Math.round(
        ((sparksLifetime - current.threshold) / (next.threshold - current.threshold)) * 100,
      )))
    : 100

  return {
    level:         current.level,
    label:         current.label,
    threshold:     current.threshold,
    nextThreshold: next?.threshold ?? null,
    progress,
  }
}

/** Humanises a transaction reason slug into a readable label. */
export function reasonLabel(reason: string): string {
  const LABELS: Record<string, string> = {
    task_completed_low:                 'Task completed',
    task_completed_medium:              'Task completed',
    task_completed_high:                'High-priority task',
    task_uncompleted:                   'Task reversed',
    all_tasks_bonus:                    'All tasks done',
    habit_boolean:                      'Habit checked',
    habit_count:                        'Habit target reached',
    habit_timer:                        'Timed habit completed',
    habit_uncompleted:                  'Habit reversed',
    focus_session_short:                '25-min focus session',
    focus_session_medium:               '45-min focus session',
    focus_session_long:                 '60-min focus session',
    focus_triple_bonus:                 'Three sessions today',
    reflection_submitted:               'Daily reflection',
    mood_checkin:                       'Mood check-in',
    weekly_review:                      'Weekly review',
    challenge_joined:                   'Joined a challenge',
    challenge_pact_win:                 'Habit pact completed',
    challenge_score_battle_winner:      'Score battle — 1st place',
    challenge_score_battle_runner_up:   'Score battle — runner-up',
    challenge_friends_feed_week:        'Friends Feed — week active',
    first_friend:                       'First friendship',
    recovery_reward:                    'Welcome back',
    badge_early_bird:                   'Early Bird badge',
    badge_deep_worker:                  'Deep Worker badge',
    badge_consistency_hero:             'Consistency Hero badge',
    badge_night_owl:                    'Night Owl badge',
    badge_perfect_week:                 'Perfect Week badge',
  }
  return LABELS[reason] ?? reason.replace(/_/g, ' ')
}
