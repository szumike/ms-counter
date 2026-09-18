import { Link } from 'react-router-dom'
import { useCounters } from '../store/context'
import { CounterTile } from '../components/CounterTile'
import { EmptyState } from '../components/EmptyState'
import './ListScreen.css'

export function ListScreen() {
  const { counters } = useCounters()

  return (
    <div className="screen list">
      <header className="list__head">
        <h1 className="list__title display">Counters</h1>
        <div className="list__actions">
          <Link className="list__settings" to="/settings" aria-label="Settings">
            ⚙️
          </Link>
          {counters.length > 0 && (
            <Link className="list__add" to="/new" aria-label="New counter">
              <span className="list__add-cross" />
            </Link>
          )}
        </div>
      </header>

      {counters.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="scroll list__scroll">
          <div className="list__tiles">
            {counters.map((counter) => (
              <CounterTile key={counter.id} counter={counter} />
            ))}
          </div>
          <p className="list__footer">
            Resets daily at midnight · {counters.length}{' '}
            {counters.length === 1 ? 'counter' : 'counters'}
          </p>
        </div>
      )}
    </div>
  )
}
