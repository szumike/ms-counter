import type { Counter } from './types'
import { lastNDayKeys } from './date'

export type ChartPaths = {
  line: string
  area: string
  dotX: number
  dotY: number
  avg: number
  first: string
  last: string
}

/**
 * Builds the SVG paths for the history sparkline. Ported from the design
 * prototype: the scale floor is 1 so an all-zero series still draws a flat
 * line along the bottom rather than dividing by zero.
 */
export function chartPaths(values: number[], w: number, h: number, pad: number): ChartPaths {
  const n = values.length
  const max = Math.max(1, ...values)
  const px = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, n - 1)
  const py = (v: number) => h - pad - (v / max) * (h - pad * 2)

  let line = ''
  values.forEach((v, i) => {
    line += `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(v).toFixed(1)} `
  })
  line = line.trim()

  const avg = values.reduce((a, b) => a + b, 0) / n
  const floor = h - pad

  return {
    line,
    area: `${line} L${px(n - 1).toFixed(1)} ${floor} L${px(0).toFixed(1)} ${floor} Z`,
    dotX: Number(px(n - 1).toFixed(1)),
    dotY: Number(py(values[n - 1]).toFixed(1)),
    avg: Number(avg.toFixed(1)),
    first: `${n} days ago`,
    last: 'today',
  }
}

/**
 * The last `days` daily totals for a counter: closed-out history for the past,
 * then today's live value as the final point. Days with no record read as 0.
 */
export function series(counter: Counter, days: number, today: string): number[] {
  const keys = lastNDayKeys(days, today)
  return keys.map((key) => (key === today ? counter.value : (counter.history[key] ?? 0)))
}
