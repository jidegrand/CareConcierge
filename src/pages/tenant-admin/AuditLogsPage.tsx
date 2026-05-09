import { useState, useMemo } from 'react'
import { useTenantContext } from '@/hooks/useTenantContext'
import { useAuditLogs } from '@/hooks/tenant/useAuditLogs'

const ACTIONS = [
  { value: 'created', label: 'Created', color: 'bg-blue-100 text-blue-700' },
  { value: 'acknowledged', label: 'Acknowledged', color: 'bg-purple-100 text-purple-700' },
  { value: 'resolved', label: 'Resolved', color: 'bg-green-100 text-green-700' },
  { value: 'reassigned', label: 'Reassigned', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'status_changed', label: 'Status Changed', color: 'bg-orange-100 text-orange-700' },
  { value: 'updated', label: 'Updated', color: 'bg-gray-100 text-gray-700' },
]

function ActionBadge({ action }: { action: string }) {
  const actionDef = ACTIONS.find(a => a.value === action)
  if (!actionDef) return <span className="text-xs">{action}</span>
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${actionDef.color}`}>
      {actionDef.label}
    </span>
  )
}

export default function AuditLogsPage() {
  const { tenant } = useTenantContext()
  const [actionFilter, setActionFilter] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [exportLoading, setExportLoading] = useState(false)

  const filters = useMemo(
    () => ({
      action: actionFilter || undefined,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    }),
    [actionFilter, startDate, endDate]
  )

  const { logs, loading, error, page, pageSize, totalCount, totalPages, nextPage, prevPage, exportAsCSV } =
    useAuditLogs(tenant?.id || '', filters)

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const result = await exportAsCSV()
      if (!result.success) {
        alert(`Export failed: ${result.error}`)
      }
    } finally {
      setExportLoading(false)
    }
  }

  const clearFilters = () => {
    setActionFilter('')
    setStartDate('')
    setEndDate('')
  }

  const hasActiveFilters = actionFilter || startDate || endDate

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Audit Logs</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            View a complete history of all requests and changes in your organization
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exportLoading || loading}
          className="px-4 py-2 bg-[var(--clinical-blue)] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {exportLoading ? 'Exporting...' : '⬇️ Export as CSV'}
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--text-primary)]">Filters</h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-[var(--clinical-blue)] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
            >
              <option value="">All Actions</option>
              {ACTIONS.map(action => (
                <option key={action.value} value={action.value}>
                  {action.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
            />
          </div>
        </div>
      </div>

      {/* Results Info */}
      <div className="text-sm text-[var(--text-secondary)]">
        Showing {Math.min(pageSize, totalCount)} of {totalCount} entries
        {hasActiveFilters && ' (filtered)'}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm">
          Error loading audit logs: {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          {hasActiveFilters ? 'No logs match your filters.' : 'No audit logs yet.'}
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full">
              <thead className="bg-[var(--surface-subtle)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                    Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                    Actor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--surface-subtle)] transition-colors">
                    <td className="px-6 py-3 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-[var(--text-primary)]">
                      {log.room_name || '-'}
                    </td>
                    <td className="px-6 py-3 text-sm text-[var(--text-primary)]">
                      {log.actor_name || '-'}
                    </td>
                    <td className="px-6 py-3 text-sm text-[var(--text-secondary)] capitalize">
                      {log.actor_role ? log.actor_role.replace(/_/g, ' ') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                onClick={prevPage}
                disabled={page === 1 || loading}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-primary)] font-medium text-sm hover:bg-[var(--surface-subtle)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <span className="text-sm text-[var(--text-secondary)]">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={nextPage}
                disabled={page === totalPages || loading}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-primary)] font-medium text-sm hover:bg-[var(--surface-subtle)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
