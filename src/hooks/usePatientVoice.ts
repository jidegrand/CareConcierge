import { useEffect, useState } from 'react'

const STORAGE_KEY = 'bayrequest_patient_voice'

export function getInitialPatientVoiceEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

// Manual opt-in for spoken request confirmations. Off by default —
// shared hospital rooms make audible announcements unwelcome unless
// the patient explicitly turns them on.
export function usePatientVoice() {
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => getInitialPatientVoiceEnabled())

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, voiceEnabled ? 'on' : 'off')
    } catch {}
  }, [voiceEnabled])

  const toggleVoice = () => setVoiceEnabled(prev => !prev)

  return { voiceEnabled, toggleVoice }
}
