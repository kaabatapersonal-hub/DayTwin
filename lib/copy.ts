/**
 * DayTwin — Warm preset copy templates.
 *
 * Every user-facing string in the emotional layer (coach card, hard day overlay,
 * welcome back screen, score ring label, reflection confirmation) lives here.
 * Editing this file is the single place to change copy — nothing should be
 * hardcoded in components. Tone preset support (direct / hype) stays in V2
 * when the settings screen ships; all templates below are Warm.
 *
 * Rules from voice-and-tone-guide.md:
 *  - Reference something real the user did — never generic platitudes
 *  - No guilt, no shame, no "you should have"
 *  - Present tense, calm encouragement
 */

import type { CoachData } from '@/types'

// ── Morning Daily Coach ───────────────────────────────────────────────────────

/**
 * Builds the coach card sentence from real computed data.
 * Gracefully omits any sentence whose data is missing — never shows
 * a template placeholder like "{X}h" to the user.
 */
export function buildCoachMessage(data: CoachData): string {
  const { preferredName, focusHoursWeek, goalTitle, goalProgressPct, topTaskTitle } = data

  const greeting = preferredName ? `Morning, ${preferredName}.` : 'Morning.'
  const parts: string[] = [greeting]

  // Focus hours: only shown when actual time has been logged this week
  if (focusHoursWeek > 0) {
    const hours = focusHoursWeek % 1 === 0
      ? focusHoursWeek.toString()
      : focusHoursWeek.toFixed(1)
    parts.push(`You logged ${hours}h of focus this week.`)
  }

  // Goal progress: only shown when a goal exists and has meaningful progress
  if (goalTitle && goalProgressPct !== null && goalProgressPct > 0) {
    parts.push(`You're ${goalProgressPct}% of the way to ${goalTitle}.`)
  }

  // Top task: only shown when there's an incomplete task for today
  if (topTaskTitle) {
    parts.push(`Today's priority: ${topTaskTitle}.`)
  }

  // If only the greeting was added (no data yet): add a gentle nudge
  if (parts.length === 1) {
    parts.push("What's the one thing that would make today count?")
  }

  return parts.join(' ')
}

// ── Score ring labels ─────────────────────────────────────────────────────────

/**
 * Returns a one-line Warm preset label for the score ring based on progress.
 * References no tasks overdue, no missed habits — only forward-looking or
 * acknowledging effort.
 */
export function scoreLabel(pct: number): string {
  if (pct === 100) return "That's everything for today. You showed up, and it counted."
  if (pct >= 80)   return 'Almost there — strong day.'
  if (pct >= 50)   return 'Good progress today.'
  if (pct >= 20)   return 'Building momentum.'
  return "Today's just getting started."
}

// ── Hard Day overlay ──────────────────────────────────────────────────────────

export const HARD_DAY_HEADING =
  "It's okay that today is hard. Here's what you've already built — look how far you've come."

/** "You showed up N out of 30 days." — uses real count, never hardcoded. */
export function daysShownUpLabel(count: number): string {
  return `You showed up ${count} out of the last 30 days.`
}

// ── Welcome Back ──────────────────────────────────────────────────────────────

/** Days-away line: "3 days since your last visit." */
export function daysAwayLabel(days: number): string {
  if (days === 1) return 'You were away for a day.'
  return `${days} days since your last visit.`
}

export const WELCOME_BACK_BODY =
  "Good to see you again. No catching up needed — let's just start with one thing today."

export const WELCOME_BACK_CTA = 'Start with one win'

// ── Reflection ────────────────────────────────────────────────────────────────

export const REFLECTION_HEADING    = 'How did today go?'
export const REFLECTION_WENT_WELL  = 'What went well today?'
export const REFLECTION_TIME_WASTED = 'Anything that wasted your time? (optional)'
export const REFLECTION_BIGGEST_WIN = "What's your biggest win today? (optional)"
export const REFLECTION_DONE_LABEL  = 'Reflected ✓'

// ── Mood check-in ─────────────────────────────────────────────────────────────

export const MOOD_PROMPTS: Record<string, string> = {
  morning: 'How are you feeling this morning?',
  midday:  'How are you feeling right now?',
  evening: 'How did this afternoon treat you?',
}

export const MOOD_CONFIRMATION = "Logged — thanks for checking in."

// ── Future Me fallback (shown on Hard Day when no recording exists) ────────────

export const FUTURE_ME_FALLBACK =
  "You haven't recorded a message yet — when you're ready, you can leave one from your goal page."
