/**
 * DayTwin — Copy templates, all three tone presets.
 *
 * Every user-facing string in the emotional layer (coach card, hard day overlay,
 * welcome back screen, score ring label, reflection confirmation) lives here.
 * Editing this file is the single place to change copy.
 *
 * Rules from voice-and-tone-guide.md:
 *  - Reference something real the user did — never generic platitudes
 *  - No guilt, no shame, no "you should have"
 *  - Present tense; warm encourages, direct informs, hype energises
 */

import type { CoachData, TonePreference } from '@/types'

export type { TonePreference }

// ── Morning Daily Coach ───────────────────────────────────────────────────────

function fmtHours(h: number): string {
  return h % 1 === 0 ? h.toString() : h.toFixed(1)
}

/**
 * Builds the coach card sentence from real computed data.
 * Gracefully omits any sentence whose data is missing.
 * Backward-compatible: tone defaults to 'warm'.
 */
export function buildCoachMessage(data: CoachData, tone: TonePreference = 'warm'): string {
  const { preferredName, focusHoursWeek, goalTitle, goalProgressPct, topTaskTitle } = data

  if (tone === 'direct') {
    const parts: string[] = []
    if (preferredName) parts.push(`${preferredName}.`)
    if (focusHoursWeek > 0) parts.push(`${fmtHours(focusHoursWeek)}h focus this week.`)
    if (topTaskTitle) parts.push(`Priority: ${topTaskTitle}.`)
    if (parts.length === 0) parts.push('Pick one task and start.')
    return parts.join(' ')
  }

  if (tone === 'hype') {
    const nameStr = preferredName ? `, ${preferredName}` : ''
    const parts: string[] = [`Let's go${nameStr}!`]
    if (focusHoursWeek > 0) parts.push(`${fmtHours(focusHoursWeek)}h of focus already — you're on fire.`)
    if (goalTitle && goalProgressPct !== null && goalProgressPct > 0) {
      parts.push(`${goalProgressPct}% to ${goalTitle} — keep pushing.`)
    }
    if (topTaskTitle) parts.push(`Today: ${topTaskTitle}. Make it happen.`)
    if (parts.length === 1) parts.push("What's the move today? Make it count.")
    return parts.join(' ')
  }

  // warm (original)
  const greeting = preferredName ? `Morning, ${preferredName}.` : 'Morning.'
  const parts: string[] = [greeting]
  if (focusHoursWeek > 0) parts.push(`You logged ${fmtHours(focusHoursWeek)}h of focus this week.`)
  if (goalTitle && goalProgressPct !== null && goalProgressPct > 0) {
    parts.push(`You're ${goalProgressPct}% of the way to ${goalTitle}.`)
  }
  if (topTaskTitle) parts.push(`Today's priority: ${topTaskTitle}.`)
  if (parts.length === 1) parts.push("What's the one thing that would make today count?")
  return parts.join(' ')
}

// ── Score ring labels ─────────────────────────────────────────────────────────

export function scoreLabel(pct: number, tone: TonePreference = 'warm'): string {
  if (tone === 'direct') {
    if (pct === 100) return 'Full score. Done for today.'
    if (pct >= 80)   return `${pct}% — almost there.`
    if (pct >= 50)   return `${pct}% complete.`
    if (pct >= 20)   return `${pct}% — keep going.`
    return 'Just getting started.'
  }
  if (tone === 'hype') {
    if (pct === 100) return "PERFECT DAY. Everything done — you crushed it!"
    if (pct >= 80)   return "Almost a perfect day — push through!"
    if (pct >= 50)   return "Over halfway! You've got this."
    if (pct >= 20)   return 'Building momentum — keep stacking wins!'
    return "Let's go — every win counts from here!"
  }
  if (pct === 100) return "That's everything for today. You showed up, and it counted."
  if (pct >= 80)   return 'Almost there — strong day.'
  if (pct >= 50)   return 'Good progress today.'
  if (pct >= 20)   return 'Building momentum.'
  return "Today's just getting started."
}

// ── Welcome Back ──────────────────────────────────────────────────────────────

export function getWelcomeBackCopy(tone: TonePreference = 'warm'): { body: string; cta: string } {
  if (tone === 'direct') return {
    body: "You've been away. Pick one task and get started.",
    cta:  'Get started',
  }
  if (tone === 'hype') return {
    body: "You're back — let's make this one count. One win and you're back in the rhythm.",
    cta:  "Let's go",
  }
  return {
    body: "Good to see you again. No catching up needed — let's just start with one thing today.",
    cta:  'Start with one win',
  }
}

// ── Hard Day overlay ──────────────────────────────────────────────────────────

export function getHardDayCopy(tone: TonePreference = 'warm'): { heading: string } {
  if (tone === 'direct') return { heading: "Here's your progress so far. Keep going." }
  if (tone === 'hype')   return { heading: "Hard days are where real progress lives. Look what you've built." }
  return { heading: "It's okay that today is hard. Here's what you've already built — look how far you've come." }
}

export const HARD_DAY_HEADING =
  "It's okay that today is hard. Here's what you've already built — look how far you've come."

/** "You showed up N out of 30 days." — uses real count, never hardcoded. */
export function daysShownUpLabel(count: number): string {
  return `You showed up ${count} out of the last 30 days.`
}

/** Days-away line: "3 days since your last visit." */
export function daysAwayLabel(days: number): string {
  if (days === 1) return 'You were away for a day.'
  return `${days} days since your last visit.`
}

// Kept for backward compat — prefer getWelcomeBackCopy(tone)
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
