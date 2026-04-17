import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { getAppOrigin, getTenantSlugFromHostname, type TenantIdentity } from '@/lib/tenant'

interface TenantContextValue {
  tenant: TenantIdentity | null
  tenantId: string | undefined
  tenantName: string | undefined
  tenantSlug: string | undefined
  unitId: string | undefined
  loading: boolean
  appOrigin: string
}

export function useTenantContext(): TenantContextValue {
  const { profile, loading: authLoading } = useAuth()
  const [tenant, setTenant] = useState<TenantIdentity | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function resolveTenant() {
      if (authLoading) return

      const hostSlug = getTenantSlugFromHostname()

      if (!profile?.tenant_id && !hostSlug) {
        if (!cancelled) { setTenant(null); setLoading(false) }
        return
      }

      if (!cancelled) setLoading(true)

      try {
        if (profile?.tenant_id) {
          const { data } = await supabase
            .from('tenants')
            .select('id, name, slug')
            .eq('id', profile.tenant_id)
            .single()

          if (!cancelled) {
            setTenant((data as TenantIdentity | null) ?? null)
            setLoading(false)
          }
          return
        }

        const { data } = await supabase.rpc('resolve_tenant_by_slug', {
          target_slug: hostSlug,
        })

        const resolved = Array.isArray(data) ? data[0] : data
        if (!cancelled) {
          setTenant((resolved as TenantIdentity | null) ?? null)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setTenant(null)
          setLoading(false)
        }
      }
    }

    resolveTenant()

    return () => { cancelled = true }
  }, [authLoading, profile?.tenant_id])

  return {
    tenant,
    tenantId: profile?.tenant_id ?? tenant?.id,
    tenantName: tenant?.name,
    tenantSlug: tenant?.slug ?? getTenantSlugFromHostname() ?? undefined,
    unitId: profile?.unit_id ?? undefined,
    loading: authLoading || loading,
    appOrigin: getAppOrigin(),
  }
}
