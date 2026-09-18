import { GOAL_PRESETS, type GoalPreset } from '../lib/goal'
import './GoalPicker.css'

export function GoalPicker({
  preset,
  customValue,
  name,
  onPreset,
  onCustomValue,
}: {
  preset: GoalPreset
  customValue: number
  name: string
  onPreset: (preset: GoalPreset) => void
  onCustomValue: (value: number) => void
}) {
  return (
    <>
      <div className="goal-segments" role="radiogroup" aria-label="Daily goal">
        {GOAL_PRESETS.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={option === preset}
            className={`goal-segments__item${option === preset ? ' is-selected' : ''}`}
            onClick={() => onPreset(option)}
          >
            {option}
          </button>
        ))}
      </div>

      {preset === 'Custom' && (
        <div className="goal-custom">
          <div>
            <div className="goal-custom__title">Custom goal</div>
            <div className="goal-custom__sub">{name.trim() || 'Counter'} per day</div>
          </div>
          <div className="goal-custom__stepper">
            <button
              type="button"
              className="goal-custom__button"
              aria-label="Decrease goal"
              onClick={() => onCustomValue(Math.max(1, customValue - 1))}
            >
              <span className="goal-custom__minus" />
            </button>
            <div className="goal-custom__value display">{customValue}</div>
            <button
              type="button"
              className="goal-custom__button goal-custom__button--up"
              aria-label="Increase goal"
              onClick={() => onCustomValue(customValue + 1)}
            >
              <span className="goal-custom__plus" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
