import { describe, expect, it } from 'vitest'
import { reducer } from './reducer'
import { addDays } from '../lib/date'
import type { Counter, PersistedState } from '../lib/types'

const TODAY = '2026-10-02'
const YESTERDAY = addDays(TODAY, -1)

function stateWith(patch: Partial<Counter> = {}): PersistedState {
  const counter: Counter = {
    id: 'a',
    name: 'Water',
    emoji: '💧',
    goal: null,
    value: 3,
    history: { [YESTERDAY]: 5 },
    lastActiveDay: TODAY,
    createdAt: '2026-01-01T00:00:00.000Z',
    order: 0,
    ...patch,
  }
  return { schemaVersion: 1, counters: [counter], settings: { theme: 'system' } }
}

const counterOf = (s: PersistedState) => s.counters[0]

describe('reducer day-aware writes', () => {
  it('bumps and sets today without a day', () => {
    const bumped = reducer(stateWith(), { type: 'bump', id: 'a', delta: 1, today: TODAY })
    expect(counterOf(bumped).value).toBe(4)
    const set = reducer(stateWith(), { type: 'setValue', id: 'a', value: 0, today: TODAY })
    expect(counterOf(set).value).toBe(0)
  })

  it('treats day === today as today', () => {
    const next = reducer(stateWith(), { type: 'bump', id: 'a', delta: 1, today: TODAY, day: TODAY })
    expect(counterOf(next).value).toBe(4)
    expect(counterOf(next).history).toEqual({ [YESTERDAY]: 5 })
  })

  it('bump on yesterday writes history and leaves value alone', () => {
    const next = reducer(stateWith(), { type: 'bump', id: 'a', delta: 1, today: TODAY, day: YESTERDAY })
    expect(counterOf(next).history[YESTERDAY]).toBe(6)
    expect(counterOf(next).value).toBe(3)
  })

  it('setValue on an unrecorded past day writes history', () => {
    const day = addDays(TODAY, -3)
    const next = reducer(stateWith(), { type: 'setValue', id: 'a', value: 7, today: TODAY, day })
    expect(counterOf(next).history[day]).toBe(7)
  })

  it('clamps a past day at 0', () => {
    const next = reducer(stateWith(), { type: 'bump', id: 'a', delta: -9, today: TODAY, day: YESTERDAY })
    expect(counterOf(next).history[YESTERDAY]).toBe(0)
  })

  it('ignores a future day and a day 30 back', () => {
    const state = stateWith()
    const future = reducer(state, { type: 'bump', id: 'a', delta: 1, today: TODAY, day: addDays(TODAY, 1) })
    const tooOld = reducer(state, { type: 'bump', id: 'a', delta: 1, today: TODAY, day: addDays(TODAY, -30) })
    expect(future).toBe(state)
    expect(tooOld).toBe(state)
  })

  it('allows the oldest editable day (29 back)', () => {
    const day = addDays(TODAY, -29)
    const next = reducer(stateWith(), { type: 'bump', id: 'a', delta: 1, today: TODAY, day })
    expect(counterOf(next).history[day]).toBe(1)
  })

  it('rolls first, so a stale day lands correctly after midnight', () => {
    // Counter last active yesterday with value 3; the user taps + on that same day after midnight.
    const state = stateWith({ lastActiveDay: YESTERDAY, value: 3, history: {} })
    const next = reducer(state, { type: 'bump', id: 'a', delta: 1, today: TODAY, day: YESTERDAY })
    expect(counterOf(next).history[YESTERDAY]).toBe(4)
    expect(counterOf(next).value).toBe(0)
    expect(counterOf(next).lastActiveDay).toBe(TODAY)
  })
})
