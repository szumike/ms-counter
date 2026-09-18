import { useMemo, useState } from 'react'
import { chartPaths, series } from '../lib/chart'
import type { Counter } from '../lib/types'
import './HistoryCard.css'

const RANGES = [7, 14, 30] as const
const W = 298
const H = 112
const PAD = 10

export function HistoryCard({ counter, today }: { counter: Counter; today: string }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>(7)

  const paths = useMemo(
    () => chartPaths(series(counter, range, today), W, H, PAD),
    [counter, range, today],
  )

  return (
    <div className="history card">
      <div className="history__head">
        <div className="history__title">History</div>
        <div className="history__ranges" role="group" aria-label="History range">
          {RANGES.map((n) => (
            <button
              key={n}
              type="button"
              className={`history__range${range === n ? ' is-active' : ''}`}
              aria-pressed={range === n}
              onClick={() => setRange(n)}
            >
              {n} days
            </button>
          ))}
        </div>
      </div>

      <svg
        className="history__chart"
        viewBox={`0 0 ${W} ${H}`}
        fill="none"
        role="img"
        aria-label={`Last ${range} days, averaging ${paths.avg} per day`}
      >
        <path d={paths.area} fill="var(--chart-fill)" />
        <path
          d={paths.line}
          stroke="var(--accent)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={paths.dotX}
          cy={paths.dotY}
          r="4.5"
          fill="var(--accent)"
          stroke="var(--surface)"
          strokeWidth="2.5"
        />
      </svg>

      <div className="history__axis">
        <span>{paths.first}</span>
        <span>avg {paths.avg}</span>
        <span>{paths.last}</span>
      </div>
    </div>
  )
}
