import './Toast.css'

export function Toast({
  message,
  actionLabel,
  onAction,
}: {
  message: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="toast" role="status">
      <span className="toast__message">{message}</span>
      <button type="button" className="toast__action" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  )
}
