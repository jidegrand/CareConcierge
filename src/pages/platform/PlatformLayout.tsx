import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import PlatformShell from '@/components/PlatformShell'
import { useAuth } from '@/hooks/useAuth'
import { useTenants, useTenantLicenses, type OrganizationWithStats } from '@/hooks/useAdminData'

const PLATFORM_NAV = [
  { label: 'Overview', path: '/platform/overview' },
  { label: 'Organizations', path: '/platform/organizations' },
  { label: 'Licensing', path: '/platform/licensing' },
  { label: 'Access Control', path: '/platform/access-control' },
  { label: 'Global Reports', path: '/platform/global-reports' },
  { label: 'Audit Logs', path: '/platform/audit-logs' },
] as const

export interface PlatformOutletContext {
  organizations: OrganizationWithStats[]
  selectedOrganizationId: string | undefined
  selectedOrganization: OrganizationWithStats | undefined
  setSelectedOrganizationId: (tenantId: string | undefined) => void
  loadingOrganizations: boolean
}

export default function PlatformLayout() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isSuperAdmin = profile?.role === 'super_admin'
  const { tenants, loading } = useTenants(isSuperAdmin)
  const { licenses } = useTenantLicenses(isSuperAdmin)
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedOrganizationId = searchParams.get('orgId') ?? undefined
  const selectedOrganization = tenants.find(entry => entry.id === selectedOrganizationId)
  const selectedLicense = licenses.find(l => l.tenant_id === selectedOrganizationId)

  useEffect(() => {
    if (!isSuperAdmin) return
    if (tenants.length === 0) return
    if (!selectedOrganizationId || !tenants.some(entry => entry.id === selectedOrganizationId)) {
      const next = new URLSearchParams(searchParams)
      next.set('orgId', tenants[0].id)
      setSearchParams(next, { replace: true })
    }
  }, [isSuperAdmin, tenants, selectedOrganizationId, searchParams, setSearchParams])

  const setSelectedOrganizationId = (tenantId: string | undefined) => {
    const next = new URLSearchParams(searchParams)
    if (tenantId) next.set('orgId', tenantId)
    else next.delete('orgId')
    setSearchParams(next, { replace: true })
  }

  const navSearch = selectedOrganizationId ? `?orgId=${selectedOrganizationId}` : ''

  if (!isSuperAdmin) {
    return (
      <PlatformShell>
        <div className="flex items-center justify-center h-full px-6">
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <p className="font-semibold text-[var(--text-primary)] mb-1">Access restricted</p>
            <p className="text-sm text-[var(--text-muted)]">The ExtendiHealth Platform console is reserved for global super admins.</p>
          </div>
        </div>
      </PlatformShell>
    )
  }

  return (
    <PlatformShell>
      <div className="flex h-full overflow-hidden">
        <aside className="w-64 flex-shrink-0 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col py-6">
          <div className="px-4 mb-4">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">ExtendiHealth Platform</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
              Global control plane for organization lifecycle, licensing, access policy, and system reporting.
            </p>
          </div>

          <nav className="flex-1 px-2 space-y-0.5">
            {PLATFORM_NAV.map((entry) => (
              <NavLink
                key={entry.path}
                to={`${entry.path}${navSearch}`}
                className={({ isActive }) =>
                  `w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                    isActive
                      ? 'bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--page-bg)] hover:text-[var(--text-primary)]'
                  }`
                }
              >
                {entry.label}
              </NavLink>
            ))}
          </nav>

          <div className="px-4 pt-4 border-t border-[var(--border)]">
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Selected organization</p>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedOrganization?.name ?? 'None selected'}</p>
              {selectedLicense && (
                <LicenseStatusBadge status={selectedLicense.status} />
              )}
            </div>
            {selectedLicense && (
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 capitalize">{selectedLicense.plan} plan</p>
            )}
            <p className="font-mono text-[10px] text-[var(--text-muted)] break-all mt-1">{selectedOrganizationId ?? 'Create an organization to begin'}</p>
            {selectedOrganizationId && (
              <button
                onClick={() => navigate(`/admin?tenantId=${encodeURIComponent(selectedOrganizationId)}`)}
                className="mt-4 w-full px-3 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors"
              >
                Open operational admin workspace
              </button>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto px-8 py-8">
          <div className="mb-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Global Scope</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Manage organization lifecycle, licensing, platform access, and cross-tenant reporting outside the operational workspace.
                </p>
              </div>
              <div className="min-w-[300px]">
                <label className="block text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Organization selector</label>
                <select
                  value={selectedOrganizationId ?? ''}
                  onChange={(event) => setSelectedOrganizationId(event.target.value || undefined)}
                  disabled={loading || tenants.length === 0}
                  className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[var(--clinical-blue)] transition-all"
                >
                  {tenants.length === 0 && <option value="">No organizations available</option>}
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <Outlet context={{
            organizations: tenants,
            selectedOrganizationId,
            selectedOrganization,
            setSelectedOrganizationId,
            loadingOrganizations: loading,
          } satisfies PlatformOutletContext} />
        </main>
      </div>
    </PlatformShell>
  )
}

function LicenseStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string }> = {
    active:    { bg: '#DCFCE7', text: '#166534' },
    trial:     { bg: '#DBEAFE', text: '#1D4ED8' },
    suspended: { bg: '#FEE2E2', text: '#B91C1C' },
    archived:  { bg: '#E5E7EB', text: '#374151' },
  }
  const s = styles[status] ?? { bg: '#E5E7EB', text: '#374151' }
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider" style={{ background: s.bg, color: s.text }}>
      {status}
    </span>
  )
}
