import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getSingle, type MaybeArray } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────
export type StaffRole =
  | 'super_admin'
  | 'tenant_admin'
  | 'nurse_manager'
  | 'site_manager'
  | 'charge_nurse'
  | 'nurse'
  | 'volunteer'
  | 'viewer'

export interface StaffMember {
  id:         string
  fullName:   string
  initials:   string
  role:       StaffRole
  unitId:     string | null
  unitName:   string | null
  // Workload
  resolvedToday:     number
  acknowledgedToday: number       // requests acknowledged (picked up) today
  avgResolveSec:     number | null   // avg time from created → resolved today
  avgAckSec:         number | null   // avg time from created → acknowledged today
  lastActivityAt:    string | null   // ISO
  isActive:          boolean         // activity in last 60 min
}

export interface StaffingSummary {
  totalStaff:        number
  activeNow:         number          // active in last 60 min
  resolvedToday:     number
  acknowledgedToday: number
  avgResolveSec:     number | null
  avgAckSec:         number | null
}

interface UseStaffingResult {
  staff:    StaffMember[]
  summary:  StaffingSummary
  loading:  boolean
  refresh:  () => void
}

const ROLE_PRIORITY: Record<StaffRole, number> = {
  super_admin: 0,
  tenant_admin: 0,
  nurse_manager: 1,
  site_manager: 1,
  charge_nurse: 2,
  nurse: 3,
  volunteer: 4,
  viewer: 4,
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useStaffing(tenantId: string | undefined, unitId: string | undefined): UseStaffingResult {
  const [staff,   setStaff]   = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!tenantId) {
      setStaff([])
      setLoading(false)
      return
    }
    setLoading(true)

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const now   = Date.now()

    // 1. Load user profiles for this tenant (optionally scoped to unit)
    let profileQuery = supabase
      .from('user_profiles')
      .select('id, full_name, role, unit_id, unit:units(name)')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('role')

    // If unit-scoped nurse, only show their unit + admins
    if (unitId) {
      profileQuery = profileQuery.or(`unit_id.eq.${unitId},unit_id.is.null`)
    }

    const { data: profiles } = await profileQuery

    if (!profiles || profiles.length === 0) {
      setStaff([])
      setLoading(false)
      return
    }

    const profileIds = profiles.map((p: { id: string }) => p.id)

    // 2. Load today's resolved requests grouped by resolved_by
    const { data: resolvedReqs } = await supabase
      .from('requests')
      .select('id, resolved_by, created_at, resolved_at')
      .in('resolved_by', profileIds)
      .gte('created_at', today.toISOString())
      .not('resolved_at', 'is', null)

    // 3. Load today's acknowledged requests grouped by acknowledged_by
    const { data: acknowledgedReqs } = await supabase
      .from('requests')
      .select('id, acknowledged_by, created_at, acknowledged_at')
      .in('acknowledged_by', profileIds)
      .gte('created_at', today.toISOString())
      .not('acknowledged_at', 'is', null)

    // Index resolved workload by resolver
    const workloadMap: Record<string, {
      resolvedCount: number
      resolveTimes: number[]
      acknowledgedCount: number
      ackTimes: number[]
      lastAt: string | null
    }> = {}

    for (const r of (resolvedReqs ?? []) as {
      id: string
      resolved_by: string
      created_at: string
      resolved_at: string
    }[]) {
      if (!workloadMap[r.resolved_by]) {
        workloadMap[r.resolved_by] = { resolvedCount: 0, resolveTimes: [], acknowledgedCount: 0, ackTimes: [], lastAt: null }
      }
      workloadMap[r.resolved_by].resolvedCount++

      const resolveSec = (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()) / 1000
      workloadMap[r.resolved_by].resolveTimes.push(resolveSec)

      if (!workloadMap[r.resolved_by].lastAt ||
          r.resolved_at > workloadMap[r.resolved_by].lastAt!) {
        workloadMap[r.resolved_by].lastAt = r.resolved_at
      }
    }

    // Index acknowledged workload by acknowledger
    for (const r of (acknowledgedReqs ?? []) as {
      id: string
      acknowledged_by: string
      created_at: string
      acknowledged_at: string
    }[]) {
      if (!workloadMap[r.acknowledged_by]) {
        workloadMap[r.acknowledged_by] = { resolvedCount: 0, resolveTimes: [], acknowledgedCount: 0, ackTimes: [], lastAt: null }
      }
      workloadMap[r.acknowledged_by].acknowledgedCount++

      const ackSec = (new Date(r.acknowledged_at).getTime() - new Date(r.created_at).getTime()) / 1000
      workloadMap[r.acknowledged_by].ackTimes.push(ackSec)

      if (!workloadMap[r.acknowledged_by].lastAt ||
          r.acknowledged_at > workloadMap[r.acknowledged_by].lastAt!) {
        workloadMap[r.acknowledged_by].lastAt = r.acknowledged_at
      }
    }

    // 3. Build staff members
    const built: StaffMember[] = profiles
      .map((p: {
        id: string
        full_name: string | null
        role: StaffRole
        unit_id: string | null
        unit: MaybeArray<{ name: string }>
      }) => {
        const name     = p.full_name ?? `User ${p.id.slice(0, 6)}`
        const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
        const wl       = workloadMap[p.id]
        const unit     = getSingle(p.unit)

        const avgResolveSec = wl && wl.resolveTimes.length > 0
          ? Math.round(wl.resolveTimes.reduce((a, b) => a + b, 0) / wl.resolveTimes.length)
          : null

        const avgAckSec = wl && wl.ackTimes.length > 0
          ? Math.round(wl.ackTimes.reduce((a, b) => a + b, 0) / wl.ackTimes.length)
          : null

        const lastActivityAt = wl?.lastAt ?? null
        const isActive = lastActivityAt
          ? (now - new Date(lastActivityAt).getTime()) < 60 * 60 * 1000
          : false

        return {
          id:                p.id,
          fullName:          name,
          initials,
          role:              p.role,
          unitId:            p.unit_id,
          unitName:          unit?.name ?? null,
          resolvedToday:     wl?.resolvedCount ?? 0,
          acknowledgedToday: wl?.acknowledgedCount ?? 0,
          avgResolveSec,
          avgAckSec,
          lastActivityAt,
          isActive,
        }
      })
      .sort((a, b) =>
        (ROLE_PRIORITY[a.role] ?? 9) - (ROLE_PRIORITY[b.role] ?? 9) ||
        b.resolvedToday - a.resolvedToday
      )

    setStaff(built)
    setLoading(false)
  }, [tenantId, unitId])

  useEffect(() => { fetch() }, [fetch])

  const allResolveTimes = staff.filter(s => s.avgResolveSec !== null).map(s => s.avgResolveSec!)
  const allAckTimes     = staff.filter(s => s.avgAckSec !== null).map(s => s.avgAckSec!)

  const summary: StaffingSummary = {
    totalStaff:        staff.length,
    activeNow:         staff.filter(s => s.isActive).length,
    resolvedToday:     staff.reduce((a, s) => a + s.resolvedToday, 0),
    acknowledgedToday: staff.reduce((a, s) => a + s.acknowledgedToday, 0),
    avgResolveSec: allResolveTimes.length
      ? Math.round(allResolveTimes.reduce((a, b) => a + b, 0) / allResolveTimes.length)
      : null,
    avgAckSec: allAckTimes.length
      ? Math.round(allAckTimes.reduce((a, b) => a + b, 0) / allAckTimes.length)
      : null,
  }

  return { staff, summary, loading, refresh: fetch }
}
