import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import NurseShell from '@/components/NurseShell'
import SitesPanel from '@/pages/admin/SitesPanel'
import RequestTypesPanel from '@/pages/admin/RequestTypesPanel'
import UsersPanel from '@/pages/admin/UsersPanel'
import QRPanel    from '@/pages/admin/QRPanel'
import { useAuth } from '@/hooks/useAuth'
import { useTenantContext } from '@/hooks/useTenantContext'
import { useRequests } from '@/hooks/useRequests'
import { useAdminStats } from '@/hooks/useAdminData'
import { canAny } from '@/lib/roles'

type Tab = 'overview' | 'sites' | 'requests' | 'users' | 'qr'
const ALL_TABS: { id: Tab; label: string; perm?: 'admin.users' | 'admin.users.own_unit' }[] = [
  { id: 'overview',  label: 'Overview' },
  { id: 'sites',     label: 'Sites & Rooms' },
  { id: 'requests',  label: 'Common Requests' },
  { id: 'users',     label: 'Users',     perm: 'admin.users.own_unit' },
  { id: 'qr',        label: 'QR Codes' },
]

export default function AdminPage() {
  const { profile } = useAuth()
  const { tenantId, tenantName, unitId } = useTenantContext()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isSuperAdmin = profile?.role === 'super_admin'
  const effectiveTenantId = isSuperAdmin ? (searchParams.get('tenantId') ?? tenantId) : tenantId

  const { requests, stats, connected, soundEnabled, setSoundEnabled } = useRequests(isSuperAdmin ? undefined : unitId, effectiveTenantId)
  const { stats: adminStats, loading: statsLoading } = useAdminStats(effectiveTenantId)
  const unitName = requests[0]?.room?.unit?.name ?? tenantName ?? 'Admin'
  const [tab, setTab] = useState<Tab>('overview')

  const role     = profile?.role ?? 'nurse'
  const canAdmin = canAny(role, 'page.admin')
  const TABS = ALL_TABS.filter(t => !t.perm || canAny(role, t.perm))

  if (!canAdmin) {
    return (
      <NurseShell stats={stats} connected={connected}
        soundEnabled={soundEnabled} onSoundToggle={() => setSoundEnabled(!soundEnabled)} unitName={unitName}>
        <div className="flex items-center justify-center h-full px-6">
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <p className="font-semibold text-[var(--text-primary)] mb-1">Access restricted</p>
            <p className="text-sm text-[var(--text-muted)]">Admin portal requires a tenant admin, site manager, charge nurse, or manager-level role.</p>
          </div>
        </div>
      </NurseShell>
    )
  }

  if (!effectiveTenantId && !isSuperAdmin) {
    return (
      <NurseShell stats={stats} connected={connected}
        soundEnabled={soundEnabled} onSoundToggle={() => setSoundEnabled(!soundEnabled)} unitName={unitName}>
        <div className="flex items-center justify-center h-full px-6">
          <div className="text-center max-w-md">
            <p className="font-semibold text-[var(--text-primary)] mb-1">No tenant assignment found</p>
            <p className="text-sm text-[var(--text-muted)]">
              This account needs a tenant profile before the Admin portal can load.
            </p>
          </div>
        </div>
      </NurseShell>
    )
  }

  if (isSuperAdmin && !effectiveTenantId) {
    return (
      <NurseShell stats={stats} connected={connected}
        soundEnabled={soundEnabled} onSoundToggle={() => setSoundEnabled(!soundEnabled)} unitName="Tenant Admin">
        <div className="flex items-center justify-center h-full px-6">
          <div className="text-center max-w-lg">
            <div className="w-14 h-14 rounded-full bg-[var(--clinical-blue-lt)] flex items-center justify-center mx-auto mb-4 text-[var(--clinical-blue)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l7 4v6c0 5-3 8-7 10-4-2-7-5-7-10V6l7-4z"/>
                <path d="M9 12h6"/>
                <path d="M12 9v6"/>
              </svg>
            </div>
            <p className="font-semibold text-[var(--text-primary)] mb-1">Select a tenant workspace first</p>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Global controls now live in the ExtendiHealth Platform console. Choose a tenant there, then open its operational admin workspace.
            </p>
            <button
              onClick={() => navigate('/platform')}
              className="px-4 py-2 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium hover:bg-[var(--clinical-blue-dk)] transition-colors"
            >
              Open Platform Console
            </button>
          </div>
        </div>
      </NurseShell>
    )
  }

  return (
    <NurseShell stats={stats} connected={connected}
      soundEnabled={soundEnabled} onSoundToggle={() => setSoundEnabled(!soundEnabled)} unitName={unitName}>
      <div className="flex h-full overflow-hidden">

        {/* Admin sub-nav — sidebar on desktop */}
        <aside className="hidden sm:flex w-52 flex-shrink-0 bg-white border-r border-[var(--border)] flex-col py-5">
          <div className="px-4 mb-4">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Admin Portal</p>
          </div>
          <nav className="flex-1 px-2 space-y-0.5">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  tab === t.id
                    ? 'bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--page-bg)] hover:text-[var(--text-primary)]'
                }`}>
                {t.label}
              </button>
            ))}
          </nav>
          <div className="px-4 pt-4 border-t border-[var(--border)]">
            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Tenant</p>
            <p className="font-mono text-[10px] text-[var(--text-muted)] break-all">{effectiveTenantId?.slice(0, 20) ?? 'Select a tenant'}{effectiveTenantId ? '…' : ''}</p>
          </div>
        </aside>

        {/* Panel */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile tab strip */}
          <div className="sm:hidden bg-white border-b border-[var(--border)] flex overflow-x-auto sticky top-0 z-10">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-[var(--clinical-blue)] text-[var(--clinical-blue)]'
                    : 'border-transparent text-[var(--text-muted)]'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="px-4 sm:px-6 py-6">
            {tab === 'overview' && effectiveTenantId && (
              <OverviewPanel
                stats={adminStats}
                loading={statsLoading}
                tenantId={effectiveTenantId}
                isSuperAdmin={isSuperAdmin}
              />
            )}
            {tab === 'sites'    && effectiveTenantId && <SitesPanel tenantId={effectiveTenantId} />}
            {tab === 'requests' && effectiveTenantId && <RequestTypesPanel tenantId={effectiveTenantId} />}
            {tab === 'users'    && effectiveTenantId && <UsersPanel tenantId={effectiveTenantId} />}
            {tab === 'qr'       && effectiveTenantId && <QRPanel tenantId={effectiveTenantId} />}
          </div>
        </main>
      </div>
    </NurseShell>
  )
}

function OverviewPanel({ stats, loading, tenantId, isSuperAdmin }: {
  stats: { siteCount: number; unitCount: number; roomCount: number; userCount: number; requestsToday: number } | null
  loading: boolean
  tenantId: string
  isSuperAdmin: boolean
}) {
  const cards = [
    { label: 'Sites',           value: stats?.siteCount,     color: '#1D6FA8' },
    { label: 'Units',           value: stats?.unitCount,     color: '#7C3AED' },
    { label: 'Rooms',           value: stats?.roomCount,     color: '#0891B2' },
    { label: 'Users',           value: stats?.userCount,     color: '#059669' },
    { label: 'Requests Today',  value: stats?.requestsToday, color: '#D97706' },
  ]
  return (
    <div>
      <div className="mb-5">
        <h3 className="text-base font-bold text-[var(--text-primary)]">Overview</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          {isSuperAdmin ? 'Tenant workspace snapshot opened from the Platform console' : 'Tenant snapshot'}
        </p>
      </div>
      <div className="grid grid-cols-5 gap-4 mb-6">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-[var(--border)] p-4">
            <p className="text-2xl font-bold text-[var(--text-primary)]" style={{ color: c.color }}>
              {loading ? '—' : String(c.value ?? 0)}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-[var(--border)] p-5 mb-4">
        <p className="text-sm font-bold text-[var(--text-primary)] mb-4">Getting started</p>
        <div className="space-y-3 text-sm text-[var(--text-secondary)]">
          {[
            ['Sites & Rooms', 'Add your campus, wards, and patient bays'],
            ['Users', 'Invite nurses and assign them to units'],
            ['QR Codes', 'Generate and print the sheet, laminate, and mount at each bay'],
            ['/dashboard', 'Nurses log in — patients scan the QR code to submit requests'],
          ].map(([tab, desc], i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[var(--clinical-blue)] font-bold flex-shrink-0">{i + 1}.</span>
              <p>Go to <strong>{tab}</strong> — {desc}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[var(--page-bg)] rounded-2xl border border-[var(--border)] p-4">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Tenant ID</p>
        <p className="font-mono text-sm text-[var(--text-secondary)] break-all">{tenantId}</p>
      </div>
    </div>
  )
}
