import { useEffect, useMemo, useRef, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

function formatNotificationTime(iso: string) {
  const createdAt = new Date(iso).getTime()
  const diffMs = Date.now() - createdAt
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`

  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`

  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const TONE_STYLES = {
  info: { dot: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8' },
  warning: { dot: '#D97706', bg: '#FFF7ED', text: '#9A3412' },
  critical: { dot: '#DC2626', bg: '#FEF2F2', text: '#B91C1C' },
  success: { dot: '#16A34A', bg: '#F0FDF4', text: '#166534' },
} as const

export default function NotificationCenter() {
  const { notifications, unreadCount, markAllRead, markRead, clearNotifications } = useNotifications()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open && unreadCount > 0) {
      markAllRead()
    }
  }, [open, unreadCount, markAllRead])

  const label = useMemo(() => {
    if (unreadCount === 0) return 'No new notifications'
    if (unreadCount === 1) return '1 new notification'
    return `${unreadCount} new notifications`
  }, [unreadCount])

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(value => !value)}
        title="Notification center"
        className="relative w-9 h-9 rounded-full hover:bg-[var(--page-bg)] flex items-center justify-center text-[var(--text-muted)] transition-colors"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 px-1 text-[10px] leading-[18px] text-white font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-lg z-50">
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[var(--border)]">
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">Notification Center</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{label}</p>
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[var(--page-bg)] flex items-center justify-center text-[var(--text-muted)] transition-colors"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                  <BellIcon />
                </div>
                <p className="text-sm font-medium text-[var(--text-primary)]">No notifications yet</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  New requests, acknowledgements, resolutions, and overdue alerts will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {notifications.map(entry => {
                  const tone = TONE_STYLES[entry.tone]
                  return (
                    <button
                      key={entry.id}
                      onClick={() => markRead(entry.id)}
                      className={`w-full text-left px-5 py-4 transition-colors hover:bg-[var(--page-bg)] ${entry.read ? 'opacity-80' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: tone.dot }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{entry.title}</p>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0"
                              style={{ background: tone.bg, color: tone.text }}
                            >
                              {entry.tone}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">{entry.body}</p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-2">{formatNotificationTime(entry.createdAt)}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
