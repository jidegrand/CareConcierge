import { useNavigate } from 'react-router-dom'
import { useAdminStats } from '@/hooks/useAdminData'
import { usePlatformContext } from '@/pages/platform/usePlatformContext'

export default function PlatformOverviewPage() {
  const navigate = useNavigate()
  const { organizations, selectedOrganization, selectedOrganizationId, loadingOrganizations } = usePlatformContext()
  const { stats, loading } = useAdminStats(selectedOrganizationId)

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

      <div className="grid grid-cols-5 gap-4 mb-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4">
            <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1.35fr,1fr] gap-4">
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
