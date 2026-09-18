import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useCounters } from '../store/context'
import { AppBar } from '../components/AppBar'
import { Stepper } from '../components/Stepper'
import { HistoryCard } from '../components/HistoryCard'
import { Toast } from '../components/Toast'
import './DetailScreen.css'

const PULSE_MS = 170

export function DetailScreen() {
  const { id = '' } = useParams()
  const { getCounter, today, bump, reset, pendingUndo, undoReset } = useCounters()
  const counter = getCounter(id)

  const [pulse, setPulse] = useState<'up' | 'down' | null>(null)
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(pulseTimer.current), [])

  if (!counter) return <Navigate to="/" replace />

  const tap = (direction: 'up' | 'down') => {
    clearTimeout(pulseTimer.current)
    setPulse(direction)
    pulseTimer.current = setTimeout(() => setPulse(null), PULSE_MS)
    bump(counter.id, direction === 'up' ? 1 : -1)
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

        <div className={`detail__value display${pulse ? ` is-${pulse}` : ''}`}>{counter.value}</div>
        <div className="detail__goal">
          {counter.goal === null ? 'today' : `of ${counter.goal} today`}
        </div>

        <Stepper
          pulse={pulse}
          onIncrement={() => tap('up')}
          onDecrement={() => tap('down')}
        />

        <button
          type="button"
          className="detail__reset"
          disabled={counter.value === 0}
          onClick={() => reset(counter.id)}
        >
          Reset to zero
        </button>

        <HistoryCard counter={counter} today={today} />
      </div>

      {pendingUndo && (
        <Toast
          message={`Reset ${pendingUndo.name} to 0`}
          actionLabel="Undo"
          onAction={undoReset}
        />
      )}
    </div>
  )
}
