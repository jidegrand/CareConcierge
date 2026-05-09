import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { getAppOrigin, getTenantSlugFromHostname, type TenantIdentity } from '@/lib/tenant'
import type { Tenant, TenantSetting } from '@/types'

type TenantContextTenant = Tenant | TenantIdentity

export interface TenantContextValue {
  tenant: TenantContextTenant | null
  settings: TenantSetting | null
  loading: boolean
  error: string | null
  tenantId: string | undefined
  tenantName: string | undefined
  tenantSlug: string | undefined
  siteId: string | undefined
  unitId: string | undefined
  appOrigin: string
  refreshTenant: () => Promise<void>
  updateSettings: (updates: Partial<TenantSetting>) => Promise<{ success: boolean; error?: string }>
}

const TenantContext = createContext<TenantContextValue | null>(null)

export function useTenantContext(): TenantContextValue {
  const providerValue = useContext(TenantContext)
  const fallbackValue = useResolvedTenantContext(providerValue === null)
  return providerValue ?? fallbackValue
}

function useResolvedTenantContext(enabled: boolean): TenantContextValue {
  const { profile, loading: authLoading } = useAuth()
  const [tenant, setTenant] = useState<TenantContextTenant | null>(null)
  const [settings, setSettings] = useState<TenantSetting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshTenant = useCallback(async () => {
    if (!enabled || authLoading) return

    const hostSlug = getTenantSlugFromHostname()

    if (!profile?.tenant_id && !hostSlug) {
      setTenant(null)
      setSettings(null)
      setError(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      let nextTenant: TenantContextTenant | null = null

      if (profile?.tenant_id) {
        const { data, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', profile.tenant_id)
          .single()

        if (tenantError) throw tenantError
        nextTenant = data as Tenant | null
      } else {
        const { data, error: tenantError } = await supabase.rpc('resolve_tenant_by_slug', {
          target_slug: hostSlug,
        })

        if (tenantError) throw tenantError

        const resolved = Array.isArray(data) ? data[0] : data
        nextTenant = (resolved as TenantIdentity | null) ?? null
      }

      setTenant(nextTenant)

      if (!nextTenant?.id) {
        setSettings(null)
        return
      }

      const { data: settingsData, error: settingsError } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('tenant_id', nextTenant.id)
        .maybeSingle()

      if (settingsError) throw settingsError
      setSettings((settingsData as TenantSetting | null) ?? null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tenant data'
      setTenant(null)
      setSettings(null)
      setError(message)
      console.error('Error loading tenant context:', message)
    } finally {
      setLoading(false)
    }
  }, [authLoading, enabled, profile?.tenant_id])

  const updateSettings = useCallback(
    async (updates: Partial<TenantSetting>) => {
      if (!enabled) return { success: false, error: 'Tenant context is provided elsewhere.' }

      const currentTenantId = profile?.tenant_id ?? tenant?.id
      if (!currentTenantId) {
        return { success: false, error: 'Tenant settings require a tenant context.' }
      }

      try {
        const { data, error: err } = await supabase
          .from('tenant_settings')
          .upsert({
            tenant_id: currentTenantId,
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (err) throw err

        setSettings(data as TenantSetting)
        return { success: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update settings'
        return { success: false, error: message }
      }
    },
    [enabled, profile?.tenant_id, tenant?.id]
  )

  useEffect(() => {
    if (!enabled) return
    void refreshTenant()
  }, [enabled, refreshTenant])

  const tenantId = profile?.tenant_id ?? tenant?.id
  const tenantSlug = tenant?.slug ?? getTenantSlugFromHostname() ?? undefined

  return {
    tenant,
    settings,
    loading: enabled ? authLoading || loading : false,
    error,
    tenantId,
    tenantName: tenant?.name,
    tenantSlug,
    siteId: profile?.site_id ?? undefined,
    unitId: profile?.unit_id ?? undefined,
    appOrigin: getAppOrigin(),
    refreshTenant,
    updateSettings,
  }
}

interface TenantProviderProps {
  tenantId: string
  children: ReactNode
}

export function TenantProvider({ tenantId, children }: TenantProviderProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [settings, setSettings] = useState<TenantSetting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshTenant = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single()

      if (tenantError) throw tenantError
      setTenant(tenantData as Tenant)

      const { data: settingsData, error: settingsError } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (settingsError) throw settingsError
      setSettings((settingsData as TenantSetting | null) ?? null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tenant data'
      setError(message)
      console.error('Error loading tenant context:', message)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  const updateSettings = useCallback(
    async (updates: Partial<TenantSetting>) => {
      try {
        const { data, error: err } = await supabase
          .from('tenant_settings')
          .upsert({
            tenant_id: tenantId,
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (err) throw err

        setSettings(data as TenantSetting)
        return { success: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update settings'
        return { success: false, error: message }
      }
    },
    [tenantId]
  )

  useEffect(() => {
    void refreshTenant()
  }, [refreshTenant])

  const value = useMemo<TenantContextValue>(
    () => ({
      tenant,
      settings,
      loading,
      error,
      tenantId: tenant?.id ?? tenantId,
      tenantName: tenant?.name,
      tenantSlug: tenant?.slug,
      siteId: undefined,
      unitId: undefined,
      appOrigin: getAppOrigin(),
      refreshTenant,
      updateSettings,
    }),
    [error, loading, refreshTenant, settings, tenant, tenantId, updateSettings]
  )

  return createElement(TenantContext.Provider, { value }, children)
}
