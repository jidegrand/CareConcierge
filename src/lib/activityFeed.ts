// Shared shape + date-grouping helpers for activity feeds (family portal,
// patient bedside screen). Keeping this generic lets both surfaces render
// through the same <ActivityFeedList> component instead of duplicating the
// grouping/formatting logic per page.

export interface ActivityFeedItem {
  id: string
  text: string
  detail: string | null
  timestamp: string
  statusColor: 'green' | 'amber' | 'gray'
  staffAttribution?: string | null
  attachmentUrl?: string | null
  attachmentType?: string | null
  attachmentName?: string | null
}

export const formatActivityClock = (iso: string): string =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export const activityDateLabel = (iso: string): string => {
  const date = new Date(iso)
  const now = new Date()

  if (date.toDateString() === now.toDateString()) return 'Today'

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

export function groupActivityByDate<T extends { timestamp: string }>(
  items: T[]
): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = []

  for (const item of items) {
    const label = activityDateLabel(item.timestamp)
    const current = groups[groups.length - 1]
    if (current && current.label === label) {
      current.items.push(item)
    } else {
      groups.push({ label, items: [item] })
    }
  }

  return groups
}

const formatDurationMinutes = (seconds: number): string => {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  return remMinutes ? `${hours} hr ${remMinutes} min` : `${hours} hr`
}

// Derives the "pending" / "in progress" / "resolved in X min" detail text
// and status dot color shared by every request-based activity feed entry.
export function summarizeRequestProgress(request: {
  status: 'pending' | 'acknowledged' | 'resolved'
  created_at: string
  resolved_at?: string | null
}): { detail: string; statusColor: ActivityFeedItem['statusColor'] } {
  if (request.status === 'resolved' && request.resolved_at) {
    const seconds = (new Date(request.resolved_at).getTime() - new Date(request.created_at).getTime()) / 1000
    return { detail: `resolved in ${formatDurationMinutes(seconds)}`, statusColor: 'green' }
  }
  if (request.status === 'acknowledged') return { detail: 'in progress', statusColor: 'amber' }
  return { detail: 'pending', statusColor: 'amber' }
}
