import { EMOJI_OPTIONS } from '../lib/emoji'
import './EmojiPicker.css'

export function EmojiPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (emoji: string) => void
}) {
  return (
    <div className="emoji-grid" role="radiogroup" aria-label="Icon">
      {EMOJI_OPTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          role="radio"
          aria-checked={emoji === value}
          aria-label={`Icon ${emoji}`}
          className={`emoji-grid__cell${emoji === value ? ' is-selected' : ''}`}
          onClick={() => onChange(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}
