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

// "Margaret Hutchins" -> "Margaret H."
export const formatResidentShortName = (displayName: string): string => {
  const parts = displayName.trim().split(/\s+/)
  if (parts.length < 2) return displayName
  const last = parts[parts.length - 1]
  return `${parts.slice(0, -1).join(' ')} ${last[0]}.`
}

// Open-ended requests (typed or spoken, not matched to a tile) are stored
// with this type id and their full text in `custom_text`.
export const CUSTOM_REQUEST_TYPE_ID = 'custom'

// Resolves the text to show for a request: the full custom text for
// open-ended requests, otherwise the tile's configured label.
export const requestDisplayLabel = (
  request: { type: string; custom_text?: string | null },
  typeMap: Record<string, { label: string }>
): string => {
  if (request.type === CUSTOM_REQUEST_TYPE_ID && request.custom_text) return request.custom_text
  return typeMap[request.type]?.label ?? request.type
}

export const timeAgo = (dateStr: string): string => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}
