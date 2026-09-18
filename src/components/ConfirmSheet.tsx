import { useEffect } from 'react'
import './ConfirmSheet.css'

export function ConfirmSheet({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="sheet">
      <button type="button" className="sheet__scrim" aria-label="Dismiss" onClick={onCancel} />
      <div className="sheet__panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet__title">{title}</div>
        <p className="sheet__body">{body}</p>
        <button type="button" className="sheet__confirm" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" className="sheet__cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
