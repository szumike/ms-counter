/**
 * Day keys are local-calendar `YYYY-MM-DD` strings. Everything in the app that
 * talks about "a day" uses them, so a counter rolls over at the user's midnight
 * rather than UTC's.
 */
export type DayKey = string

export function dayKey(date: Date): DayKey {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayKey(now: Date = new Date()): DayKey {
  return dayKey(now)
}

export function parseDayKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: DayKey, days: number): DayKey {
  const date = parseDayKey(key)
  date.setDate(date.getDate() + days)
  return dayKey(date)
}

/** Day keys for the `n` days ending at `end`, oldest first. */
export function lastNDayKeys(n: number, end: DayKey = todayKey()): DayKey[] {
  const keys: DayKey[] = []
  for (let i = n - 1; i >= 0; i--) keys.push(addDays(end, -i))
  return keys
}

export function isDayKey(value: unknown): value is DayKey {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** Milliseconds until the next local midnight, used to arm the rollover timer. */
export function msUntilNextMidnight(now: Date = new Date()): number {
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return Math.max(0, next.getTime() - now.getTime())
}
