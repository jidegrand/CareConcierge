import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CUSTOM_REQUEST_TYPE_ID } from '@/lib/constants'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import MicIcon from '@/components/MicIcon'

const MAX_LENGTH = 500
const MIN_LENGTH = 2

export interface CustomRequestRow {
  id: string
  type: string
  custom_text: string
  status: 'pending'
  created_at: string
}

interface CustomRequestFormProps {
  roomId: string
  disabled: boolean
  onSubmitted: (request: CustomRequestRow) => void
}

export default function CustomRequestForm({ roomId, disabled, onSubmitted }: CustomRequestFormProps) {
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

    const { data, error: err } = await supabase
      .from('requests')
      .insert({
        room_id: roomId,
        type: CUSTOM_REQUEST_TYPE_ID,
        custom_text: trimmed.slice(0, MAX_LENGTH),
        is_urgent: false,
        status: 'pending',
      })
      .select('id, type, custom_text, status, created_at')
      .single()

    if (err) {
      setError(err.message)
      setSubmitting(false)
      return
    }

    setText('')
    setSubmitting(false)
    onSubmitted(data as CustomRequestRow)
  }

  return (
    <div className="px-5 mb-6">
      <div
        className="rounded-[22px] border px-5 py-5"
        style={{ background: 'var(--patient-card-bg-1)', borderColor: 'var(--patient-card-border)' }}>
        <p className="text-[15px] font-bold mb-1" style={{ color: 'var(--patient-text)' }}>
          Need something else?
        </p>
        <p className="text-[12px] mb-3" style={{ color: 'var(--patient-text-muted)' }}>
          Type or speak a request that isn't covered above.
        </p>

        <textarea
          value={text}
          onChange={event => setText(event.target.value)}
          disabled={disabled || submitting}
          maxLength={MAX_LENGTH}
          placeholder="Describe what you need (e.g. &quot;My IV pump is beeping&quot;)"
          rows={3}
          className="w-full rounded-2xl border px-4 py-3 text-sm resize-none outline-none disabled:opacity-60"
          style={{
            background: 'var(--patient-surface-alt)',
            borderColor: 'var(--patient-card-border)',
            color: 'var(--patient-text)',
          }}
        />

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={toggleVoice}
            disabled={disabled || submitting || !isVoiceSupported}
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full transition-transform active:scale-[0.94] disabled:opacity-50 ${isListening ? 'animate-pulse' : ''}`}
            style={{ background: isListening ? '#ff6b6b' : 'var(--patient-accent)' }}
            aria-label={isListening ? 'Stop listening' : 'Speak your request'}>
            <MicIcon />
          </button>
          <span className="text-[13px]" style={{ color: 'var(--patient-text-muted)' }}>
            {!isVoiceSupported
              ? "Voice isn't supported on this browser — you can still type."
              : isListening ? 'Listening… tap the mic to stop' : 'Tap to speak your request'}
          </span>
        </div>

        {error && (
          <p className="mt-3 text-xs font-medium text-red-600">{error}</p>
        )}

        {text.trim() && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || disabled || text.trim().length < MIN_LENGTH}
            className="mt-3 w-full rounded-2xl px-4 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'var(--patient-accent)' }}>
            {submitting ? 'Sending…' : 'Send Request'}
          </button>
        )}
      </div>
    </div>
  )
}
