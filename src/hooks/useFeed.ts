import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { REQUEST_TYPE_MAP } from '@/lib/constants'
import { getSingle, type MaybeArray } from '@/lib/utils'
import type { RequestTypeConfig } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export type EventKind = 'submitted' | 'acknowledged' | 'resolved' | 'note'

export interface FeedEvent {
  id: string           // unique event id
  requestId: string
  kind: EventKind
  bay: string
  roomId: string
  type: string         // request type key
  label: string        // request type label
  icon: string
  isUrgent: boolean
  actorName: string | null
  timestamp: string    // ISO
  elapsed: number      // seconds since previous event on same request
  noteBody?: string    // note text, for kind === 'note'
  attachmentUrl?: string | null    // signed URL for the note's attachment, if any
  attachmentType?: string | null   // MIME type of the attachment
  attachmentName?: string | null   // original filename of the attachment
}

export interface ActiveBay {
  name: string
  roomId: string
  pendingCount: number
  inProgressCount: number
}

export interface FeedSummary {
  totalEvents: number
  baysActive: number
  urgentOpen: number
  resolvedCount: number
}

interface UseFeedResult {
  events: FeedEvent[]
  activeBays: ActiveBay[]
  summary: FeedSummary
  loading: boolean
  connected: boolean
}

interface FeedRequestRow {
  id: string
  type: string
  status: string
  is_urgent: boolean
  created_at: string
  acknowledged_at: string | null
  resolved_at: string | null
  room?: MaybeArray<{
    id?: string
    name?: string
    unit?: MaybeArray<{ id?: string }>
  }>
  acknowledger?: MaybeArray<{ id: string; full_name: string | null }>
  resolver?: MaybeArray<{ id: string; full_name: string | null }>
}

interface FeedNoteRow {
  id: string
  body: string
  created_at: string
  attachment_path: string | null
  attachment_type: string | null
  attachment_name: string | null
  resident?: MaybeArray<{
    id?: string
    display_name?: string
    room?: MaybeArray<{ id?: string; name?: string; unit_id?: string }>
  }>
  author?: MaybeArray<{ id: string; full_name: string | null }>
}

