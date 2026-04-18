import { useNavigate } from 'react-router-dom'
import { useAdminStats, useTenantLicenses } from '@/hooks/useAdminData'
import { usePlatformContext } from '@/pages/platform/usePlatformContext'

function expiryState(expiresAt: string | null) {
  if (!expiresAt) return 'none'
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms < 0) return 'expired'
  if (ms < 30 * 24 * 60 * 60 * 1000) return 'warning'
  return 'ok'
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PlatformOverviewPage() {
  const navigate = useNavigate()
  const { organizations, selectedOrganization, selectedOrganizationId, loadingOrganizations } = usePlatformContext()
  const { stats, loading } = useAdminStats(selectedOrganizationId)
  const { licenses } = useTenantLicenses(true)

  const attentionItems = licenses.flatMap((license) => {
    const items: { kind: 'error' | 'warning'; label: string; detail: string }[] = []
    if (license.status === 'suspended') {
      items.push({ kind: 'error', label: license.organizationName, detail: 'License suspended' })
    }
    const state = expiryState(license.expires_at)
    if (state === 'expired') {
      items.push({ kind: 'error', label: license.organizationName, detail: `Expired ${fmtDate(license.expires_at)}` })
    } else if (state === 'warning') {
      items.push({ kind: 'warning', label: license.organizationName, detail: `Expires ${fmtDate(license.expires_at)}` })
    }
    return items
  })

  const totals = organizations.reduce((acc, org) => ({
    siteCount: acc.siteCount + org.siteCount,
    unitCount: acc.unitCount + org.unitCount,
    roomCount: acc.roomCount + org.roomCount,
    userCount: acc.userCount + org.userCount,
    requestTypeCount: acc.requestTypeCount + org.requestTypeCount,
  }), {
    siteCount: 0,
    unitCount: 0,
    roomCount: 0,
    userCount: 0,
    requestTypeCount: 0,
  })

  const cards = [
    { label: 'Organizations', value: organizations.length, color: '#5B21B6' },
    { label: 'Sites', value: totals.siteCount, color: '#1D6FA8' },
    { label: 'Units', value: totals.unitCount, color: '#D97706' },
    { label: 'Users', value: totals.userCount, color: '#059669' },
    { label: 'Request Types', value: totals.requestTypeCount, color: '#DC2626' },
  ]

  return (
    <div>
      <div className="mb-5">
        <h3 className="text-base font-bold text-[var(--text-primary)]">Platform Overview</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">System-wide view of every organization on the platform</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4">
            <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {attentionItems.length > 0 && (
        <div className="mb-4 bg-[var(--surface)] rounded-2xl border border-amber-200 p-5">
          <p className="text-sm font-bold text-[var(--text-primary)] mb-3">Needs Attention</p>
          <div className="space-y-2">
            {attentionItems.map((item, index) => (
              <div key={index} className={`flex flex-col items-start gap-2 rounded-xl px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-3 ${item.kind === 'error' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.kind === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <span className={`font-semibold flex-shrink-0 ${item.kind === 'error' ? 'text-red-800' : 'text-amber-800'}`}>{item.label}</span>
                <span className={item.kind === 'error' ? 'text-red-600' : 'text-amber-600'}>{item.detail}</span>
                <button
                  onClick={() => navigate('/platform/licensing')}
                  className={`text-xs font-medium sm:ml-auto ${item.kind === 'error' ? 'text-red-700 hover:underline' : 'text-amber-700 hover:underline'}`}
                >
                  View license →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr,1fr]">
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
          <p className="text-sm font-bold text-[var(--text-primary)] mb-4">Platform Modules</p>
          <div className="space-y-3 text-sm text-[var(--text-secondary)]">
            {[
              ['Organizations', 'Create and maintain hospitals and care-facility tenants'],
              ['Licensing', 'Control activation, plans, capacity, and contracted entitlements'],
              ['Access Control', 'Manage platform admins and organization access roles'],
              ['Global Reports', 'Monitor operational activity and usage across the system'],
              ['Audit Logs', 'Trace every organization, license, and access change from one place'],
            ].map(([label, description], index) => (
              <div key={label} className="flex items-start gap-2">
                <span className="text-[var(--clinical-blue)] font-bold flex-shrink-0">{index + 1}.</span>
                <p><strong>{label}</strong> — {description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
          <p className="text-sm font-bold text-[var(--text-primary)] mb-2">Selected Organization</p>
          <p className="text-sm text-[var(--text-secondary)]">
            {selectedOrganization
              ? `Current focus: ${selectedOrganization.name}`
              : 'Select an organization from the global selector.'}
          </p>
          <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
            <p>Sites: <strong>{loading || loadingOrganizations ? '—' : stats?.siteCount ?? 0}</strong></p>
            <p>Units: <strong>{loading || loadingOrganizations ? '—' : stats?.unitCount ?? 0}</strong></p>
            <p>Rooms: <strong>{loading || loadingOrganizations ? '—' : stats?.roomCount ?? 0}</strong></p>
            <p>Users: <strong>{loading || loadingOrganizations ? '—' : stats?.userCount ?? 0}</strong></p>
            <p>Requests today: <strong>{loading || loadingOrganizations ? '—' : stats?.requestsToday ?? 0}</strong></p>
          </div>
          <button
            onClick={() => selectedOrganizationId && navigate(`/admin?tenantId=${encodeURIComponent(selectedOrganizationId)}`)}
            disabled={!selectedOrganizationId}
            className="mt-4 w-full px-4 py-2 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium disabled:opacity-50 hover:bg-[var(--clinical-blue-dk)] transition-colors"
          >
            Open operational admin workspace
          </button>
        </div>
      </div>
    </div>
  )
}
