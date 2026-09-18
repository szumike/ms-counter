import type { Counter, PersistedState, Settings, ThemeChoice } from './types'
import { addDays, isDayKey, todayKey, type DayKey } from './date'

export const STORAGE_KEY = 'ms-counter:v1'

/** The chart never looks back further than 30 days; keep a little slack. */
const HISTORY_RETENTION_DAYS = 60

export function emptyState(): PersistedState {
  return { schemaVersion: 1, counters: [], settings: { theme: 'system' } }
}

const THEMES: ThemeChoice[] = ['system', 'light', 'dark']

function parseCounter(raw: unknown, index: number): Counter | null {
  if (typeof raw !== 'object' || raw === null) return null
  const c = raw as Record<string, unknown>
  if (typeof c.id !== 'string' || typeof c.name !== 'string') return null

  const history: Record<DayKey, number> = {}
  if (typeof c.history === 'object' && c.history !== null) {
    for (const [key, value] of Object.entries(c.history)) {
      if (isDayKey(key) && typeof value === 'number' && Number.isFinite(value)) {
        history[key] = Math.max(0, Math.round(value))
      }
    }
  }

  return {
    id: c.id,
    name: c.name,
    emoji: typeof c.emoji === 'string' && c.emoji ? c.emoji : '🔢',
    goal: typeof c.goal === 'number' && Number.isFinite(c.goal) && c.goal > 0 ? c.goal : null,
    value: typeof c.value === 'number' && Number.isFinite(c.value) ? Math.max(0, Math.round(c.value)) : 0,
    history,
    lastActiveDay: isDayKey(c.lastActiveDay) ? c.lastActiveDay : todayKey(),
    createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date().toISOString(),
    order: typeof c.order === 'number' && Number.isFinite(c.order) ? c.order : index,
  }
}

function parseSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return { theme: 'system' }
  const theme = (raw as Record<string, unknown>).theme
  return { theme: THEMES.includes(theme as ThemeChoice) ? (theme as ThemeChoice) : 'system' }
}

/**
 * Reads persisted state, tolerating anything. A corrupt or partially-written
 * blob degrades to a clean slate instead of bricking the app on launch.
 */
export function parseState(raw: string | null): PersistedState {
  if (!raw) return emptyState()
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return emptyState()
  }
  if (typeof parsed !== 'object' || parsed === null) return emptyState()

  const obj = parsed as Record<string, unknown>
  const counters = Array.isArray(obj.counters)
    ? obj.counters.map(parseCounter).filter((c): c is Counter => c !== null)
    : []

  return {
    schemaVersion: 1,
    counters: counters.sort((a, b) => a.order - b.order).map((c, i) => ({ ...c, order: i })),
    settings: parseSettings(obj.settings),
  }
}

export function load(): PersistedState {
  try {
    return parseState(localStorage.getItem(STORAGE_KEY))
  } catch {
    // Private-mode Safari and friends can throw on read.
    return emptyState()
  }
}

export function save(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota or disabled storage — nothing useful to do, keep the app running.
  }
}

function historyCutoff(today: DayKey): DayKey {
  return addDays(today, -HISTORY_RETENTION_DAYS)
}

function pruneHistory(history: Record<DayKey, number>, today: DayKey): Record<DayKey, number> {
  const cutoff = historyCutoff(today)
  const kept: Record<DayKey, number> = {}
  for (const [key, value] of Object.entries(history)) {
    if (key >= cutoff) kept[key] = value
  }
  return kept
}

/**
 * Closes out every day that has passed since a counter was last touched:
 * the day it belonged to keeps its final value, days the app was never opened
 * record 0, and today starts fresh.
 *
 * Everything is clamped to the retention window, so reopening the app after a
 * year away costs a handful of iterations rather than hundreds.
 */
export function rollCounter(counter: Counter, today: DayKey): Counter {
  if (counter.lastActiveDay >= today) return counter

  const cutoff = historyCutoff(today)
  const history = pruneHistory(counter.history, today)

  if (counter.lastActiveDay >= cutoff) history[counter.lastActiveDay] = counter.value

  const firstGapDay =
    counter.lastActiveDay >= cutoff ? addDays(counter.lastActiveDay, 1) : cutoff
  for (let day = firstGapDay; day < today; day = addDays(day, 1)) {
    history[day] = 0
  }

  return { ...counter, value: 0, lastActiveDay: today, history }
}

/** Returns the same array reference when nothing rolled over, so React can skip the update. */
export function rollCounters(counters: Counter[], today: DayKey): Counter[] {
  if (!counters.some((c) => c.lastActiveDay < today)) return counters
  return counters.map((c) => rollCounter(c, today))
}
