import { useMemo, useState } from 'react'
import { usePlatformAuditLogs } from '@/hooks/usePlatformAuditLogs'
import { usePlatformContext } from '@/pages/platform/usePlatformContext'

function fmtTimestamp(iso: string) {
  return new Date(iso).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function PlatformAuditLogsPage() {
  const { selectedOrganization, selectedOrganizationId } = usePlatformContext()
  const [scope, setScope] = useState<'all' | 'selected'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | string>('all')
  const scopedOrganizationId = scope === 'selected' ? selectedOrganizationId : undefined
  const { logs, loading, error, stats } = usePlatformAuditLogs({
    enabled: true,
    organizationId: scopedOrganizationId,
    limit: 250,
  })

  const filteredLogs = useMemo(() => (
    logs.filter((entry) => typeFilter === 'all' || entry.target_type === typeFilter)
  ), [logs, typeFilter])

  const targetTypes = Array.from(new Set(logs.map(entry => entry.target_type))).sort()

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">Audit Logs</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {scope === 'selected' && selectedOrganization
              ? `Traceable platform changes for ${selectedOrganization.name}`
              : 'Traceable platform changes across all organizations'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setScope('all')}
            className={`px-3 py-2 rounded-xl border text-sm transition-colors ${
              scope === 'all'
                ? 'border-[var(--clinical-blue)] bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)]'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--page-bg)]'
            }`}
          >
            All organizations
          </button>
          <button
            onClick={() => selectedOrganizationId && setScope('selected')}
            disabled={!selectedOrganizationId}
            className={`px-3 py-2 rounded-xl border text-sm transition-colors disabled:opacity-50 ${
              scope === 'selected'
                ? 'border-[var(--clinical-blue)] bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)]'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--page-bg)]'
            }`}
          >
            {selectedOrganization ? selectedOrganization.name : 'Selected organization'}
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <AuditStat label="Events Loaded" value={stats.total} color="#1D6FA8" />
        <AuditStat label="Last 24 Hours" value={stats.last24Hours} color="#DC2626" />
        <AuditStat label="Last 7 Days" value={stats.last7Days} color="#5B21B6" />
        <AuditStat label="Organizations" value={stats.organizationsImpacted} color="#059669" />
        <AuditStat label="Admins Active" value={stats.activeAdmins} color="#D97706" />
      </div>

      <div className="mb-4 flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">Event Filters</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Filter by audit target to zero in on organization, licensing, or access changes.</p>
        </div>
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[var(--clinical-blue)] transition-all lg:min-w-[240px] lg:w-auto"
        >
          <option value="all">All target types</option>
          {targetTypes.map(type => (
            <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        {loading ? (
          <PanelLoading label="Loading audit logs…" />
        ) : filteredLogs.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-medium text-[var(--text-secondary)]">No audit events yet</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">Organization, licensing, and access changes will appear here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
            <thead>
              <tr className="bg-[var(--page-bg)] border-b border-[var(--border)]">
                {['Time', 'Actor', 'Action', 'Organization', 'Summary'].map((header) => (
                  <th key={header} className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredLogs.map((entry) => (
                <tr key={entry.id} className="align-top hover:bg-[var(--page-bg)]">
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-[var(--text-primary)]">{fmtTimestamp(entry.created_at)}</p>
                    <p className="text-xs text-[var(--text-muted)] font-mono">{entry.id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{entry.actor_name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{entry.actor_role ?? 'Unknown role'}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <ActionPill action={entry.action} />
                    <p className="text-xs text-[var(--text-muted)] mt-2">{entry.target_type}</p>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-[var(--text-secondary)]">
                    {entry.organization_name ?? 'Platform-wide'}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-[var(--text-primary)]">{entry.summary}</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-[var(--clinical-blue)]">View details</summary>
                      <pre className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--page-bg)] p-3 text-[11px] text-[var(--text-secondary)] overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(entry.details ?? {}, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function AuditStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4">
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-[var(--text-muted)] mt-1">{label}</p>
    </div>
  )
}

function ActionPill({ action }: { action: string }) {
  const tone = action.includes('deleted')
    ? { bg: '#FEE2E2', text: '#B91C1C' }
    : action.includes('created')
      ? { bg: '#DCFCE7', text: '#166534' }
      : { bg: '#DBEAFE', text: '#1D4ED8' }

  return (
    <span className="inline-flex text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: tone.bg, color: tone.text }}>
      {action}
    </span>
  )
}

function PanelLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
      <div className="w-5 h-5 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin mr-2" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
