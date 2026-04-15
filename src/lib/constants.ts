import type { RequestTypeConfig } from '@/types'

export const DEFAULT_REQUEST_TYPES: RequestTypeConfig[] = [
  { id: 'water',       label: 'Water',              icon: '💧', color: '#3B82F6', urgent: false },
  { id: 'blanket',     label: 'Blanket',             icon: '🛏️', color: '#8B5CF6', urgent: false },
  { id: 'pain',        label: 'Pain / Discomfort',   icon: '⚠️', color: '#EF4444', urgent: true  },
  { id: 'medication',  label: 'Medication',          icon: '💊', color: '#F59E0B', urgent: true  },
  { id: 'bathroom',    label: 'Bathroom Help',       icon: '🚶', color: '#10B981', urgent: false },
  { id: 'nurse',       label: 'Call Nurse',          icon: '🔔', color: '#EC4899', urgent: true  },
  { id: 'food',        label: 'Food / Snack',        icon: '🍽️', color: '#6366F1', urgent: false },
  { id: 'temperature', label: 'Too Hot / Cold',      icon: '🌡️', color: '#14B8A6', urgent: false },
]

export const REQUEST_TYPES = DEFAULT_REQUEST_TYPES

export const buildRequestTypeMap = (items: RequestTypeConfig[]) =>
  Object.fromEntries(items.map(item => [item.id, item])) as Record<string, RequestTypeConfig>

export const REQUEST_TYPE_MAP = buildRequestTypeMap(DEFAULT_REQUEST_TYPES)

export const slugifyRequestTypeId = (label: string): string =>
  label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const timeAgo = (dateStr: string): string => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}
