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
  // Workload derived from resolved_by
  resolvedToday:  number
  avgResolveSec:  number | null   // avg time from created → resolved today
  lastActivityAt: string | null   // ISO
  isActive:       boolean         // resolved something in last 60 min
}

export interface StaffingSummary {
  totalStaff:     number
  activeNow:      number          // active in last 60 min
  resolvedToday:  number
  avgResolveSec:  number | null
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

    // Index by resolver
    const workloadMap: Record<string, {
      count: number
      times: number[]
      lastAt: string | null
    }> = {}

    for (const r of (resolvedReqs ?? []) as {
      id: string
      resolved_by: string
      created_at: string
      resolved_at: string
    }[]) {
      if (!workloadMap[r.resolved_by]) {
        workloadMap[r.resolved_by] = { count: 0, times: [], lastAt: null }
      }
      workloadMap[r.resolved_by].count++

      const resolveSec = (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()) / 1000
      workloadMap[r.resolved_by].times.push(resolveSec)

      if (!workloadMap[r.resolved_by].lastAt ||
          r.resolved_at > workloadMap[r.resolved_by].lastAt!) {
        workloadMap[r.resolved_by].lastAt = r.resolved_at
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

        const avgResolveSec = wl && wl.times.length > 0
          ? Math.round(wl.times.reduce((a, b) => a + b, 0) / wl.times.length)
          : null

        const lastActivityAt = wl?.lastAt ?? null
        const isActive = lastActivityAt
          ? (now - new Date(lastActivityAt).getTime()) < 60 * 60 * 1000
          : false

        return {
          id:            p.id,
          fullName:      name,
          initials,
          role:          p.role,
          unitId:        p.unit_id,
          unitName:      unit?.name ?? null,
          resolvedToday: wl?.count ?? 0,
          avgResolveSec,
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

  const allTimes = staff
    .filter(s => s.avgResolveSec !== null)
    .map(s => s.avgResolveSec!)

  const summary: StaffingSummary = {
    totalStaff:    staff.length,
    activeNow:     staff.filter(s => s.isActive).length,
    resolvedToday: staff.reduce((a, s) => a + s.resolvedToday, 0),
    avgResolveSec: allTimes.length
      ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length)
      : null,
  }

  return { staff, summary, loading, refresh: fetch }
}
