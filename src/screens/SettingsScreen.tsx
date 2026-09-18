import { Link } from 'react-router-dom'
import { useTheme } from '../store/context'
import { AppBar } from '../components/AppBar'
import type { ThemeChoice } from '../lib/types'
import './SettingsScreen.css'

const OPTIONS: { value: ThemeChoice; label: string; hint: string }[] = [
  { value: 'system', label: 'System', hint: 'Follow the phone' },
  { value: 'light', label: 'Light', hint: 'Always light' },
  { value: 'dark', label: 'Dark', hint: 'Always dark' },
]

export function SettingsScreen() {
  const { choice, setChoice } = useTheme()

  return (
    <div className="screen settings">
      <AppBar
        left={
          <Link className="appbar__action" to="/">
            ‹ Counters
          </Link>
        }
      />

      <div className="scroll settings__body">
        <h1 className="settings__title display">Settings</h1>

        <div className="section-label">Appearance</div>
        <div className="settings__group card" role="radiogroup" aria-label="Appearance">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={option.value === choice}
              className="settings__row"
              onClick={() => setChoice(option.value)}
            >
              <span className="settings__row-text">
                <span className="settings__row-label">{option.label}</span>
                <span className="settings__row-hint">{option.hint}</span>
              </span>
              {option.value === choice && (
                <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
                  <path
                    d="M4 10.5 8 14.5 16 6"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>

        <p className="settings__note">
          Counters are stored on this device only. Nothing leaves your phone.
        </p>
      </div>
    </div>
  )
}
