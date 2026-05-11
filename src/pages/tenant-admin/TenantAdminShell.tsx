import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { TenantProvider } from '@/hooks/useTenantContext'
import { getSubdomain, isTenantSubdomain } from '@/lib/subdomain'
import { supabase } from '@/lib/supabase'
import TenantAdminLayout from './TenantAdminLayout'

export default function TenantAdminShell() {
  const { profile, loading: authLoading } = useAuth()
  const onTenantSubdomain = isTenantSubdomain()
  const subdomain = getSubdomain()

  // undefined = still resolving, null = not found / not on subdomain
  const [subdomainTenantId, setSubdomainTenantId] = useState<string | null | undefined>(
    onTenantSubdomain ? undefined : null,
  )
  const [subdomainError, setSubdomainError] = useState<string | null>(null)

  useEffect(() => {
    if (!onTenantSubdomain || !subdomain) {
      setSubdomainTenantId(null)
      return
    }
    supabase
      .from('tenants')
      .select('id')
      .eq('slug', subdomain)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setSubdomainError(`No organization found for "${subdomain}". Check that the subdomain matches a registered organization slug.`)
        } else {
          setSubdomainTenantId(data.id)
        }
      })
  }, [onTenantSubdomain, subdomain])

  const resolving = authLoading || (onTenantSubdomain && subdomainTenantId === undefined)
  const tenantId = subdomainTenantId ?? profile?.tenant_id ?? null

  if (resolving) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (subdomainError) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Organization not found</h1>
          <p className="text-sm text-[var(--text-secondary)]">{subdomainError}</p>
        </div>
      </div>
    )
  }

  if (!tenantId) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">No organization assigned</h1>
          <p className="text-sm text-[var(--text-secondary)]">Contact your administrator for assistance.</p>
        </div>
      </div>
    )
  }

  return (
    <TenantProvider tenantId={tenantId}>
      <TenantAdminLayout />
    </TenantProvider>
  )
}
