import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { REQUEST_TYPE_MAP } from '@/lib/constants'
import type { Request, RequestTypeConfig } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────
export type BayStatus = 'idle' | 'pending' | 'urgent' | 'in-progress' | 'resolved'

export interface ActiveRequest {
  id: string
  type: string
  label: string
  icon: string
  status: 'pending' | 'acknowledged' | 'resolved'
  isUrgent: boolean
  createdAt: string
  ageSeconds: number
}

export interface BayState {
  roomId:   string
  name:     string
  label:    string
  status:   BayStatus
  requests: ActiveRequest[]
  // Derived
  pendingCount:    number
  inProgressCount: number
  resolvedCount:   number
  oldestPendingSec: number | null
}

export interface BayMapSummary {
  total:      number
  idle:       number
  pending:    number
  urgent:     number
  inProgress: number
}

interface UseBayMapResult {
  bays:      BayState[]
  summary:   BayMapSummary
  loading:   boolean
  connected: boolean
  updateStatus: (requestId: string, status: 'acknowledged' | 'resolved') => Promise<void>
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useBayMap(
  unitId: string | undefined,
  typeMap: Record<string, RequestTypeConfig> = REQUEST_TYPE_MAP
): UseBayMapResult {
  const [bays,      setBays]      = useState<BayState[]>([])
  const [loading,   setLoading]   = useState(true)
  const [connected, setConnected] = useState(false)

  const fetch = useCallback(async () => {
    if (!unitId) return

    // Fetch all active rooms for this unit
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, name, label')
      .eq('unit_id', unitId)
      .eq('active', true)
      .order('name')

    if (!rooms) { setLoading(false); return }

    // Fetch today's non-resolved requests for these rooms
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const roomIds = rooms.map(r => r.id)

    const { data: requests } = await supabase
      .from('requests')
      .select('id, room_id, type, status, is_urgent, created_at, acknowledged_at, resolved_at')
      .in('room_id', roomIds)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: true })

    const now = Date.now()

    // Map requests by room
    const reqByRoom: Record<string, Request[]> = {}
    for (const r of (requests ?? []) as Request[]) {
      if (!reqByRoom[r.room_id]) reqByRoom[r.room_id] = []
      reqByRoom[r.room_id].push(r)
    }

    const baysBuilt: BayState[] = rooms.map(room => {
      const roomReqs: Request[] = reqByRoom[room.id] ?? []

      const activeReqs = roomReqs.filter(r => r.status !== 'resolved')

      const mapped: ActiveRequest[] = roomReqs.map(r => {
        const cfg = typeMap[r.type]
        return {
          id:         r.id,
          type:       r.type,
          label:      cfg?.label  ?? r.type,
          icon:       cfg?.icon   ?? '📋',
          status:     r.status as ActiveRequest['status'],
          isUrgent:   r.is_urgent,
          createdAt:  r.created_at,
          ageSeconds: Math.floor((now - new Date(r.created_at).getTime()) / 1000),
        }
      })

      const pendingReqs    = activeReqs.filter(r => r.status === 'pending')
      const inProgReqs     = activeReqs.filter(r => r.status === 'acknowledged')
      const resolvedReqs   = roomReqs.filter(r => r.status === 'resolved')
      const hasUrgent      = pendingReqs.some(r => r.is_urgent)
      const hasOverdue     = pendingReqs.some(r =>
        (now - new Date(r.created_at).getTime()) / 1000 > 300
      )

      // Status priority: urgent > pending > in-progress > resolved > idle
      let status: BayStatus = 'idle'
      if (pendingReqs.length > 0) {
        status = (hasUrgent || hasOverdue) ? 'urgent' : 'pending'
      } else if (inProgReqs.length > 0) {
        status = 'in-progress'
      } else if (resolvedReqs.length > 0) {
        status = 'resolved'
      }

      const oldestPending = pendingReqs.length > 0
        ? Math.floor((now - new Date(pendingReqs[0].created_at).getTime()) / 1000)
        : null

      return {
        roomId:          room.id,
        name:            room.name,
        label:           room.label ?? room.name,
        status,
        requests:        mapped,
        pendingCount:    pendingReqs.length,
        inProgressCount: inProgReqs.length,
        resolvedCount:   resolvedReqs.length,
        oldestPendingSec: oldestPending,
      }
    })

    setBays(baysBuilt)
    setLoading(false)
  }, [typeMap, unitId])

  useEffect(() => { fetch() }, [fetch])

  // Real-time refresh
  useEffect(() => {
    if (!unitId) return
    const channel = supabase
      .channel(`baymap:unit:${unitId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => fetch())
      .subscribe(s => setConnected(s === 'SUBSCRIBED'))

    // Refresh ages every 30s (overdue detection)
    const ticker = setInterval(fetch, 30_000)

    return () => {
      clearInterval(ticker)
      supabase.removeChannel(channel)
      setConnected(false)
    }
  }, [unitId, fetch])

  const updateStatus = async (requestId: string, status: 'acknowledged' | 'resolved') => {
    const update: Record<string, string> = { status }
    if (status === 'acknowledged') update.acknowledged_at = new Date().toISOString()
    if (status === 'resolved')     update.resolved_at     = new Date().toISOString()
    await supabase.from('requests').update(update).eq('id', requestId)
    await fetch()
  }

  const summary: BayMapSummary = {
    total:      bays.length,
    idle:       bays.filter(b => b.status === 'idle').length,
    pending:    bays.filter(b => b.status === 'pending').length,
    urgent:     bays.filter(b => b.status === 'urgent').length,
    inProgress: bays.filter(b => b.status === 'in-progress').length,
  }

  return { bays, summary, loading, connected, updateStatus }
}
