import { useRef, useState } from 'react'
import { matchSpokenRequestType, type PatientLanguage } from '@/lib/patientI18n'
import { SPEECH_LOCALE } from '@/lib/speech'

export interface VoiceRequestOption {
  id: string
  label: string      // current display label — used for matching speech and shown in "Matched to: …"
  baseLabel: string  // original/base label — passed through on confirm, same as a tile tap
  urgent: boolean
}

interface VoiceRequestSectionProps {
  language: PatientLanguage
  options: VoiceRequestOption[]
  disabled: boolean
  onConfirm: (typeId: string, baseLabel: string, urgent: boolean) => void
}

type Phase = 'listening' | 'reviewing' | 'no-match'

// Minimal typing for the non-standard Web Speech API — not part of lib.dom.d.ts.
interface SpeechRecognitionResultLike { [index: number]: { transcript: string } }
interface SpeechRecognitionEventLike extends Event { results: ArrayLike<SpeechRecognitionResultLike> }
interface SpeechRecognitionLike extends EventTarget {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export default function VoiceRequestSection({ language, options, disabled, onConfirm }: VoiceRequestSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [phase, setPhase] = useState<Phase>('listening')
  const [matchedId, setMatchedId] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const transcriptRef = useRef('')
  const isSupported = getSpeechRecognitionCtor() !== null

  const beginListening = () => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.lang = SPEECH_LOCALE[language] ?? 'en-US'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map(result => result[0]?.transcript ?? '')
        .join(' ')
        .trim()
      transcriptRef.current = text
      setTranscript(text)
    }

    recognition.onerror = () => setIsListening(false)

    recognition.onend = () => {
      setIsListening(false)
      const trimmed = transcriptRef.current.trim()
      if (!trimmed) {
        setPhase('no-match')
        return
      }
      const match = matchSpokenRequestType(trimmed, options)
      setMatchedId(match)
      setPhase(match ? 'reviewing' : 'no-match')
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const openModal = () => {
    if (disabled) return
    transcriptRef.current = ''
    setTranscript('')
    setMatchedId(null)
    setPhase('listening')
    setIsOpen(true)
    if (isSupported) beginListening()
  }

  const retry = () => {
    transcriptRef.current = ''
    setTranscript('')
    setMatchedId(null)
    setPhase('listening')
    beginListening()
  }

  const closeModal = () => {
    recognitionRef.current?.stop()
    setIsOpen(false)
    setIsListening(false)
  }

  const confirm = () => {
    const option = options.find(item => item.id === matchedId)
    if (!option) return
    onConfirm(option.id, option.baseLabel, option.urgent)
    closeModal()
  }

  const matchedOption = options.find(item => item.id === matchedId)

  return (
    <>
      <div className="px-5 mb-6">
        <button
          type="button"
          onClick={openModal}
          disabled={disabled}
          className="w-full flex flex-col items-center gap-2 rounded-[22px] px-5 py-5 text-center transition-transform active:scale-[0.98] disabled:opacity-60"
          style={{ background: 'rgba(100,200,255,0.1)', border: '2px solid #0066cc' }}>
          <span className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#0066cc' }}>
            <MicIcon size={28} />
          </span>
          <span className="text-[16px] font-bold" style={{ color: '#0066cc' }}>Can't type?</span>
          <span className="text-[12px] font-medium" style={{ color: '#0066cc' }}>Tap the mic and speak your request</span>
          {!isSupported && (
            <span className="text-[11px] mt-1" style={{ color: '#0066cc' }}>
              Voice input isn't supported on this browser. You can still tap a tile below.
            </span>
          )}
        </button>
      </div>

      {isOpen && isSupported && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-2xl">
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close"
              className="absolute top-4 right-4 text-[#7A8DA3] transition-colors hover:text-[#16324F]">
              <CloseIcon />
            </button>

            <div
              className={`mx-auto mb-5 flex items-center justify-center rounded-full ${isListening ? 'animate-pulse' : ''}`}
              style={{ width: 100, height: 100, background: '#ff6b6b' }}>
              <MicIcon size={40} color="white" />
            </div>

            {phase === 'listening' ? (
              <>
                <p className="text-lg font-bold text-[#16324F]">Listening...</p>
                <p className="mt-1 text-sm text-[#6B7C93]">Say your request</p>
              </>
            ) : (
              <p className="text-lg font-bold text-[#16324F]">
                {phase === 'no-match' ? "Sorry, I didn't catch that. Try again?" : 'Did we get that right?'}
              </p>
            )}

            <div className="mt-4 min-h-[60px] rounded-2xl border border-[#D8E6F3] bg-[#F8FBFF] px-4 py-3">
              {transcript ? (
                <p className="text-sm text-[#16324F]">
                  You said: <span className="font-semibold">"{transcript}"</span>
                </p>
              ) : (
                <p className="text-sm text-[#9CA3AF]">
                  {isListening ? 'Listening for your request…' : 'No speech detected.'}
                </p>
              )}
              {phase === 'reviewing' && matchedOption && (
                <p className="mt-2 text-xs font-bold" style={{ color: '#0066cc' }}>Matched to: {matchedOption.label}</p>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={retry}
                className="flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition-transform active:scale-[0.98]"
                style={{ background: '#F1F5F9', color: '#16324F' }}>
                Retry
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={phase !== 'reviewing'}
                className="flex-1 rounded-2xl px-4 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
                style={{ background: '#0066cc' }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function MicIcon({ size = 24, color = 'white' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
