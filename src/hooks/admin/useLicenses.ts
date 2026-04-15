import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tenant, TenantLicense } from '@/types'

export interface TenantLicenseRecord extends TenantLicense {
  organizationName: string
  organizationSlug: string
  exists: boolean
}

export function useTenantLicenses(enabled = true) {
  const [licenses, setLicenses] = useState<TenantLicenseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!enabled) {
      setLicenses([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const [tenantsRes, licensesRes] = await Promise.all([
      supabase.from('tenants').select('id, name, slug, created_at').order('created_at'),
      supabase.from('tenant_licenses').select('*').order('created_at'),
    ])

    const firstError = tenantsRes.error ?? licensesRes.error
    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    const tenantRows = (tenantsRes.data ?? []) as Tenant[]
    const licenseRows = (licensesRes.data ?? []) as TenantLicense[]

    const mapped = tenantRows.map((tenant) => {
      const license = licenseRows.find(entry => entry.tenant_id === tenant.id)
      return {
        id: license?.id ?? tenant.id,
        tenant_id: tenant.id,
        status: license?.status ?? 'trial',
        plan: license?.plan ?? 'pilot',
        site_limit: license?.site_limit ?? null,
        unit_limit: license?.unit_limit ?? null,
        room_limit: license?.room_limit ?? null,
        user_limit: license?.user_limit ?? null,
        starts_at: license?.starts_at ?? null,
        expires_at: license?.expires_at ?? null,
        features: license?.features ?? {},
        notes: license?.notes ?? null,
        created_at: license?.created_at ?? tenant.created_at,
        updated_at: license?.updated_at ?? tenant.created_at,
        organizationName: tenant.name,
        organizationSlug: tenant.slug,
        exists: Boolean(license),
      } satisfies TenantLicenseRecord
    })

    setLicenses(mapped)
    setLoading(false)
  }, [enabled])

  useEffect(() => { fetch() }, [fetch])

  const saveLicense = async (
    tenantId: string,
    values: Omit<TenantLicense, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>,
  ) => {
    const { error: err } = await supabase
      .from('tenant_licenses')
      .upsert({ tenant_id: tenantId, ...values, updated_at: new Date().toISOString() }, { onConflict: 'tenant_id' })
    if (err) throw new Error(err.message)
    await fetch()
  }

  const deleteLicense = async (tenantId: string) => {
    const { error: err } = await supabase.from('tenant_licenses').delete().eq('tenant_id', tenantId)
    if (err) throw new Error(err.message)
    await fetch()
  }

  return { licenses, loading, error, refresh: fetch, saveLicense, deleteLicense }
}
