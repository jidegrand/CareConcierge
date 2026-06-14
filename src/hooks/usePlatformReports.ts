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

interface FamilyChatReportRow {
  id: string
  sender_role: string
  created_at: string
  resident?: MaybeArray<{
    tenant_id?: string
    tenant?: MaybeArray<{ name?: string; slug?: string }>
  }>
}

export interface PlatformReportsSnapshot {
  totalRequests: number
  urgentRequests: number
  resolvedRequests: number
  activeOrganizations: number
  avgResolutionMinutes: number | null
  totalFamilyMessages: number
  familyMessagesFromFamily: number
  familyMessagesFromStaff: number
  organizations: Array<{ tenantId: string; name: string; requests: number; urgent: number; resolved: number; familyMessages: number }>
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
  const [familyChatRows, setFamilyChatRows] = useState<FamilyChatReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setRows([])
      setFamilyChatRows([])
      setLoading(false)
      return
    }

    const fetch = async () => {
      setLoading(true)
      setError(null)

      const startIso = new Date(`${rangeStart}T00:00:00`).toISOString()
      const endIso = new Date(`${rangeEnd}T23:59:59.999`).toISOString()

      const [requestsRes, familyChatRes] = await Promise.all([
        supabase
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
          .order('created_at', { ascending: true }),

        supabase
          .from('family_chat_messages')
          .select(`
            id,
            sender_role,
            created_at,
            resident:residents (
              tenant_id,
              tenant:tenants (name, slug)
            )
          `)
          .gte('created_at', startIso)
          .lte('created_at', endIso)
          .order('created_at', { ascending: true }),
      ])

      if (requestsRes.error) {
        setError(requestsRes.error.message)
        setRows([])
        setFamilyChatRows([])
        setLoading(false)
        return
      }

      setRows((requestsRes.data ?? []) as RequestReportRow[])
      setFamilyChatRows((familyChatRes.data ?? []) as FamilyChatReportRow[])
      setLoading(false)
    }

    fetch()
  }, [rangeEnd, rangeStart, enabled])

  return useMemo(() => {
    const organizationMap = new Map<string, { tenantId: string; name: string; requests: number; urgent: number; resolved: number; familyMessages: number }>()
    const requestTypeMap = new Map<string, number>()
    const dailyTrendMap = new Map<string, number>()
    const resolutionMinutes: number[] = []

    const getOrganization = (tenantId: string, tenantName: string) => {
      const existing = organizationMap.get(tenantId)
      if (existing) return existing
      const created = { tenantId, name: tenantName, requests: 0, urgent: 0, resolved: 0, familyMessages: 0 }
      organizationMap.set(tenantId, created)
      return created
    }

    const scopedRows = organizationId
      ? rows.filter((row) => getSingle(getSingle(row.room?.unit)?.site)?.tenant_id === organizationId)
      : rows

    scopedRows.forEach((row) => {
      const site = getSingle(getSingle(row.room?.unit)?.site)
      const tenant = getSingle(site?.tenant)
      const tenantId = site?.tenant_id ?? 'unknown'
      const tenantName = tenant?.name ?? 'Unknown organization'

      const organization = getOrganization(tenantId, tenantName)
      organization.requests += 1
      if (row.is_urgent) organization.urgent += 1
      if (row.status === 'resolved') organization.resolved += 1

      requestTypeMap.set(row.type, (requestTypeMap.get(row.type) ?? 0) + 1)

      const dayKey = row.created_at.slice(0, 10)
      dailyTrendMap.set(dayKey, (dailyTrendMap.get(dayKey) ?? 0) + 1)

      if (row.resolved_at) {
        const minutes = Math.round((new Date(row.resolved_at).getTime() - new Date(row.created_at).getTime()) / 60000)
        if (Number.isFinite(minutes) && minutes >= 0) resolutionMinutes.push(minutes)
      }
    })

    const scopedFamilyChatRows = organizationId
      ? familyChatRows.filter((row) => getSingle(row.resident)?.tenant_id === organizationId)
      : familyChatRows

    scopedFamilyChatRows.forEach((row) => {
      const resident = getSingle(row.resident)
      const tenant = getSingle(resident?.tenant)
      const tenantId = resident?.tenant_id ?? 'unknown'
      const tenantName = tenant?.name ?? 'Unknown organization'

      getOrganization(tenantId, tenantName).familyMessages += 1
    })

    const totalRequests = scopedRows.length
    const urgentRequests = scopedRows.filter(row => row.is_urgent).length
    const resolvedRequests = scopedRows.filter(row => row.status === 'resolved').length
    const activeOrganizations = Array.from(organizationMap.values()).filter(entry => entry.requests > 0).length
    const avgResolutionMinutes = resolutionMinutes.length
      ? Math.round(resolutionMinutes.reduce((sum, value) => sum + value, 0) / resolutionMinutes.length)
      : null
    const totalFamilyMessages = scopedFamilyChatRows.length
    const familyMessagesFromFamily = scopedFamilyChatRows.filter(row => row.sender_role === 'family').length
    const familyMessagesFromStaff = scopedFamilyChatRows.filter(row => row.sender_role === 'staff').length

    return {
      totalRequests,
      urgentRequests,
      resolvedRequests,
      activeOrganizations,
      avgResolutionMinutes,
      totalFamilyMessages,
      familyMessagesFromFamily,
      familyMessagesFromStaff,
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
  }, [rows, familyChatRows, loading, error, organizationId])
}
