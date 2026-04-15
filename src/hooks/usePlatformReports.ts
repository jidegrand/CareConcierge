import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getSingle, type MaybeArray } from '@/lib/utils'

interface RequestReportRow {
  id: string
  type: string
  status: string
  is_urgent: boolean
  created_at: string
  resolved_at: string | null
  room?: {
    unit?: MaybeArray<{
      site?: MaybeArray<{
        tenant_id?: string
        tenant?: MaybeArray<{ name?: string; slug?: string }>
      }>
    }>
  }
}

export interface PlatformReportsSnapshot {
  totalRequests: number
  urgentRequests: number
  resolvedRequests: number
  activeOrganizations: number
  avgResolutionMinutes: number | null
  organizations: Array<{ tenantId: string; name: string; requests: number; urgent: number; resolved: number }>
  requestTypes: Array<{ type: string; count: number }>
  dailyTrend: Array<{ date: string; requests: number }>
  loading: boolean
  error: string | null
}

export function usePlatformReports(
  rangeStart: string,
  rangeEnd: string,
  enabled = true,
  organizationId?: string,
): PlatformReportsSnapshot {
  const [rows, setRows] = useState<RequestReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setRows([])
      setLoading(false)
      return
    }

    const fetch = async () => {
      setLoading(true)
      setError(null)

      const startIso = new Date(`${rangeStart}T00:00:00`).toISOString()
      const endIso = new Date(`${rangeEnd}T23:59:59.999`).toISOString()

      const { data, error: err } = await supabase
        .from('requests')
        .select(`
          id,
          type,
          status,
          is_urgent,
          created_at,
          resolved_at,
          room:rooms (
            unit:units (
              site:sites (
                tenant_id,
                tenant:tenants (name, slug)
              )
            )
          )
        `)
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: true })

      if (err) {
        setError(err.message)
        setRows([])
        setLoading(false)
        return
      }

      setRows((data ?? []) as RequestReportRow[])
      setLoading(false)
    }

    fetch()
  }, [rangeEnd, rangeStart, enabled])

  return useMemo(() => {
    const organizationMap = new Map<string, { tenantId: string; name: string; requests: number; urgent: number; resolved: number }>()
    const requestTypeMap = new Map<string, number>()
    const dailyTrendMap = new Map<string, number>()
    const resolutionMinutes: number[] = []

    const scopedRows = organizationId
      ? rows.filter((row) => getSingle(getSingle(row.room?.unit)?.site)?.tenant_id === organizationId)
      : rows

    scopedRows.forEach((row) => {
      const site = getSingle(getSingle(row.room?.unit)?.site)
      const tenant = getSingle(site?.tenant)
      const tenantId = site?.tenant_id ?? 'unknown'
      const tenantName = tenant?.name ?? 'Unknown organization'

      const organization = organizationMap.get(tenantId) ?? {
        tenantId,
        name: tenantName,
        requests: 0,
        urgent: 0,
        resolved: 0,
      }

      organization.requests += 1
      if (row.is_urgent) organization.urgent += 1
      if (row.status === 'resolved') organization.resolved += 1
      organizationMap.set(tenantId, organization)

      requestTypeMap.set(row.type, (requestTypeMap.get(row.type) ?? 0) + 1)

      const dayKey = row.created_at.slice(0, 10)
      dailyTrendMap.set(dayKey, (dailyTrendMap.get(dayKey) ?? 0) + 1)

      if (row.resolved_at) {
        const minutes = Math.round((new Date(row.resolved_at).getTime() - new Date(row.created_at).getTime()) / 60000)
        if (Number.isFinite(minutes) && minutes >= 0) resolutionMinutes.push(minutes)
      }
    })

    const totalRequests = scopedRows.length
    const urgentRequests = scopedRows.filter(row => row.is_urgent).length
    const resolvedRequests = scopedRows.filter(row => row.status === 'resolved').length
    const activeOrganizations = Array.from(organizationMap.values()).filter(entry => entry.requests > 0).length
    const avgResolutionMinutes = resolutionMinutes.length
      ? Math.round(resolutionMinutes.reduce((sum, value) => sum + value, 0) / resolutionMinutes.length)
      : null

    return {
      totalRequests,
      urgentRequests,
      resolvedRequests,
      activeOrganizations,
      avgResolutionMinutes,
      organizations: Array.from(organizationMap.values()).sort((a, b) => b.requests - a.requests),
      requestTypes: Array.from(requestTypeMap.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      dailyTrend: Array.from(dailyTrendMap.entries())
        .map(([date, requests]) => ({ date, requests }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      loading,
      error,
    }
  }, [rows, loading, error, organizationId])
}