// ── Helper ────────────────────────────────────────────────────────────────────
function buildEvents(
  requests: FeedRequestRow[],
  typeMap: Record<string, RequestTypeConfig>
): FeedEvent[] {
  const events: FeedEvent[] = []

  for (const req of requests) {
    const config  = typeMap[req.type]
    const room    = getSingle(req.room)
    const bay     = room?.name ?? 'Unknown'
    const roomId  = room?.id   ?? req.id
    const label   = config?.label  ?? req.type
    const icon    = config?.icon   ?? '📋'

    const acknowledgerName = getSingle(req.acknowledger)?.full_name ?? null
    const resolverName     = getSingle(req.resolver)?.full_name     ?? null

    // Submitted event
    events.push({
      id:         `${req.id}-submitted`,
      requestId:  req.id,
      kind:       'submitted',
      bay, roomId, type: req.type, label, icon,
      isUrgent:   req.is_urgent,
      actorName:  null,
      timestamp:  req.created_at,
      elapsed:    0,
    })

    // Acknowledged event
    if (req.acknowledged_at) {
      const elapsed = Math.round(
        (new Date(req.acknowledged_at).getTime() - new Date(req.created_at).getTime()) / 1000
      )
      events.push({
        id:         `${req.id}-acknowledged`,
        requestId:  req.id,
        kind:       'acknowledged',
        bay, roomId, type: req.type, label, icon,
        isUrgent:   req.is_urgent,
        actorName:  acknowledgerName,
        timestamp:  req.acknowledged_at,
        elapsed,
      })
    }

    // Resolved event
    if (req.resolved_at) {
      const base    = req.acknowledged_at ?? req.created_at
      const elapsed = Math.round(
        (new Date(req.resolved_at).getTime() - new Date(base).getTime()) / 1000
      )
      events.push({
        id:         `${req.id}-resolved`,
        requestId:  req.id,
        kind:       'resolved',
        bay, roomId, type: req.type, label, icon,
        isUrgent:   req.is_urgent,
        actorName:  resolverName,
        timestamp:  req.resolved_at,
        elapsed,
      })
    }
  }

  // Sort newest first
  return events.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

function buildNoteEvents(notes: (FeedNoteRow & { attachmentUrl?: string | null })[]): FeedEvent[] {
  return notes.map(note => {
    const resident = getSingle(note.resident)
    const room     = getSingle(resident?.room)

    return {
      id:         `note-${note.id}`,
      requestId:  '',
      kind:       'note',
      bay:        room?.name ?? 'Unknown',
      roomId:     room?.id   ?? '',
      type:       'staff_note',
      label:      'Staff note',
      icon:       '📝',
      isUrgent:   false,
      actorName:  getSingle(note.author)?.full_name ?? null,
      timestamp:  note.created_at,
      elapsed:    0,
      noteBody:   note.body,
      attachmentUrl:  note.attachmentUrl,
      attachmentType: note.attachment_type,
      attachmentName: note.attachment_name,
    }
  })
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useFeed(
  unitId: string | undefined,
  typeMap: Record<string, RequestTypeConfig> = REQUEST_TYPE_MAP
): UseFeedResult {
  const [events,     setEvents]     = useState<FeedEvent[]>([])
  const [activeBays, setActiveBays] = useState<ActiveBay[]>([])
  const [summary,    setSummary]    = useState<FeedSummary>({
    totalEvents: 0, baysActive: 0, urgentOpen: 0, resolvedCount: 0,
  })
  const [loading,   setLoading]   = useState(true)
  const [connected, setConnected] = useState(false)
  const rawRequests = useRef<FeedRequestRow[]>([])

  const process = useCallback((requests: FeedRequestRow[], notes: (FeedNoteRow & { attachmentUrl?: string | null })[]) => {
    rawRequests.current = requests
    const built = [...buildEvents(requests, typeMap), ...buildNoteEvents(notes)]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    setEvents(built)

    // Active bays
    const bayMap: Record<string, ActiveBay> = {}
    for (const r of requests) {
      const room = getSingle(r.room)
      const name = room?.name ?? 'Unknown'
      const id   = room?.id   ?? ''
      if (!bayMap[name]) bayMap[name] = { name, roomId: id, pendingCount: 0, inProgressCount: 0 }
      if (r.status === 'pending')      bayMap[name].pendingCount++
      if (r.status === 'acknowledged') bayMap[name].inProgressCount++
    }
    setActiveBays(Object.values(bayMap).filter(b => b.pendingCount + b.inProgressCount > 0))

    // Summary
    setSummary({
      totalEvents:   built.length,
      baysActive:    new Set(requests.map(r => getSingle(r.room)?.name)).size,
      urgentOpen:    requests.filter(r => r.is_urgent && r.status !== 'resolved').length,
      resolvedCount: requests.filter(r => r.status === 'resolved').length,
    })
  }, [typeMap])

  const fetch = useCallback(async () => {
    if (!unitId) return
    const today = new Date(); today.setHours(0, 0, 0, 0)

    const [requestsRes, notesRes] = await Promise.all([
      supabase
        .from('requests')
        .select(`
          id, type, status, is_urgent,
          created_at, acknowledged_at, resolved_at,
          room:rooms (id, name, unit:units(id)),
          acknowledger:user_profiles!requests_acknowledged_by_profile_fkey (id, full_name),
          resolver:user_profiles!requests_resolved_by_profile_fkey (id, full_name)
        `)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('staff_notes')
        .select(`
          id, body, created_at, attachment_path, attachment_type, attachment_name,
          resident:residents (id, display_name, room:rooms (id, name, unit_id)),
          author:user_profiles!staff_notes_author_id_fkey (id, full_name)
        `)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false }),
    ])

    const requestRows = (requestsRes.data ?? []) as FeedRequestRow[]
    const filteredRequests = requestRows.filter(r => {
      const room = getSingle(r.room)
      const unit = getSingle(room?.unit)
      return unit?.id === unitId
    })

    const noteRows = (notesRes.data ?? []) as FeedNoteRow[]
    const filteredNotes = noteRows.filter(n => {
      const resident = getSingle(n.resident)
      const room     = getSingle(resident?.room)
      return room?.unit_id === unitId
    })

    const attachmentPaths = filteredNotes
      .map(n => n.attachment_path)
      .filter((p): p is string => !!p)

    const signedUrls: Record<string, string> = {}
    if (attachmentPaths.length > 0) {
      const { data: signed } = await supabase.storage
        .from('staff-note-attachments')
        .createSignedUrls(attachmentPaths, 3600)

      for (const s of signed ?? []) {
        if (s.signedUrl && !s.error) signedUrls[s.path ?? ''] = s.signedUrl
      }
    }

    const notesWithAttachments = filteredNotes.map(n => ({
      ...n,
      attachmentUrl: n.attachment_path ? signedUrls[n.attachment_path] : undefined,
    }))

    process(filteredRequests, notesWithAttachments)
    setLoading(false)
  }, [unitId, process])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    if (!unitId) return
    const channel = supabase
      .channel(`feed:unit:${unitId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => fetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_notes' }, () => fetch())
      .subscribe(s => setConnected(s === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel); setConnected(false) }
  }, [unitId, fetch])

  return { events, activeBays, summary, loading, connected }
}
