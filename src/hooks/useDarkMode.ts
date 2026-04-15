import { useState, useEffect } from 'react'

const KEY = 'bayrequest_dark_mode'

export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(KEY)
      if (stored !== null) return JSON.parse(stored)
      // Default: respect OS preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch { return false }
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem(KEY, JSON.stringify(dark))
  }, [dark])

  // Apply on first mount (handles page refresh)
  useEffect(() => {
    const stored = localStorage.getItem(KEY)
    const isDark = stored !== null
      ? JSON.parse(stored)
      : window.matchMedia('(prefers-color-scheme: dark)').matches
    if (isDark) document.documentElement.classList.add('dark')
  }, [])

  return { dark, setDark, toggle: () => setDark(d => !d) }
}
