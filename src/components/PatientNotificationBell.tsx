import { useEffect, useRef, useState } from 'react'
import type { PatientNotificationEntry } from '@/hooks/usePatientNotifications'
import type { PatientCopy } from '@/lib/patientI18n'

interface PatientNotificationBellProps {
  notifications: PatientNotificationEntry[]
  unreadCount: number
  onOpen: () => void
  onClear: () => void
  copy: PatientCopy
}

export default function PatientNotificationBell({ notifications, unreadCount, onOpen, onClear, copy }: PatientNotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keep the dropdown anchored to the bell button and within the viewport,
  // since the button can sit anywhere in the top bar depending on layout.
  useEffect(() => {
    if (!open) return

    const updateCoords = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      setCoords({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) })
    }

    updateCoords()
    window.addEventListener('resize', updateCoords)
    window.addEventListener('scroll', updateCoords, true)
    return () => {
      window.removeEventListener('resize', updateCoords)
      window.removeEventListener('scroll', updateCoords, true)
    }
  }, [open])

  const toggleOpen = () => {
    setOpen(value => {
      const next = !value
      if (next && unreadCount > 0) onOpen()
      return next
    })
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        title={copy.notificationsTitle}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-[var(--patient-text)] hover:bg-[var(--patient-border)] transition-colors"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 px-1 text-[10px] leading-[18px] text-white font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && coords && (
        <div
          className="fixed w-[300px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-[var(--patient-border)] bg-[var(--patient-surface)] shadow-lg z-50"
          style={{ top: coords.top, right: coords.right }}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--patient-border)]">
            <p className="text-sm font-bold text-[var(--patient-text)]">{copy.notificationsTitle}</p>
            {notifications.length > 0 && (
              <button
                onClick={onClear}
                className="text-xs font-medium text-[var(--patient-text-muted)] hover:text-[var(--patient-text)] transition-colors"
              >
                {copy.clearAll}
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium text-[var(--patient-text)]">{copy.noNotifications}</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--patient-border)]">
                {notifications.map(entry => (
                  <div key={entry.id} className="px-4 py-3">
                    <p className="text-sm font-semibold text-[var(--patient-text)]">{entry.title}</p>
                    <p className="text-[13px] text-[var(--patient-text-body)] mt-1 leading-relaxed">{entry.body}</p>
                    <p className="text-[11px] text-[var(--patient-text-muted)] mt-1.5">
                      {new Date(entry.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
