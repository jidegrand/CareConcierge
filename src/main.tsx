import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Apply dark mode before first render to avoid flash.
// The patient-facing room page (/r/:roomId) has its own fixed light theme
// and isn't dark-mode aware, so never apply html.dark there.
;(function() {
  try {
    if (window.location.pathname.startsWith('/r/')) return
    const stored = localStorage.getItem('bayrequest_dark_mode')
    const isDark = stored !== null
      ? JSON.parse(stored)
      : window.matchMedia('(prefers-color-scheme: dark)').matches
    if (isDark) document.documentElement.classList.add('dark')
  } catch {}
})()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
