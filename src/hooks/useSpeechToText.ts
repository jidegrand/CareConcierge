import { useRef, useState } from 'react'

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

export const isSpeechToTextSupported = (): boolean => getSpeechRecognitionCtor() !== null

// Shared Web Speech API wrapper for free-text request forms (patient bedside
// + family portal). Streams a live transcript via onTranscript as the user
// speaks; `toggle` starts/stops listening, `stop` is for cleanup on submit.
export function useSpeechToText(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const toggle = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = true

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event) => {
      const liveTranscript = Array.from(event.results)
        .map(result => result[0]?.transcript ?? '')
        .join(' ')
        .trim()
      onTranscript(liveTranscript)
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
  }

  const stop = () => recognitionRef.current?.stop()

  return { isListening, isSupported: isSpeechToTextSupported(), toggle, stop }
}
