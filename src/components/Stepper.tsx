import './Stepper.css'

/** The minus / plus pair on the detail screen. `pulse` drives the tap spring. */
export function Stepper({
  onDecrement,
  onIncrement,
  pulse,
}: {
  onDecrement: () => void
  onIncrement: () => void
  pulse: 'up' | 'down' | null
}) {
  return (
    <div className="stepper">
      <button
        type="button"
        className={`stepper__minus${pulse === 'down' ? ' is-pulsing' : ''}`}
        aria-label="Decrease by one"
        onClick={onDecrement}
      >
        <span className="stepper__bar" />
      </button>
      <button
        type="button"
        className={`stepper__plus${pulse === 'up' ? ' is-pulsing' : ''}`}
        aria-label="Increase by one"
        onClick={onIncrement}
      >
        <span className="stepper__cross" />
      </button>
    </div>
  )
}
