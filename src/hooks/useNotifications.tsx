import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

const MAX_NOTIFICATIONS = 30
const STORAGE_PREFIX = 'bayrequest_notifications'

export type NotificationTone = 'info' | 'warning' | 'critical' | 'success'

export interface NotificationEntry {
  id: string
  title: string
  body: string
  createdAt: string
  read: boolean
  tone: NotificationTone
  dedupeKey?: string
}

interface NotificationInput {
  title: string
  body: string
  tone?: NotificationTone
  dedupeKey?: string
}

interface NotificationsContextValue {
  notifications: NotificationEntry[]
  unreadCount: number
  pushNotification: (input: NotificationInput) => void
  markAllRead: () => void
  markRead: (notificationId: string) => void
  clearNotifications: () => void
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  pushNotification: () => {},
  markAllRead: () => {},
  markRead: () => {},
  clearNotifications: () => {},
})

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`
}

function readStoredNotifications(userId: string): NotificationEntry[] {
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as NotificationEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, MAX_NOTIFICATIONS)
  } catch {
    return []
  }
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationEntry[]>([])

  useEffect(() => {
    if (!user?.id) {
      setNotifications([])
      return
    }

    setNotifications(readStoredNotifications(user.id))
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    try {
      window.localStorage.setItem(storageKey(user.id), JSON.stringify(notifications))
    } catch {}
  }, [notifications, user?.id])

  const value = useMemo<NotificationsContextValue>(() => ({
    notifications,
    unreadCount: notifications.filter(entry => !entry.read).length,
    pushNotification: ({ title, body, tone = 'info', dedupeKey }) => {
      setNotifications(prev => {
        if (dedupeKey && prev.some(entry => entry.dedupeKey === dedupeKey)) {
          return prev
        }

        const next: NotificationEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title,
          body,
          tone,
          dedupeKey,
          read: false,
          createdAt: new Date().toISOString(),
        }

        return [next, ...prev].slice(0, MAX_NOTIFICATIONS)
      })
    },
    markAllRead: () => {
      setNotifications(prev => prev.map(entry => entry.read ? entry : { ...entry, read: true }))
    },
    markRead: (notificationId: string) => {
      setNotifications(prev => prev.map(entry => entry.id === notificationId ? { ...entry, read: true } : entry))
    },
    clearNotifications: () => {
      setNotifications([])
    },
  }), [notifications])

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationsContext)
}
