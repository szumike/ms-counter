import { describe, expect, it } from 'vitest'
import { addDays, dayKey, lastNDayKeys, msUntilNextMidnight } from './date'
import { chartPaths, series } from './chart'
import { emptyState, parseState, rollCounter, rollCounters } from './storage'
import type { Counter } from './types'

function makeCounter(over: Partial<Counter> = {}): Counter {
  return {
    id: 'c1',
    name: 'Water',
    emoji: '💧',
    goal: 8,
    value: 6,
    history: {},
    lastActiveDay: '2026-09-18',
    createdAt: '2026-09-01T00:00:00.000Z',
    order: 0,
    ...over,
  }
}

describe('date', () => {
  it('formats local calendar days, not UTC ones', () => {
    // 23:30 local on the 18th must stay the 18th even when UTC has ticked over.
    expect(dayKey(new Date(2026, 8, 18, 23, 30))).toBe('2026-09-18')
  })

  it('crosses month and year boundaries', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('handles a DST transition without dropping or repeating a day', () => {
    // Europe/Warsaw falls back on 2026-10-25.
    expect(lastNDayKeys(3, '2026-10-26')).toEqual(['2026-10-24', '2026-10-25', '2026-10-26'])
  })

  it('counts down to the next local midnight', () => {
    expect(msUntilNextMidnight(new Date(2026, 8, 18, 23, 59, 30))).toBe(30_000)
  })
})

describe('rollover', () => {
  it('does nothing when the counter is already on today', () => {
    const counter = makeCounter()
    expect(rollCounter(counter, '2026-09-18')).toBe(counter)
  })

  it('closes out the last active day and zeroes today', () => {
    const rolled = rollCounter(makeCounter({ value: 6 }), '2026-09-19')
    expect(rolled.value).toBe(0)
    expect(rolled.lastActiveDay).toBe('2026-09-19')
    expect(rolled.history['2026-09-18']).toBe(6)
  })

  it('records skipped days as zero', () => {
    const rolled = rollCounter(makeCounter({ value: 4 }), '2026-09-22')
    expect(rolled.history).toEqual({
      '2026-09-18': 4,
      '2026-09-19': 0,
      '2026-09-20': 0,
      '2026-09-21': 0,
    })
  })

  it('prunes history beyond the retention window', () => {
    const rolled = rollCounter(
      makeCounter({ history: { '2026-01-01': 9, '2026-09-17': 3 }, value: 1 }),
      '2026-09-19',
    )
    expect(rolled.history['2026-01-01']).toBeUndefined()
    expect(rolled.history['2026-09-17']).toBe(3)
  })

  it('clamps a very long absence to the retention window', () => {
    // Six years away: the old value is long past keeping, and the zero-fill
    // must not walk two thousand days to work that out.
    const rolled = rollCounter(makeCounter({ lastActiveDay: '2020-01-01', value: 6 }), '2026-09-18')
    const days = Object.keys(rolled.history)

    expect(rolled.value).toBe(0)
    expect(rolled.lastActiveDay).toBe('2026-09-18')
    expect(rolled.history['2020-01-01']).toBeUndefined()
    expect(days).toHaveLength(60)
    expect(days[0]).toBe('2026-07-20')
    expect(new Set(Object.values(rolled.history))).toEqual(new Set([0]))
  })

  it('keeps the array identity when no counter is stale', () => {
    const counters = [makeCounter()]
    expect(rollCounters(counters, '2026-09-18')).toBe(counters)
  })
})

describe('chart', () => {
  it('draws a flat baseline for an all-zero series instead of dividing by zero', () => {
    const paths = chartPaths([0, 0, 0], 298, 112, 10)
    expect(paths.line).toBe('M10.0 102.0 L149.0 102.0 L288.0 102.0')
    expect(paths.avg).toBe(0)
    expect(Number.isFinite(paths.dotY)).toBe(true)
  })

  it('places a single point without producing NaN', () => {
    const paths = chartPaths([5], 298, 112, 10)
    expect(paths.line).toBe('M10.0 10.0')
    expect(paths.dotX).toBe(10)
    expect(paths.area).toContain('Z')
  })

  it('closes the area path back along the baseline', () => {
    const paths = chartPaths([1, 2], 100, 50, 5)
    expect(paths.area.endsWith('L5.0 45 Z')).toBe(true)
  })

  it('reads history for past days and the live value for today', () => {
    const counter = makeCounter({
      value: 7,
      history: { '2026-09-16': 3, '2026-09-17': 5 },
    })
    expect(series(counter, 3, '2026-09-18')).toEqual([3, 5, 7])
  })

  it('treats days with no record as zero', () => {
    expect(series(makeCounter({ value: 2, history: {} }), 3, '2026-09-18')).toEqual([0, 0, 2])
  })
})

describe('parseState', () => {
  it('falls back to a clean slate on malformed JSON', () => {
    expect(parseState('{not json')).toEqual(emptyState())
    expect(parseState(null)).toEqual(emptyState())
    expect(parseState('"a string"')).toEqual(emptyState())
  })

  it('drops counters that are missing an id or name', () => {
    const raw = JSON.stringify({ counters: [{ id: 'a' }, { id: 'b', name: 'Coffee' }] })
    const state = parseState(raw)
    expect(state.counters.map((c) => c.id)).toEqual(['b'])
  })

  it('coerces out-of-range fields to safe defaults', () => {
    const raw = JSON.stringify({
      counters: [{ id: 'a', name: 'X', value: -4, goal: 0, history: { nope: 1, '2026-09-17': 2 } }],
    })
    const [counter] = parseState(raw).counters
    expect(counter.value).toBe(0)
    expect(counter.goal).toBeNull()
    expect(counter.history).toEqual({ '2026-09-17': 2 })
  })

  it('rejects an unknown theme', () => {
    expect(parseState(JSON.stringify({ settings: { theme: 'neon' } })).settings.theme).toBe('system')
    expect(parseState(JSON.stringify({ settings: { theme: 'dark' } })).settings.theme).toBe('dark')
  })

  it('renumbers order so the list is stable', () => {
    const raw = JSON.stringify({
      counters: [
        { id: 'a', name: 'A', order: 9 },
        { id: 'b', name: 'B', order: 2 },
      ],
    })
    expect(parseState(raw).counters.map((c) => [c.id, c.order])).toEqual([
      ['b', 0],
      ['a', 1],
    ])
  })
})
