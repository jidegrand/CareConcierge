import { useEffect, useRef } from 'react'
import { playUrgentAlert } from '@/lib/sounds'
import { useNotifications } from '@/hooks/useNotifications'
import type { Request } from '@/types'

/**
 * Monitors pending requests against the configured overdue threshold.
 *
 * - Returns a Set<string> of request IDs that are currently overdue (for visual use).
 * - Fires an in-app sound alert the first time each request crosses the threshold.
 * - Fires a browser notification if push permission is granted.
 * - Cleans up alerted IDs when requests are acknowledged/resolved.
 *
 * Checks run every 15 seconds (aligns with the timestamp refresh ticker).
 */
export function useOverdueAlerts(
  requests: Request[],
  overdueThresholdMin: number,
  soundEnabled: boolean,
  urgentSoundOnly: boolean,
): Set<string> {
  // Tracks which request IDs have already triggered a sound/notification
  const alertedIds = useRef<Set<string>>(new Set())
  const { pushNotification } = useNotifications()

  // ── Synchronously derive the current overdue set (for rendering) ──────────
  const thresholdMs = overdueThresholdMin * 60 * 1000
  const now = Date.now()
  const overdueIds = new Set<string>()

  for (const r of requests) {
    if (r.status === 'pending') {
      if (now - new Date(r.created_at).getTime() >= thresholdMs) {
        overdueIds.add(r.id)
      }
    }
  }

  // ── Side-effect: fire alerts when threshold is first crossed ──────────────
  useEffect(() => {
    const pendingRequests = requests.filter(r => r.status === 'pending')

    const check = () => {
      const ms = overdueThresholdMin * 60 * 1000
      const t  = Date.now()
      let alertFired = false

      for (const r of pendingRequests) {
        const age = t - new Date(r.created_at).getTime()
        if (age < ms) continue
        if (alertedIds.current.has(r.id)) continue

        // First time this request crosses the threshold
        alertedIds.current.add(r.id)

        if (soundEnabled && (!urgentSoundOnly || r.is_urgent)) {
          // Only fire one sound burst per check cycle even if multiple go overdue simultaneously
          if (!alertFired) {
            playUrgentAlert()
            alertFired = true
          }
        }

        pushNotification({
          title: r.is_urgent ? 'Urgent request is overdue' : 'Request is overdue',
          body: `Bay ${r.room?.name ?? '—'} — ${r.type.replace(/_/g, ' ')} has been waiting over ${overdueThresholdMin} min.`,
          tone: r.is_urgent ? 'critical' : 'warning',
          dedupeKey: `request-overdue:${r.id}`,
        })

        // Browser push notification (if permission granted)
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('Overdue patient request', {
              body: `Bay ${r.room?.name ?? '—'} — ${r.type.replace(/_/g, ' ')} has been waiting over ${overdueThresholdMin} min`,
              tag: `overdue-${r.id}`,    // deduplicate per request
              silent: soundEnabled,       // browser won't double-beep if we played sound
            })
          } catch {
            // Notification API can throw in some browsers — ignore silently
          }
        }
      }

      // Prune alerted IDs for requests that are no longer pending (acknowledged/resolved)
      const pendingIdSet = new Set(pendingRequests.map(r => r.id))
      for (const id of alertedIds.current) {
        if (!pendingIdSet.has(id)) alertedIds.current.delete(id)
      }
    }

    // Run immediately, then every 15 s
    check()
    const interval = setInterval(check, 15_000)
    return () => clearInterval(interval)
  }, [requests, overdueThresholdMin, soundEnabled, urgentSoundOnly, pushNotification])

  return overdueIds
}
