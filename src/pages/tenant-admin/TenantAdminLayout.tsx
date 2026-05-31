import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTenantContext } from '@/hooks/useTenantContext'
import LicenseBanner from '@/components/LicenseBanner'

interface NavItem {
  id: string
  label: string
  icon: string
  path: string
  description?: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/tenant-admin/dashboard', description: 'Overview & onboarding' },
  { id: 'settings', label: 'Settings', icon: '⚙️', path: '/tenant-admin/settings', description: 'Branding & preferences' },
  { id: 'users', label: 'Users & Roles', icon: '👥', path: '/tenant-admin/users', description: 'Staff management' },
  { id: 'sites', label: 'Sites & Units', icon: '🏥', path: '/tenant-admin/sites', description: 'Locations & departments' },
  { id: 'licensing', label: 'Licensing', icon: '📋', path: '/tenant-admin/licensing', description: 'Plan & usage' },
  { id: 'audit-logs', label: 'Audit Logs', icon: '📝', path: '/tenant-admin/audit-logs', description: 'Request history' },
]

export default function TenantAdminLayout() {
  const { profile } = useAuth()
  const { tenant, settings, loading } = useTenantContext()
  const location = useLocation()
  const navigate = useNavigate()

  // Only tenant_admin role can access this
  if (!profile || profile.role !== 'tenant_admin') {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Access Denied</h1>
          <p className="text-[var(--text-secondary)] mb-4">You do not have permission to access the organization admin portal.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-[var(--clinical-blue)] text-white rounded-lg hover:opacity-90 transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const currentNavItem = NAV_ITEMS.find(item => location.pathname.includes(item.path))

  return (
    <div className="flex h-screen bg-[var(--page-bg)]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border)]">
          <div className="mb-2">
            <h1 className="text-lg font-bold text-[var(--text-primary)] truncate">
              {loading ? 'Loading...' : tenant?.name || 'Organization'}
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">Administration Portal</p>
          </div>

          {/* Organization Badge */}
          {settings?.logo_url && (
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <img
                src={settings.logo_url}
                alt="Organization Logo"
                className="h-8 object-contain"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname.includes(item.path)
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                  ${isActive
                    ? 'bg-[var(--clinical-blue)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'
                  }
                `}
                title={item.description}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)] space-y-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-lg transition text-left"
          >
            ← Back to Dashboard
          </button>
          <div className="text-xs text-[var(--text-secondary)] px-3 py-1">
            Role: <span className="font-semibold">Tenant Admin</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-[var(--surface)] border-b border-[var(--border)] px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {currentNavItem?.label || 'Administration'}
              </h2>
              {currentNavItem?.description && (
                <p className="text-sm text-[var(--text-secondary)] mt-1">{currentNavItem.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/support')}
                className="px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-lg transition"
              >
                Need Help?
              </button>
            </div>
          </div>
        </header>

        {/* License banner — tenant_admin retains access to manage renewal */}
        <LicenseBanner />

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
