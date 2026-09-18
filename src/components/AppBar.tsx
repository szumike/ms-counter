import type { ReactNode } from 'react'
import './AppBar.css'

/** The thin action row at the top of the detail and form screens. */
export function AppBar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="appbar">
      <div className="appbar__side">{left}</div>
      <div className="appbar__side appbar__side--end">{right}</div>
    </div>
  )
}
