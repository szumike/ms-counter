import { useEffect, useRef } from 'react'
import { EDITABLE_PAST_DAYS, addDays, longDayLabel, daysBetween, dayLabel, type DayKey } from '../lib/date'
import './DayNav.css'

/** Previous / next day arrows with the selected day's label. `null` from onChange means today. */
export function DayNav({
  day,
  today,
  onChange,
}: {
  day: DayKey
  today: DayKey
  onChange: (day: DayKey | null) => void
}) {
  const isToday = day === today
  const atOldest = daysBetween(day, today) >= EDITABLE_PAST_DAYS

  const prevRef = useRef<HTMLButtonElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  // A focused arrow that becomes disabled would drop focus to <body>; hand it to the other arrow.
  useEffect(() => {
    if (atOldest && document.activeElement === prevRef.current) nextRef.current?.focus()
    else if (isToday && document.activeElement === nextRef.current) prevRef.current?.focus()
  }, [atOldest, isToday])

  const goNext = () => {
    const next = addDays(day, 1)
    onChange(next >= today ? null : next)
  }

  return (
    <div className="daynav">
      <button
        type="button"
        className="daynav__arrow"
        ref={prevRef}
        aria-label="Previous day"
        disabled={atOldest}
        onClick={() => onChange(addDays(day, -1))}
      >
        ‹
      </button>
      <div className="daynav__center">
        <div className={`daynav__label${isToday ? '' : ' is-past'}`} aria-live="polite">{dayLabel(day, today)}</div>
        {isToday ? (
          <div className="daynav__sub">{longDayLabel(day)}</div>
        ) : (
          <button type="button" className="daynav__sub daynav__back" onClick={() => {
              onChange(null)
              prevRef.current?.focus()
            }}
          >
            Back to today
          </button>
        )}
      </div>
      <button
        type="button"
        className="daynav__arrow"
        ref={nextRef}
        aria-label="Next day"
        disabled={isToday}
        onClick={goNext}
      >
        ›
      </button>
    </div>
  )
}
