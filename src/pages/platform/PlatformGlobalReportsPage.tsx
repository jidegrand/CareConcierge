import { useState } from 'react'
import { usePlatformReports } from '@/hooks/usePlatformReports'
import {
  exportDailyTrendCSV,
  exportOrganizationActivityCSV,
  exportPlatformSummaryCSV,
  exportRequestMixCSV,
} from '@/lib/platformReportExporter'
import { usePlatformContext } from '@/pages/platform/usePlatformContext'

function formatRangePreset(preset: '7d' | '30d' | '90d') {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - (preset === '7d' ? 6 : preset === '30d' ? 29 : 89))
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export default function PlatformGlobalReportsPage() {
  const { selectedOrganization, selectedOrganizationId } = usePlatformContext()
  const initial = formatRangePreset('30d')
  const [rangeStart, setRangeStart] = useState(initial.start)
  const [rangeEnd, setRangeEnd] = useState(initial.end)
  const [scope, setScope] = useState<'all' | 'selected'>('all')
  const scopedOrganizationId = scope === 'selected' ? selectedOrganizationId : undefined
  const reports = usePlatformReports(rangeStart, rangeEnd, true, scopedOrganizationId)
  const scopeLabel = scope === 'selected' && selectedOrganization
    ? selectedOrganization.name
    : 'all_organizations'

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">Global Reports</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {scope === 'selected' && selectedOrganization
              ? `Operational reporting for ${selectedOrganization.name}`
              : 'Cross-organization operational reporting for the entire platform'}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DateField label="Start date" value={rangeStart} onChange={setRangeStart} />
          <DateField label="End date" value={rangeEnd} onChange={setRangeEnd} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-2">
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

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => exportPlatformSummaryCSV(reports, { rangeStart, rangeEnd, scopeLabel })}
            disabled={reports.loading}
            className="px-3 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors disabled:opacity-50"
          >
            Export Summary CSV
          </button>
          <button
            onClick={() => exportOrganizationActivityCSV(reports, { rangeStart, rangeEnd, scopeLabel })}
            disabled={reports.loading}
            className="px-3 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors disabled:opacity-50"
          >
            Export Activity CSV
          </button>
          <button
            onClick={() => exportRequestMixCSV(reports, { rangeStart, rangeEnd, scopeLabel })}
            disabled={reports.loading}
            className="px-3 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors disabled:opacity-50"
          >
            Export Request Mix CSV
          </button>
          <button
            onClick={() => exportDailyTrendCSV(reports, { rangeStart, rangeEnd, scopeLabel })}
            disabled={reports.loading}
            className="px-3 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors disabled:opacity-50"
          >
            Export Daily Trend CSV
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {(['7d', '30d', '90d'] as const).map((preset) => (
          <button
            key={preset}
            onClick={() => {
              const next = formatRangePreset(preset)
              setRangeStart(next.start)
              setRangeEnd(next.end)
            }}
            className="px-3 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors"
          >
            Last {preset === '7d' ? '7 days' : preset === '30d' ? '30 days' : '90 days'}
          </button>
        ))}
      </div>

        {reports.error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {reports.error}
        </div>
      )}

      {reports.loading && (
        <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-muted)]">
          Refreshing platform reports…
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <ReportCard label="Requests" value={reports.totalRequests} color="#1D6FA8" />
        <ReportCard label="Urgent" value={reports.urgentRequests} color="#DC2626" />
        <ReportCard label="Resolved" value={reports.resolvedRequests} color="#059669" />
        <ReportCard label="Active Organizations" value={reports.activeOrganizations} color="#5B21B6" />
        <ReportCard label="Avg Resolution (min)" value={reports.avgResolutionMinutes ?? '—'} color="#D97706" />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr,0.9fr]">
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
          <p className="text-sm font-bold text-[var(--text-primary)] mb-4">
            {scope === 'selected' ? 'Selected Organization Activity' : 'Organization Activity'}
          </p>
          <div className="space-y-3">
            {reports.organizations.slice(0, 8).map((organization) => (
              <div key={organization.tenantId} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{organization.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {organization.urgent} urgent · {organization.resolved} resolved
                  </p>
                </div>
                <span className="text-sm font-bold text-[var(--clinical-blue)]">{organization.requests}</span>
              </div>
            ))}
            {reports.organizations.length === 0 && <p className="text-sm text-[var(--text-muted)]">No request activity in this range.</p>}
          </div>
        </div>

        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
          <p className="text-sm font-bold text-[var(--text-primary)] mb-4">Request Mix</p>
          <div className="space-y-3">
            {reports.requestTypes.slice(0, 8).map((type) => (
              <div key={type.type} className="flex items-center justify-between gap-4">
                <p className="text-sm text-[var(--text-secondary)] capitalize">{type.type.replace(/_/g, ' ')}</p>
                <span className="text-sm font-bold text-[var(--clinical-blue)]">{type.count}</span>
              </div>
            ))}
            {reports.requestTypes.length === 0 && <p className="text-sm text-[var(--text-muted)]">No request types in this range.</p>}
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
        <p className="text-sm font-bold text-[var(--text-primary)] mb-4">Daily Trend</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
          {reports.dailyTrend.slice(-14).map((day) => (
            <div key={day.date} className="rounded-xl border border-[var(--border)] bg-[var(--page-bg)] px-3 py-3">
              <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">{day.date.slice(5)}</p>
              <p className="text-lg font-bold text-[var(--clinical-blue)] mt-1">{day.requests}</p>
              <p className="text-xs text-[var(--text-muted)]">requests</p>
            </div>
          ))}
          {reports.dailyTrend.length === 0 && (
            <p className="col-span-full text-sm text-[var(--text-muted)]">No daily activity for the selected period.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ReportCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4">
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-[var(--text-muted)] mt-1">{label}</p>
    </div>
  )
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="w-full">
      <label className="block text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[var(--clinical-blue)] transition-all"
      />
    </div>
  )
}
