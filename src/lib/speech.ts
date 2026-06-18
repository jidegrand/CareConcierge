import type { PatientLanguage } from './patientI18n'

const SPEECH_LOCALE: Record<PatientLanguage, string> = {
  en: 'en-US', es: 'es-ES', fr: 'fr-FR', zh: 'zh-CN',
  pa: 'pa-IN', yue: 'zh-HK', ar: 'ar-SA', tl: 'fil-PH',
}

// Best-effort spoken confirmation. Falls back to the browser's default
// voice if the device has no voice for the requested locale.
export function speakPatientConfirmation(text: string, language: PatientLanguage): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = SPEECH_LOCALE[language] ?? 'en-US'
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
  } catch {}
}
