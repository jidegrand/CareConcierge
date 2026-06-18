import { useState } from 'react'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import MicIcon from '@/components/MicIcon'

const MAX_LENGTH = 500
const MIN_LENGTH = 2

interface SubmitResult {
  success: boolean
  error?: string
  requestId?: string
}

interface FamilyCustomRequestFormProps {
  disabled: boolean
  onSubmit: (text: string) => Promise<SubmitResult>
  onSubmitted: (requestId: string, text: string) => void
}

export default function FamilyCustomRequestForm({ disabled, onSubmit, onSubmitted }: FamilyCustomRequestFormProps) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isListening, isSupported: isVoiceSupported, toggle: toggleVoice, stop: stopVoice } = useSpeechToText(setText)

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (trimmed.length < MIN_LENGTH || submitting || disabled) return

    stopVoice()
    setSubmitting(true)
    setError(null)

    const result = await onSubmit(trimmed.slice(0, MAX_LENGTH))
    setSubmitting(false)

    if (!result.success || !result.requestId) {
      setError(result.error ?? 'Failed to send request.')
      return
    }

    setText('')
    onSubmitted(result.requestId, trimmed.slice(0, MAX_LENGTH))
  }

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] mb-3">
        Need something else?
      </p>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <textarea
          value={text}
          onChange={event => setText(event.target.value)}
          disabled={disabled || submitting}
          maxLength={MAX_LENGTH}
          placeholder="Type or speak a request that isn't covered above"
          rows={3}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--page-bg)] px-3 py-2.5 text-sm text-[var(--text-primary)] resize-none outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]/20 focus:border-[var(--clinical-blue)] disabled:opacity-60"
        />

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={toggleVoice}
            disabled={disabled || submitting || !isVoiceSupported}
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-transform active:scale-[0.94] disabled:opacity-50 ${isListening ? 'animate-pulse' : ''}`}
            style={{ background: isListening ? '#ff6b6b' : 'var(--clinical-blue)' }}
            aria-label={isListening ? 'Stop listening' : 'Speak your request'}>
            <MicIcon size={18} />
          </button>
          <span className="text-[12px] text-[var(--text-muted)]">
            {!isVoiceSupported
              ? "Voice isn't supported on this browser — you can still type."
              : isListening ? 'Listening… tap the mic to stop' : 'Tap to speak your request'}
          </span>
        </div>

        {error && <p className="mt-3 text-xs font-medium text-[var(--danger)]">{error}</p>}

        {text.trim() && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || disabled || text.trim().length < MIN_LENGTH}
            className="mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'var(--clinical-blue)' }}>
            {submitting ? 'Sending…' : 'Send Request'}
          </button>
        )}
      </div>
    </div>
  )
}
