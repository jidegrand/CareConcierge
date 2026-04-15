import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { REQUEST_TYPES } from '@/lib/constants'
import { getSingle, type MaybeArray } from '@/lib/utils'
import type { RequestTypeConfig } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface HourlyVolume {
  hour: string       // "08:00"
  requests: number
  urgent: number
}

export interface ShiftVolume {
  shift: string      // "Night", "Day", "Evening"
  requests: number
  resolved: number
  avgResponseMin: number
}

export interface BayDemand {
  bay: string
  count: number
  intensity: number  // 0–1 normalised
}

export interface TypeBreakdown {
  type: string
  label: string
  icon: string
  count: number
  pct: number
  color: string
}

export interface AnalyticsSummary {
  totalToday: number
  avgResponseSec: number | null
  fastestSec: number | null
  resolvedPct: number
}

export interface AnalyticsData {
  summary: AnalyticsSummary
  hourlyVolume: HourlyVolume[]
  shiftVolume: ShiftVolume[]
  bayDemand: BayDemand[]
  typeBreakdown: TypeBreakdown[]
  loading: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getShift(hour: number): string {
  if (hour >= 7  && hour < 15) return 'Day'
  if (hour >= 15 && hour < 23) return 'Evening'
  return 'Night'
}

function pad(n: number) { return String(n).padStart(2, '0') }

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAnalytics(
  unitId: string | undefined,
  tenantId: string | undefined,
  requestTypes: RequestTypeConfig[] = REQUEST_TYPES
): AnalyticsData {
  const [data, setData] = useState<Omit<AnalyticsData, 'loading'>>({
    summary:       { totalToday: 0, avgResponseSec: null, fastestSec: null, resolvedPct: 0 },
    hourlyVolume:  [],
    shiftVolume:   [],
    bayDemand:     [],
    typeBreakdown: [],
  })
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!tenantId && !unitId) {
      setLoading(false)
      return
    }
    setLoading(true)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Fetch all of today's requests for this unit
    const { data: rows } = await supabase
      .from('requests')
      .select(`
        id, type, status, is_urgent,
        created_at, acknowledged_at, resolved_at,
        room:rooms (
          id, name,
          unit:units (
            id,
            site:sites (tenant_id)
          )
        )
      `)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: true })

    if (!rows) { setLoading(false); return }

    type RawRequest = {
      id: string
      type: string
      status: string
      is_urgent: boolean
      created_at: string
      acknowledged_at?: string | null
      resolved_at?: string | null
      room?: MaybeArray<{
        id?: string
        name?: string
        unit?: MaybeArray<{
          id?: string
          site?: MaybeArray<{ tenant_id?: string }>
        }>
      }>
    }

    // Filter to unit
    const requests = (rows as RawRequest[]).filter(r => {
      const room = getSingle(r.room)
      const unit = getSingle(room?.unit)
      const site = getSingle(unit?.site)
      return unitId ? unit?.id === unitId : site?.tenant_id === tenantId
    })

    const roomName = (request: RawRequest) => getSingle(request.room)?.name ?? 'Unknown'

    const requestType = (request: RawRequest) => request.type

    const requestStatus = (request: RawRequest) => request.status

    const requestCreatedAt = (request: RawRequest) => request.created_at

    const requestAcknowledgedAt = (request: RawRequest) => request.acknowledged_at ?? null

    const requestUrgent = (request: RawRequest) => request.is_urgent
    const total = requests.length
    const resolved = requests.filter(r => requestStatus(r) === 'resolved')

    // Avg / fastest response
    const ackTimes = requests
      .filter(r => Boolean(requestAcknowledgedAt(r)))
      .map(r =>
        (new Date(requestAcknowledgedAt(r)!).getTime() - new Date(requestCreatedAt(r)).getTime()) / 1000
      )

    const avgResponseSec = ackTimes.length
      ? Math.round(ackTimes.reduce((a: number, b: number) => a + b, 0) / ackTimes.length)
      : null
    const fastestSec = ackTimes.length ? Math.round(Math.min(...ackTimes)) : null
    const resolvedPct = total > 0 ? Math.round((resolved.length / total) * 100) : 0

    // ── Hourly volume ─────────────────────────────────────────────
    const hourMap: Record<number, { requests: number; urgent: number }> = {}
    for (let h = 0; h < 24; h++) hourMap[h] = { requests: 0, urgent: 0 }

    requests.forEach(r => {
      const h = new Date(requestCreatedAt(r)).getHours()
      hourMap[h].requests++
      if (requestUrgent(r)) hourMap[h].urgent++
    })

    const hourlyVolume: HourlyVolume[] = Object.entries(hourMap)
      .filter(([h]) => Number(h) <= new Date().getHours())
      .map(([h, v]) => ({
        hour: `${pad(Number(h))}:00`,
        requests: v.requests,
        urgent: v.urgent,
      }))

    // ── Shift volume ──────────────────────────────────────────────
    const shiftMap: Record<string, { requests: number; resolved: number; ackTimes: number[] }> = {
      Night:   { requests: 0, resolved: 0, ackTimes: [] },
      Day:     { requests: 0, resolved: 0, ackTimes: [] },
      Evening: { requests: 0, resolved: 0, ackTimes: [] },
    }

    requests.forEach(r => {
      const shift = getShift(new Date(requestCreatedAt(r)).getHours())
      shiftMap[shift].requests++
      if (requestStatus(r) === 'resolved') shiftMap[shift].resolved++
      if (requestAcknowledgedAt(r)) {
        const t = (new Date(requestAcknowledgedAt(r)!).getTime() - new Date(requestCreatedAt(r)).getTime()) / 1000
        shiftMap[shift].ackTimes.push(t)
      }
    })

    const shiftVolume: ShiftVolume[] = ['Night', 'Day', 'Evening'].map(shift => {
      const s = shiftMap[shift]
      return {
        shift,
        requests: s.requests,
        resolved: s.resolved,
        avgResponseMin: s.ackTimes.length
          ? Math.round(s.ackTimes.reduce((a, b) => a + b, 0) / s.ackTimes.length / 60)
          : 0,
      }
    })

    // ── Bay demand ────────────────────────────────────────────────
    const bayMap: Record<string, number> = {}
    requests.forEach(r => {
      const name = roomName(r)
      bayMap[name] = (bayMap[name] ?? 0) + 1
    })

    const maxBay = Math.max(1, ...Object.values(bayMap))
    const bayDemand: BayDemand[] = Object.entries(bayMap)
      .sort((a, b) => b[1] - a[1])
      .map(([bay, count]) => ({
        bay,
        count,
        intensity: count / maxBay,
      }))

    // ── Type breakdown ────────────────────────────────────────────
    const typeMap: Record<string, number> = {}
    requests.forEach(r => {
      typeMap[requestType(r)] = (typeMap[requestType(r)] ?? 0) + 1
    })

    const typeBreakdown: TypeBreakdown[] = requestTypes
      .map(rt => ({
        type:  rt.id,
        label: rt.label,
        icon:  rt.icon,
        count: typeMap[rt.id] ?? 0,
        pct:   total > 0 ? Math.round(((typeMap[rt.id] ?? 0) / total) * 100) : 0,
        color: rt.color,
      }))
      .filter(t => t.count > 0)
      .sort((a, b) => b.count - a.count)

    setData({
      summary: { totalToday: total, avgResponseSec, fastestSec, resolvedPct },
      hourlyVolume,
      shiftVolume,
      bayDemand,
      typeBreakdown,
    })
    setLoading(false)
  }, [requestTypes, tenantId, unitId])

  useEffect(() => { fetch() }, [fetch])

  return { ...data, loading }
}
