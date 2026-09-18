import { Link } from 'react-router-dom'
import './EmptyState.css'

export function EmptyState() {
  return (
    <div className="empty">
      <div className="empty__mark">
        <span className="empty__zero display">0</span>
      </div>
      <h2 className="empty__title display">Nothing counted yet</h2>
      <p className="empty__body">
        Make a counter for anything you want to keep an eye on — glasses of water, pushups,
        cigarettes skipped.
      </p>
      <Link className="empty__cta" to="/new">
        Create your first counter
      </Link>
    </div>
  )
}
