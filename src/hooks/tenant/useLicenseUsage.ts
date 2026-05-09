import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { TenantLicense } from '@/types'

export interface LicenseUsage {
  sites: { current: number; limit: number | null }
  units: { current: number; limit: number | null }
  rooms: { current: number; limit: number | null }
  users: { current: number; limit: number | null }
  status: 'trial' | 'active' | 'suspended' | 'archived'
  plan: string
  startsAt: string | null
  expiresAt: string | null
  daysUntilExpiry: number | null
  features: Record<string, boolean>
}

export function useLicenseUsage(tenantId: string) {
  const [usage, setUsage] = useState<LicenseUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [sitesRes, usersRes, licenseRes] = await Promise.all([
        supabase.from('sites').select('id', { count: 'exact' }).eq('tenant_id', tenantId),
        supabase
          .from('user_profiles')
          .select('id', { count: 'exact' })
          .eq('tenant_id', tenantId)
          .eq('active', true),
        supabase.from('tenant_licenses').select('*').eq('tenant_id', tenantId).single(),
      ])

      if (sitesRes.error) throw sitesRes.error
      if (usersRes.error) throw usersRes.error
      if (licenseRes.error && licenseRes.error.code !== 'PGRST116') throw licenseRes.error

      const siteIds = (sitesRes.data ?? []).map(site => site.id)
      const unitsRes = siteIds.length
        ? await supabase.from('units').select('id').in('site_id', siteIds)
        : { data: [], error: null }

      if (unitsRes.error) throw unitsRes.error

      const unitIds = (unitsRes.data ?? []).map(unit => unit.id)
      const roomsRes = unitIds.length
        ? await supabase.from('rooms').select('id', { count: 'exact', head: true }).in('unit_id', unitIds)
        : { count: 0, error: null }

      if (roomsRes.error) throw roomsRes.error

      // Handle license data
      const license = licenseRes.data as TenantLicense | null
      const now = new Date()
      const expiryDate = license?.expires_at ? new Date(license.expires_at) : null
      const daysUntilExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null

      setUsage({
        sites: {
          current: sitesRes.count || 0,
          limit: license?.site_limit ?? null,
        },
        units: {
          current: unitIds.length,
          limit: license?.unit_limit ?? null,
        },
        rooms: {
          current: roomsRes.count || 0,
          limit: license?.room_limit ?? null,
        },
        users: {
          current: usersRes.count || 0,
          limit: license?.user_limit ?? null,
        },
        status: license?.status ?? 'trial',
        plan: license?.plan || 'pilot',
        startsAt: license?.starts_at ?? null,
        expiresAt: license?.expires_at ?? null,
        daysUntilExpiry,
        features: license?.features || {},
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load license usage'
      setError(message)
      console.error('Error loading license usage:', message)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  const isLimitExceeded = useCallback(
    (category: 'sites' | 'units' | 'rooms' | 'users') => {
      if (!usage) return false
      const { current, limit } = usage[category]
      return limit !== null && current >= limit
    },
    [usage]
  )

  const isExpired = useCallback(() => {
    if (!usage?.expiresAt) return false
    return new Date(usage.expiresAt) < new Date()
  }, [usage])

  const isExpiringSoon = useCallback((daysThreshold: number = 30) => {
    if (!usage?.daysUntilExpiry) return false
    return usage.daysUntilExpiry <= daysThreshold && usage.daysUntilExpiry >= 0
  }, [usage])

  const hasFeature = useCallback(
    (featureName: string) => {
      return usage?.features[featureName] === true
    },
    [usage]
  )

  const canCreateMore = useCallback(
    (category: 'sites' | 'units' | 'rooms' | 'users') => {
      return !isLimitExceeded(category)
    },
    [isLimitExceeded]
  )

  useEffect(() => {
    void fetchUsage()
  }, [tenantId, fetchUsage])

  return {
    usage,
    loading,
    error,
    fetch: fetchUsage,
    isLimitExceeded,
    isExpired,
    isExpiringSoon,
    hasFeature,
    canCreateMore,
  }
}
