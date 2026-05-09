import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { slugify } from '@/lib/utils'
import type { Tenant } from '@/types'

export interface OrganizationWithStats extends Tenant {
  siteCount: number
  unitCount: number
  roomCount: number
  requestCount: number
  userCount: number
  requestTypeCount: number
}

export type TenantWithStats = OrganizationWithStats

const normalizeOptionalUrl = (value: string | undefined) => {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(candidate)
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Organization website must start with http:// or https://.')
    }
    return url.toString()
  } catch {
    throw new Error('Enter a valid organization website URL.')
  }
}

function formatTenantDeleteError(message: string) {
  if (/requests_room_id_fkey|request.*room/i.test(message)) {
    return 'This organization still has request history tied to its rooms. Apply the delete organization cascade migration, then try again.'
  }

  return message
}

export function useTenants(enabled = true) {
  const [tenants, setTenants] = useState<OrganizationWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!enabled) {
      setTenants([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const [tenantsRes, sitesRes, usersRes, requestTypesRes, requestsRes] = await Promise.all([
      supabase.from('tenants').select('id, name, slug, organization_url, created_at').order('created_at'),
      supabase.from('sites').select('tenant_id, units(id, rooms(id))'),
      supabase.from('user_profiles').select('id, tenant_id').eq('active', true),
      supabase.from('request_types').select('id, tenant_id'),
      supabase.from('requests').select('id, room:rooms(unit:units(site:sites(tenant_id)))'),
    ])

    const firstError = tenantsRes.error ?? sitesRes.error ?? usersRes.error ?? requestTypesRes.error ?? requestsRes.error
    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    const tenantRows = (tenantsRes.data ?? []) as Tenant[]
    const siteRows = (sitesRes.data ?? []) as {
      tenant_id: string
      units?: { id: string; rooms?: { id: string }[] }[]
    }[]
    const userRows = (usersRes.data ?? []) as { tenant_id: string }[]
    const requestTypeRows = (requestTypesRes.data ?? []) as { tenant_id: string }[]
    const requestRows = (requestsRes.data ?? []) as {
      room?: {
        unit?: {
          site?: { tenant_id?: string } | { tenant_id?: string }[] | null
        } | { site?: { tenant_id?: string } | { tenant_id?: string }[] | null }[] | null
      } | null
    }[]

    const getRequestTenantId = (row: typeof requestRows[number]) => {
      const unit = Array.isArray(row.room?.unit) ? row.room?.unit[0] : row.room?.unit
      const site = Array.isArray(unit?.site) ? unit?.site[0] : unit?.site
      return site?.tenant_id
    }

    const tenantSummaries = tenantRows.map((tenant) => {
      const tenantSites = siteRows.filter(site => site.tenant_id === tenant.id)
      const siteCount = tenantSites.length
      const unitCount = tenantSites.reduce((sum, site) => sum + (site.units?.length ?? 0), 0)
      const roomCount = tenantSites.reduce(
        (sum, site) => sum + (site.units ?? []).reduce((unitSum, unit) => unitSum + (unit.rooms?.length ?? 0), 0),
        0,
      )
      return {
        ...tenant,
        siteCount,
        unitCount,
        roomCount,
        requestCount: requestRows.filter(request => getRequestTenantId(request) === tenant.id).length,
        userCount: userRows.filter(user => user.tenant_id === tenant.id).length,
        requestTypeCount: requestTypeRows.filter(rt => rt.tenant_id === tenant.id).length,
      }
    })

    setTenants(tenantSummaries)
    setLoading(false)
  }, [enabled])

  useEffect(() => { fetch() }, [fetch])

  const createTenant = async (name: string, slug?: string, organizationUrl?: string) => {
    const nextSlug = slugify(slug || name)
    const { error: err } = await supabase.from('tenants').insert({
      name: name.trim(),
      slug: nextSlug,
      organization_url: normalizeOptionalUrl(organizationUrl),
    })
    if (err) throw new Error(err.message)
    await fetch()
  }

  const updateTenant = async (id: string, name: string, slug: string, organizationUrl?: string) => {
    const nextSlug = slugify(slug || name)
    const { error: err } = await supabase.from('tenants').update({
      name: name.trim(),
      slug: nextSlug,
      organization_url: normalizeOptionalUrl(organizationUrl),
    }).eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const deleteTenant = async (id: string) => {
    const { error: err } = await supabase.from('tenants').delete().eq('id', id)
    if (err) throw new Error(formatTenantDeleteError(err.message))
    await fetch()
  }

  return { tenants, loading, error, refresh: fetch, createTenant, updateTenant, deleteTenant }
}
