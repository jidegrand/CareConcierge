import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { REQUEST_TYPE_MAP } from '@/lib/constants'
import type { RequestTypeConfig } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export type EventKind = 'submitted' | 'acknowledged' | 'resolved'

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
  room?: {
    id?: string
    name?: string
    unit?: { id?: string } | { id?: string }[]
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────
function buildEvents(
  requests: Record<string, unknown>[],
  typeMap: Record<string, RequestTypeConfig>
): FeedEvent[] {
  const events: FeedEvent[] = []

  for (const r of requests) {
    const req = r as {
      id: string
      type: string
      is_urgent: boolean
      created_at: string
      acknowledged_at: string | null
      resolved_at: string | null
      room?: { id: string; name: string }
    }

    const config  = typeMap[req.type]
    const bay     = req.room?.name ?? 'Unknown'
    const roomId  = req.room?.id   ?? req.id
    const label   = config?.label  ?? req.type
    const icon    = config?.icon   ?? '📋'

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
        actorName:  null,
        timestamp:  req.acknowledged_at,
        elapsed,
      })
    }

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
        actorName:  null,
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
  const rawRequests = useRef<Record<string, unknown>[]>([])

  const process = useCallback((requests: Record<string, unknown>[]) => {
    rawRequests.current = requests
    const built = buildEvents(requests, typeMap)
    setEvents(built)

    // Active bays
    const bayMap: Record<string, ActiveBay> = {}
    for (const r of requests as {
      status: string; room?: { id: string; name: string }
    }[]) {
      const name = r.room?.name ?? 'Unknown'
      const id   = r.room?.id   ?? ''
      if (!bayMap[name]) bayMap[name] = { name, roomId: id, pendingCount: 0, inProgressCount: 0 }
      if (r.status === 'pending')      bayMap[name].pendingCount++
      if (r.status === 'acknowledged') bayMap[name].inProgressCount++
    }
    setActiveBays(Object.values(bayMap).filter(b => b.pendingCount + b.inProgressCount > 0))

    // Summary
    const reqs = requests as { status: string; is_urgent: boolean }[]
    setSummary({
      totalEvents:   built.length,
      baysActive:    new Set(reqs.map((r, _i) => (r as { room?: { name: string } } & typeof r).room?.name)).size,
      urgentOpen:    reqs.filter(r => r.is_urgent && r.status !== 'resolved').length,
      resolvedCount: reqs.filter(r => r.status === 'resolved').length,
    })
  }, [typeMap])

  const fetch = useCallback(async () => {
    if (!unitId) return
    const today = new Date(); today.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('requests')
      .select(`
        id, type, status, is_urgent,
        created_at, acknowledged_at, resolved_at,
        room:rooms (id, name, unit:units(id))
      `)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })

    if (data) {
      const rows = data as FeedRequestRow[]
      const filtered = rows.filter(r => {
        const unit = Array.isArray(r.room?.unit) ? r.room?.unit[0] : r.room?.unit
        return unit?.id === unitId
      })
      process(filtered as unknown as Record<string, unknown>[])
    }
    setLoading(false)
  }, [unitId, process])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    if (!unitId) return
    const channel = supabase
      .channel(`feed:unit:${unitId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => fetch())
      .subscribe(s => setConnected(s === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel); setConnected(false) }
  }, [unitId, fetch])

  return { events, activeBays, summary, loading, connected }
}
