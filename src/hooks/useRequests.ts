import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { playNewRequest, playUrgentAlert, playResolve } from '@/lib/sounds'
import { getSingle, type MaybeArray } from '@/lib/utils'
import type { Request, RequestStatus } from '@/types'

type ScopedRequestRow = Request & {
  room?: {
    unit?: MaybeArray<{
      id?: string
      site?: MaybeArray<{ tenant_id?: string }>
    }>
  }
}

type StaffEventRow = Request & {
  room?: {
    name?: string
    unit?: MaybeArray<{
      id?: string
      site?: MaybeArray<{ tenant_id?: string }>
    }>
  }
  acknowledger?: MaybeArray<{ id: string; full_name: string | null }>
  resolver?: MaybeArray<{ id: string; full_name: string | null }>
}

export interface RequestStats {
  pendingCount: number
  inProgressCount: number
  resolvedTodayCount: number
  avgAckSeconds: number | null
}

// ── Staff activity derived from real events ───────────────────────────────────
export interface StaffEvent {
  userId:    string
  initials:  string
  name:      string
  action:    string
  timestamp: string   // ISO
  online:    boolean
}

interface UseRequestsResult {
  requests:     Request[]
  loading:      boolean
  connected:    boolean
  stats:        RequestStats
  staffEvents:  StaffEvent[]
  soundEnabled: boolean
  setSoundEnabled: (v: boolean) => void
  updateStatus: (id: string, status: RequestStatus) => Promise<void>
  clearResolved: () => void
}

function inScope(request: ScopedRequestRow, unitId: string | undefined, tenantId: string | undefined) {
  const unit = getSingle(request.room?.unit)
  const site = getSingle(unit?.site)
  if (unitId) return unit?.id === unitId
  if (tenantId) return site?.tenant_id === tenantId
  return false
}

