import { useMemo } from 'react'
import { chartPaths, series } from '../lib/chart'
import { addDays, daysBetween, longDayLabel, type DayKey } from '../lib/date'
import type { Counter } from '../lib/types'
import './HistoryCard.css'

const RANGES = [7, 14, 30] as const
type Range = (typeof RANGES)[number]
const W = 298
const H = 112
const PAD = 10

type Props = {
  counter: Counter
  today: DayKey
  range: Range
  onRangeChange: (n: Range) => void
  selectedDay: DayKey
  onSelectDay: (day: DayKey) => void
}

export function HistoryCard({ counter, today, range, onRangeChange, selectedDay, onSelectDay }: Props) {
  const selected = range - 1 - daysBetween(selectedDay, today)

  const paths = useMemo(
    () => chartPaths(series(counter, range, today), W, H, PAD, selected),
    [counter, range, today, selected],
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
              onClick={() => onRangeChange(n)}
            >
              {n} days
            </button>
          ))}
        </div>
      </div>

      <div className="history__plot">
        <svg
          className="history__chart"
          viewBox={`0 0 ${W} ${H}`}
          fill="none"
          role="img"
          aria-label={`Last ${range} days, averaging ${paths.avg} per day`}
        >
          <path
            d={paths.guide}
            stroke="var(--accent)"
            strokeOpacity="0.28"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
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
        <div className="history__hits">
          {Array.from({ length: range }, (_, i) => {
            const day = addDays(today, -(range - 1 - i))
            return (
              <button
                key={day}
                type="button"
                className="history__hit"
                aria-label={`Show ${longDayLabel(day)}`}
                aria-pressed={day === selectedDay}
                onClick={() => onSelectDay(day)}
              />
            )
          })}
        </div>
      </div>

      <div className="history__axis">
        <span>{paths.first}</span>
        <span>avg {paths.avg}</span>
        <span>{paths.last}</span>
      </div>
    </div>
  )
}
