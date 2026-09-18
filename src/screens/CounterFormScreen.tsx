import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useCounters } from '../store/context'
import { AppBar } from '../components/AppBar'
import { EmojiPicker } from '../components/EmojiPicker'
import { GoalPicker } from '../components/GoalPicker'
import { goalForPreset, presetForGoal, type GoalPreset } from '../lib/goal'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { DEFAULT_EMOJI } from '../lib/emoji'
import './CounterFormScreen.css'

const DEFAULT_CUSTOM_GOAL = 12

export function CounterFormScreen({ mode }: { mode: 'new' | 'edit' }) {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { getCounter, addCounter, updateCounter, removeCounter } = useCounters()
  const existing = mode === 'edit' ? getCounter(id) : undefined

  const [emoji, setEmoji] = useState(existing?.emoji ?? DEFAULT_EMOJI)
  const [name, setName] = useState(existing?.name ?? '')
  const [preset, setPreset] = useState<GoalPreset>(presetForGoal(existing?.goal ?? null))
  const [customValue, setCustomValue] = useState(
    existing?.goal && presetForGoal(existing.goal) === 'Custom' ? existing.goal : DEFAULT_CUSTOM_GOAL,
  )
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (mode === 'edit' && !existing) return <Navigate to="/" replace />

  const trimmed = name.trim()
  const canSave = trimmed.length > 0

  const save = () => {
    if (!canSave) return
    const input = { name: trimmed, emoji, goal: goalForPreset(preset, customValue) }
    if (existing) {
      updateCounter(existing.id, input)
      navigate(`/c/${existing.id}`, { replace: true })
    } else {
      const newId = addCounter(input)
      navigate(`/c/${newId}`, { replace: true })
    }
  }

  return (
    <div className="screen form">
      <AppBar
        left={
          <button
            type="button"
            className="appbar__action appbar__action--quiet"
            onClick={() => navigate(existing ? `/c/${existing.id}` : '/', { replace: true })}
          >
            Cancel
          </button>
        }
        right={
          <button
            type="button"
            className="appbar__action appbar__action--strong"
            disabled={!canSave}
            onClick={save}
          >
            Save
          </button>
        }
      />

      <div className="scroll form__body">
        <h1 className="form__title display">{existing ? 'Edit counter' : 'New counter'}</h1>

        <div className="form__preview card">
          <div className="form__preview-emoji" aria-hidden="true">
            {emoji}
          </div>
          <div className="form__preview-name">{trimmed || 'Untitled'}</div>
          <div className="form__preview-sub">
            {existing ? 'Resets daily at midnight' : 'Starts at 0 · resets daily'}
          </div>
        </div>

        <div className="section-label">Icon</div>
        <EmojiPicker value={emoji} onChange={setEmoji} />

        <label className="section-label" htmlFor="counter-name">
          Name
        </label>
        <div className="form__field">
          <input
            id="counter-name"
            className="form__input"
            type="text"
            value={name}
            maxLength={40}
            autoComplete="off"
            enterKeyHint="done"
            placeholder="Water"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur()
                save()
              }
            }}
          />
        </div>

        <div className="section-label">Daily goal</div>
        <GoalPicker
          preset={preset}
          customValue={customValue}
          name={trimmed}
          onPreset={setPreset}
          onCustomValue={setCustomValue}
        />

        {existing && (
          <button
            type="button"
            className="form__delete"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete counter
          </button>
        )}
      </div>

      {confirmingDelete && existing && (
        <ConfirmSheet
          title={`Delete ${existing.name}?`}
          body="This removes the counter and its entire history. It cannot be undone."
          confirmLabel="Delete counter"
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => {
            removeCounter(existing.id)
            navigate('/', { replace: true })
          }}
        />
      )}
    </div>
  )
}
