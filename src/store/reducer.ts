import type { Counter, PersistedState, ThemeChoice } from '../lib/types'
import { addDays, EDITABLE_PAST_DAYS, type DayKey } from '../lib/date'
import { valueOn } from '../lib/chart'
import { rollCounter, rollCounters } from '../lib/storage'
import type { NewCounterInput } from './context'

export type Action =
  | { type: 'rollover'; today: DayKey }
  | { type: 'add'; id: string; input: NewCounterInput; today: DayKey }
  | { type: 'update'; id: string; input: NewCounterInput }
  | { type: 'remove'; id: string }
  | { type: 'bump'; id: string; delta: number; today: DayKey; day?: DayKey }
  | { type: 'setValue'; id: string; value: number; today: DayKey; day?: DayKey }
  | { type: 'theme'; theme: ThemeChoice }

/**
 * Every mutation that touches a value rolls the counter first, so a tap made
 * after midnight but before the rollover timer fires lands on the new day.
 */
function mapCounter(
  state: PersistedState,
  id: string,
  today: DayKey,
  fn: (counter: Counter) => Counter,
): PersistedState {
  return {
    ...state,
    counters: state.counters.map((c) => (c.id === id ? fn(rollCounter(c, today)) : rollCounter(c, today))),
  }
}

/** Writes `next(current)` to the selected day; a missing day means today. */
function writeDay(
  state: PersistedState,
  id: string,
  today: DayKey,
  day: DayKey | undefined,
  next: (current: number) => number,
): PersistedState {
  const target = day ?? today
  if (target > today || target < addDays(today, -EDITABLE_PAST_DAYS)) return state
  return mapCounter(state, id, today, (c) => {
    const value = Math.max(0, next(valueOn(c, target, today)))
    return target === today ? { ...c, value } : { ...c, history: { ...c.history, [target]: value } }
  })
}

export function reducer(state: PersistedState, action: Action): PersistedState {
  switch (action.type) {
    case 'rollover': {
      const counters = rollCounters(state.counters, action.today)
      return counters === state.counters ? state : { ...state, counters }
    }

    case 'add': {
      const counter: Counter = {
        id: action.id,
        name: action.input.name,
        emoji: action.input.emoji,
        goal: action.input.goal,
        value: 0,
        history: {},
        lastActiveDay: action.today,
        createdAt: new Date().toISOString(),
        order: state.counters.length,
      }
      return { ...state, counters: [...state.counters, counter] }
    }

    case 'update':
      return {
        ...state,
        counters: state.counters.map((c) =>
          c.id === action.id
            ? { ...c, name: action.input.name, emoji: action.input.emoji, goal: action.input.goal }
            : c,
        ),
      }

    case 'remove':
      return {
        ...state,
        counters: state.counters
          .filter((c) => c.id !== action.id)
          .map((c, i) => ({ ...c, order: i })),
      }

    case 'bump':
      return writeDay(state, action.id, action.today, action.day, (v) => v + action.delta)

    case 'setValue':
      return writeDay(state, action.id, action.today, action.day, () => action.value)

    case 'theme':
      return { ...state, settings: { ...state.settings, theme: action.theme } }
  }
}
