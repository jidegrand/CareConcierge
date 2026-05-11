import { useEffect, useState } from 'react'
import { getSubdomain, isTenantSubdomain } from '@/lib/subdomain'
import { supabase } from '@/lib/supabase'
import type { ReactNode } from 'react'

interface PublicTenantShellProps {
  children: ReactNode
}

/**
 * PublicTenantShell validates subdomains for public routes (login, password reset, etc).
 *
 * - If on a tenant subdomain: validates it exists in the database, blocks access if invalid
 * - If NOT on a tenant subdomain: allows access to public pages normally
 *
 * This ensures all public pages respect subdomain isolation and show "Organization not found"
 * for invalid subdomains like random.extendihealth.com.
 */
export default function PublicTenantShell({ children }: PublicTenantShellProps) {
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

  const resolving = onTenantSubdomain && subdomainTenantId === undefined

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

  return <>{children}</>
}
