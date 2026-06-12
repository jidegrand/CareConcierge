import { useEffect, useMemo, useState } from 'react'

const MAX_NOTIFICATIONS = 20
const STORAGE_PREFIX = 'bayrequest_patient_notifications'

export interface PatientNotificationEntry {
  id: string
  title: string
  body: string
  createdAt: string
  read: boolean
}

interface PatientNotificationInput {
  id: string
  title: string
  body: string
}

function storageKey(roomId: string) {
  return `${STORAGE_PREFIX}:${roomId}`
}

function readStoredNotifications(roomId: string): PatientNotificationEntry[] {
  try {
    const raw = window.localStorage.getItem(storageKey(roomId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as PatientNotificationEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, MAX_NOTIFICATIONS)
  } catch {
    return []
  }
}

export function usePatientNotifications(roomId: string | undefined) {
  const [notifications, setNotifications] = useState<PatientNotificationEntry[]>([])

  useEffect(() => {
    if (!roomId) {
      setNotifications([])
      return
    }

    setNotifications(readStoredNotifications(roomId))
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    try {
      window.localStorage.setItem(storageKey(roomId), JSON.stringify(notifications))
    } catch {}
  }, [notifications, roomId])

  return useMemo(() => ({
    notifications,
    unreadCount: notifications.filter(entry => !entry.read).length,
    pushNotification: ({ id, title, body }: PatientNotificationInput) => {
      setNotifications(prev => {
        if (prev.some(entry => entry.id === id)) return prev

        const next: PatientNotificationEntry = {
          id,
          title,
          body,
          read: false,
          createdAt: new Date().toISOString(),
        }

        return [next, ...prev].slice(0, MAX_NOTIFICATIONS)
      })
    },
    markAllRead: () => {
      setNotifications(prev => prev.map(entry => entry.read ? entry : { ...entry, read: true }))
    },
    clearNotifications: () => {
      setNotifications([])
    },
  }), [notifications])
}
