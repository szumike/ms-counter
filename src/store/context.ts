import { createContext, useContext } from 'react'
import type { Counter, ThemeChoice } from '../lib/types'
import type { DayKey } from '../lib/date'

export type NewCounterInput = {
  name: string
  emoji: string
  goal: number | null
}

export type PendingUndo = {
  id: string
  name: string
  value: number
  day: DayKey
}

export type CountersApi = {
  counters: Counter[]
  /** Today's local day key, refreshed whenever the app rolls over. */
  today: DayKey
  getCounter: (id: string) => Counter | undefined
  addCounter: (input: NewCounterInput) => string
  updateCounter: (id: string, patch: NewCounterInput) => void
  removeCounter: (id: string) => void
  bump: (id: string, delta: number, day?: DayKey) => void
  reset: (id: string, day?: DayKey) => void
  pendingUndo: PendingUndo | null
  undoReset: () => void
  dismissUndo: () => void
}

export const CountersContext = createContext<CountersApi | null>(null)

export function useCounters(): CountersApi {
  const value = useContext(CountersContext)
  if (!value) throw new Error('useCounters must be used inside <AppProvider>')
  return value
}

export type ThemeApi = {
  choice: ThemeChoice
  resolved: 'light' | 'dark'
  setChoice: (choice: ThemeChoice) => void
}

export const ThemeContext = createContext<ThemeApi | null>(null)

export function useTheme(): ThemeApi {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside <AppProvider>')
  return value
}
