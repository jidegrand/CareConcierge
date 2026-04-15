import { useEffect, useState } from 'react'

export const PREFS_KEY = 'bayrequest_prefs'

export interface Prefs {
  soundEnabled:     boolean
  urgentSoundOnly:  boolean
  browserPush:      boolean
  overdueThreshold: number   // minutes — request is "overdue" if pending longer than this
  responseTarget:   number   // minutes — target acknowledgement time
  timezone:         string
  compactView:      boolean
  autoRefreshSec:   number
}

export const DEFAULT_PREFS: Prefs = {
  soundEnabled:     true,
  urgentSoundOnly:  false,
  browserPush:      false,
  overdueThreshold: 5,
  responseTarget:   3,
  timezone:         'America/Toronto',
  compactView:      false,
  autoRefreshSec:   30,
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS
  } catch { return DEFAULT_PREFS }
}

export function savePrefs(p: Prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p))
  // Notify other tabs / same-tab listeners
  window.dispatchEvent(new Event('storage'))
}

/**
 * Reactive hook — any component can call this and get live prefs.
 * Updates whenever savePrefs() is called anywhere in the app.
 */
export function usePrefs(): Prefs {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)

  useEffect(() => {
    const handler = () => setPrefs(loadPrefs())
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  return prefs
}