export function useRequests(unitId: string | undefined, tenantId: string | undefined): UseRequestsResult {
  const [requests,     setRequests]     = useState<Request[]>([])
  const [staffEvents,  setStaffEvents]  = useState<StaffEvent[]>([])
  const [loading,      setLoading]      = useState(true)
  const [connected,    setConnected]    = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const knownIds = useRef<Set<string>>(new Set())

  // ── Fetch requests ────────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    if (!tenantId && !unitId) {
      setRequests([])
      setLoading(false)
      return
    }
    const today = new Date(); today.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('requests')
      .select(`
        *,
        room:rooms (
          id, name, label,
          unit:units (
            id, name,
            site:sites (tenant_id)
          )
        ),
        acknowledger:user_profiles!requests_acknowledged_by_profile_fkey (
          id, full_name
        ),
        resolver:user_profiles!requests_resolved_by_profile_fkey (
          id, full_name
        )
      `)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[useRequests] fetch error:', error)
      setLoading(false)
      return
    }
    if (!data) { setLoading(false); return }

    const filtered = (data as ScopedRequestRow[]).filter(r => inScope(r, unitId, tenantId))

    setRequests(filtered as Request[])
    setLoading(false)
    knownIds.current = new Set(filtered.map(r => r.id))
  }, [tenantId, unitId])

  // ── Fetch staff activity from recent events ───────────────────────────────
  const fetchStaffEvents = useCallback(async () => {
    if (!tenantId && !unitId) {
      setStaffEvents([])
      return
    }
    const today = new Date(); today.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('requests')
      .select(`
        id, type, status, acknowledged_at, resolved_at, acknowledged_by, resolved_by,
        room:rooms (
          name,
          unit:units (
            id,
            site:sites (tenant_id)
          )
        ),
        acknowledger:user_profiles!requests_acknowledged_by_profile_fkey (id, full_name),
        resolver:user_profiles!requests_resolved_by_profile_fkey (id, full_name)
      `)
      .gte('created_at', today.toISOString())
      .or('acknowledged_at.not.is.null,resolved_at.not.is.null')
      .order('resolved_at', { ascending: false, nullsFirst: false })
      .limit(20)

    if (!data) return

    const scoped = (data as unknown as StaffEventRow[]).filter(r => inScope(r, unitId, tenantId))

    const seen = new Set<string>()
    const events: StaffEvent[] = []
    const now = Date.now()

    for (const r of scoped) {
      const bayName = r.room?.name ?? 'a bay'

      // Resolved event — show resolver
      const resolver = getSingle(r.resolver)
      if (r.resolved_at && resolver) {
        const key = `${r.id}-resolved`
        if (!seen.has(key)) {
          seen.add(key)
          const name     = resolver.full_name ?? `User ${resolver.id.slice(0, 6)}`
          const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
          const ageMin   = Math.floor((now - new Date(r.resolved_at).getTime()) / 60000)
          events.push({
            userId:    resolver.id,
            initials,
            name,
            action:    `Resolved ${bayName}`,
            timestamp: r.resolved_at,
            online:    ageMin < 30,
          })
        }
      }

      // Acknowledged event — now we have acknowledged_by
      const acknowledger = getSingle(r.acknowledger)
      if (r.acknowledged_at && acknowledger) {
        const key = `${r.id}-acknowledged`
        if (!seen.has(key)) {
          seen.add(key)
          const name     = acknowledger.full_name ?? `User ${acknowledger.id.slice(0, 6)}`
          const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
          const ageMin   = Math.floor((now - new Date(r.acknowledged_at).getTime()) / 60000)
          events.push({
            userId:    acknowledger.id,
            initials,
            name,
            action:    `Acknowledged ${bayName}`,
            timestamp: r.acknowledged_at,
            online:    ageMin < 30,
          })
        }
      }
    }

    // Sort newest first, cap at 5
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    setStaffEvents(events.slice(0, 5))
  }, [tenantId, unitId])

  useEffect(() => { fetchRequests() }, [fetchRequests])
  useEffect(() => { fetchStaffEvents() }, [fetchStaffEvents])

  // Polling fallback — catches any realtime events that were missed
  useEffect(() => {
    if (!tenantId && !unitId) return
    const interval = setInterval(() => {
      fetchRequests()
      fetchStaffEvents()
    }, 10_000)
    return () => clearInterval(interval)
  }, [tenantId, unitId, fetchRequests, fetchStaffEvents])

  // ── Real-time subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!tenantId && !unitId) return

    const channel = supabase
      .channel(`requests:${tenantId ?? 'no-tenant'}:${unitId ?? 'all-units'}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests' }, (payload) => {
        const newReq = payload.new as Request
        if (!knownIds.current.has(newReq.id)) {
          knownIds.current.add(newReq.id)
          if (soundEnabled) newReq.is_urgent ? playUrgentAlert() : playNewRequest()
        }
        fetchRequests()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests' }, () => {
        fetchRequests()
        fetchStaffEvents()
      })
      .subscribe(status => setConnected(status === 'SUBSCRIBED'))

    const heartbeat = setInterval(() => {
      if (channel.state !== 'joined') channel.subscribe()
    }, 30_000)

    return () => {
      clearInterval(heartbeat)
      supabase.removeChannel(channel)
      setConnected(false)
    }
  }, [tenantId, unitId, soundEnabled, fetchRequests, fetchStaffEvents])

  // ── Update status — write acknowledged_by / resolved_by ──────────────────
  const updateStatus = async (id: string, status: RequestStatus) => {
    const update: Record<string, unknown> = { status }

    if (status === 'acknowledged') {
      update.acknowledged_at = new Date().toISOString()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) update.acknowledged_by = user.id
    }

    if (status === 'resolved') {
      update.resolved_at = new Date().toISOString()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) update.resolved_by = user.id
      if (soundEnabled) playResolve()
    }

    await supabase.from('requests').update(update).eq('id', id)

    setRequests(prev =>
      prev.map(r => r.id === id ? { ...r, ...update } : r)
    )

    if (status === 'acknowledged' || status === 'resolved') {
      setTimeout(fetchStaffEvents, 500)
    }
  }

  const clearResolved = () =>
    setRequests(prev => prev.filter(r => r.status !== 'resolved'))

  // ── Stats ─────────────────────────────────────────────────────────────────
  const pendingCount       = requests.filter(r => r.status === 'pending').length
  const inProgressCount    = requests.filter(r => r.status === 'acknowledged').length
  const resolvedTodayCount = requests.filter(r => r.status === 'resolved').length

  const ackTimes = requests
    .filter(r => r.acknowledged_at)
    .map(r => (new Date(r.acknowledged_at!).getTime() - new Date(r.created_at).getTime()) / 1000)

  const avgAckSeconds = ackTimes.length
    ? Math.round(ackTimes.reduce((a, b) => a + b, 0) / ackTimes.length)
    : null

  return {
    requests, loading, connected, staffEvents,
    stats: { pendingCount, inProgressCount, resolvedTodayCount, avgAckSeconds },
    soundEnabled, setSoundEnabled, updateStatus, clearResolved,
  }
}
