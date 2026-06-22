/**
 * Shared formatting utilities for dates and Postgres time strings.
 * All time values in the DB are stored as "HH:MM:SS"; HTML inputs use "HH:MM".
 */

/** Returns today's date as "YYYY-MM-DD" in the user's local timezone. */
export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Converts a Postgres time string ("HH:MM:SS") to 12-hour display ("9:00 AM").
 * Returns null for quick tasks that have no start_time.
 */
export function formatTime(pgTime: string | null): string | null {
  if (!pgTime) return null
  const [h, m] = pgTime.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

/**
 * Converts an HTML time input value ("HH:MM") to Postgres time format ("HH:MM:SS").
 * Seconds are always :00 — the UI doesn't support sub-minute precision.
 */
export function htmlTimeToPg(htmlTime: string): string {
  return `${htmlTime}:00`
}

/**
 * Converts a Postgres time string ("HH:MM:SS") to the HTML time input value ("HH:MM").
 * Returns "" for null (used to reset a controlled input).
 */
export function pgTimeToHtml(pgTime: string | null): string {
  if (!pgTime) return ''
  return pgTime.slice(0, 5)
}

/** Formats elapsed seconds as "M:SS" for timer habit display. */
export function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

/**
 * Formats an ISO date string as "Monday, June 20" for the top bar.
 * The "T00:00:00" forces local-timezone interpretation so the day name
 * matches the user's clock rather than UTC.
 */
export function formatDateDisplay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
  })
}

/**
 * Returns the ISO date string of the Monday that starts the calendar week
 * containing the given date. Used consistently by lib/coach.ts and
 * lib/time-entries.ts so both sides of the focus-hours calculation agree.
 */
export function getWeekStart(isoDate: string): string {
  const d   = new Date(`${isoDate}T00:00:00`)
  const day = d.getDay()                    // 0 = Sun, 1 = Mon, …
  const diff = day === 0 ? -6 : 1 - day    // shift back to Monday
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}
