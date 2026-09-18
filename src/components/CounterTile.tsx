import { Link } from 'react-router-dom'
import type { Counter } from '../lib/types'
import './CounterTile.css'

function subtitle(counter: Counter): string {
  if (counter.goal === null) return 'no goal · lower is better'
  return `goal ${counter.goal} · ${Math.round((100 * counter.value) / counter.goal)}%`
}

export function CounterTile({ counter }: { counter: Counter }) {
  return (
    <Link className="tile" to={`/c/${counter.id}`}>
      <span className="tile__emoji" aria-hidden="true">
        {counter.emoji}
      </span>
      <span className="tile__text">
        <span className="tile__name">{counter.name}</span>
        <span className="tile__sub">{subtitle(counter)}</span>
      </span>
      <span className="tile__value display">{counter.value}</span>
    </Link>
  )
}
