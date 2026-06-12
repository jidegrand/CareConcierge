import { useEffect, useState } from 'react'

const STORAGE_KEY = 'bayrequest_patient_theme'

export type PatientTheme = 'light' | 'dark'

export function getInitialPatientTheme(): PatientTheme {
  if (typeof window === 'undefined') return 'light'
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

// Manual light/dark toggle for the patient room page. Deliberately does not
// follow the OS/browser color-scheme preference (see main.tsx) — patients
// opt in explicitly, e.g. for a dimmed room at night.
export function usePatientTheme() {
  const [theme, setTheme] = useState<PatientTheme>(() => getInitialPatientTheme())

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {}
  }, [theme])

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))

  return { theme, toggleTheme }
}
