import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { TenantLicense } from '@/types'

export interface LicenseState {
  license: TenantLicense | null
  loading: boolean
  isExpired: boolean
  isSuspended: boolean
  isExpiringSoon: boolean
  daysUntilExpiry: number | null
}

const REFRESH_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

// Days after expires_at before patient-facing access is actually cut off by
// RLS. Keep in sync with tenant_license_active() in
// 043_license_expiry_grace_period.sql.
export const EXPIRY_GRACE_PERIOD_DAYS = 3

export function useLicense(): LicenseState {
  const { profile } = useAuth()
  const [license, setLicense] = useState<TenantLicense | null>(null)
  const [loading, setLoading] = useState(true)

  // super_admin manages all tenants globally — no per-tenant license applies to them
  const tenantId = profile?.role === 'super_admin' ? null : profile?.tenant_id ?? null

  useEffect(() => {
    if (!tenantId) {
      setLicense(null)
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchLicense = async () => {
      const { data } = await supabase
        .from('tenant_licenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()
      if (!cancelled) {
        setLicense((data as TenantLicense | null) ?? null)
        setLoading(false)
      }
    }

    void fetchLicense()
    const timer = window.setInterval(fetchLicense, REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [tenantId])

  const expiryDate = license?.expires_at ? new Date(license.expires_at) : null
  const now = new Date()
  const msUntilExpiry = expiryDate ? expiryDate.getTime() - now.getTime() : null
  const daysUntilExpiry = msUntilExpiry !== null
    ? Math.ceil(msUntilExpiry / (1000 * 60 * 60 * 24))
    : null

  const isExpiredByDate = expiryDate !== null && expiryDate < now
  const isExpiredByStatus = license?.status === 'suspended' || license?.status === 'archived'
  const isExpired = isExpiredByDate || isExpiredByStatus

  // True once patient-facing access is actually blocked by RLS: an explicit
  // suspended/archived status, or expires_at is past the grace period.
  const isPastGracePeriod = daysUntilExpiry !== null && daysUntilExpiry < -EXPIRY_GRACE_PERIOD_DAYS
  const isSuspended = isExpiredByStatus || isPastGracePeriod

  const isExpiringSoon = !isExpired && daysUntilExpiry !== null && daysUntilExpiry <= 30

  return { license, loading, isExpired, isSuspended, isExpiringSoon, daysUntilExpiry }
}
