import type { DayKey } from './date'

export type Counter = {
  id: string
  name: string
  emoji: string
  /** `null` means the counter has no target — "lower is better". */
  goal: number | null
  /** Today's running count. */
  value: number
  /** Closed-out daily totals for past days, keyed by local day. */
  history: Record<DayKey, number>
  /** The day `value` belongs to; anything earlier means a rollover is due. */
  lastActiveDay: DayKey
  createdAt: string
  order: number
}

export type ThemeChoice = 'system' | 'light' | 'dark'

export type Settings = {
  theme: ThemeChoice
}

export type PersistedState = {
  schemaVersion: 1
  counters: Counter[]
  settings: Settings
}
