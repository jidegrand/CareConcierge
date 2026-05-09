import { useAuth } from '@/hooks/useAuth'
import { TenantProvider } from '@/hooks/useTenantContext'
import TenantAdminLayout from './TenantAdminLayout'

/**
 * Wraps TenantAdminLayout with TenantProvider
 * Extracts tenantId from authenticated user profile
 */
export default function TenantAdminShell() {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile?.tenant_id) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Error</h1>
          <p className="text-[var(--text-secondary)] mb-4">No organization assigned to your account.</p>
          <p className="text-sm text-[var(--text-secondary)]">Contact your administrator for assistance.</p>
        </div>
      </div>
    )
  }

  return (
    <TenantProvider tenantId={profile.tenant_id}>
      <TenantAdminLayout />
    </TenantProvider>
  )
}
