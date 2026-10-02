import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useCounters } from '../store/context'
import { AppBar } from '../components/AppBar'
import { Stepper } from '../components/Stepper'
import { HistoryCard } from '../components/HistoryCard'
import { DayNav } from '../components/DayNav'
import { Toast } from '../components/Toast'
import { valueOn } from '../lib/chart'
import { EDITABLE_PAST_DAYS, addDays, daysBetween, longDayLabel, type DayKey } from '../lib/date'
import './DetailScreen.css'

const PULSE_MS = 170

type Range = 7 | 14 | 30

/** Smallest history range that still shows a day `back` days ago. */
function rangeFor(back: number, current: Range): Range {
  if (back < current) return current
  return back >= 14 ? 30 : 14
}

export function DetailScreen() {
  const { id = '' } = useParams()
  const { getCounter, today, bump, reset, pendingUndo, undoReset } = useCounters()
  const counter = getCounter(id)

  const [pulse, setPulse] = useState<'up' | 'down' | null>(null)
  // null follows today, so the screen stays on today across midnight.
  const [selected, setSelected] = useState<DayKey | null>(null)
  const [range, setRange] = useState<Range>(7)
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(pulseTimer.current), [])

  if (!counter) return <Navigate to="/" replace />

  const oldest = addDays(today, -EDITABLE_PAST_DAYS)
  const pinned = selected !== null && selected < today ? (selected < oldest ? oldest : selected) : null
  const day = pinned ?? today
  const isToday = day === today
  // Derived each render: a pinned day can slip out of the stored range at midnight.
  const effectiveRange = rangeFor(daysBetween(day, today), range)
  const dayValue = valueOn(counter, day, today)

  const selectDay = (next: DayKey | null) => {
    setSelected(next)
    if (next) setRange((r) => rangeFor(daysBetween(next, today), r))
  }

  const pickRange = (n: Range) => {
    setRange(n)
    if (daysBetween(day, today) > n - 1) setSelected(addDays(today, -(n - 1)))
  }

  const tap = (direction: 'up' | 'down') => {
    clearTimeout(pulseTimer.current)
    setPulse(direction)
    pulseTimer.current = setTimeout(() => setPulse(null), PULSE_MS)
    bump(counter.id, direction === 'up' ? 1 : -1, day)
  }

  return (
    <div className="screen detail">
      <AppBar
        left={
          <Link className="appbar__action" to="/">
            ‹ Counters
          </Link>
        }
        right={
          <Link className="appbar__action appbar__action--strong" to={`/c/${counter.id}/edit`}>
            Edit
          </Link>
        }
      />

      <div className="scroll detail__body">
        <div className="detail__chip">
          <span className="detail__chip-emoji" aria-hidden="true">
            {counter.emoji}
          </span>
          <span className="detail__chip-name">{counter.name}</span>
        </div>

        <DayNav day={day} today={today} onChange={selectDay} />

        <div className={`detail__value display${pulse ? ` is-${pulse}` : ''}`}>{dayValue}</div>
        {(isToday || counter.goal !== null) && (
          <div className="detail__goal">
            {counter.goal === null ? 'today' : `of ${counter.goal}${isToday ? ' today' : ''}`}
          </div>
        )}

        <Stepper
          pulse={pulse}
          onIncrement={() => tap('up')}
          onDecrement={() => tap('down')}
        />

        <button
          type="button"
          className="detail__reset"
          disabled={dayValue === 0}
          onClick={() => reset(counter.id, day)}
        >
          Reset to zero
        </button>

        <HistoryCard
          counter={counter}
          today={today}
          range={effectiveRange}
          onRangeChange={pickRange}
          selectedDay={day}
          onSelectDay={selectDay}
        />
      </div>

      {pendingUndo && (
        <Toast
          message={`Reset ${pendingUndo.day === today ? pendingUndo.name : longDayLabel(pendingUndo.day)} to 0`}
          actionLabel="Undo"
          onAction={undoReset}
        />
      )}
    </div>
  )
}
