import { useState } from 'react'
import NurseShell from '@/components/NurseShell'
import RequestTypeIcon from '@/components/RequestTypeIcon'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useRequests } from '@/hooks/useRequests'
import { useRequestTypes } from '@/hooks/useRequestTypes'
import { useAuth } from '@/hooks/useAuth'
import { useTenantContext } from '@/hooks/useTenantContext'
import { can } from '@/lib/roles'
import {
  fetchReportData,
  exportBaySummaryCSV,
  exportOpenRequestsCSV,
  exportRequestLogCSV,
  exportRequestTypeSummaryCSV,
  exportStaffPerformanceCSV,
  exportShiftReportDOCX,
  exportUrgentRequestsCSV,
  type ReportData,
} from '@/lib/reportExporter'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

const BLUE    = '#1D6FA8'
const BLUE_LT = '#BFDBFE'
const RED     = '#DC2626'
const GREEN   = '#059669'
const AMBER   = '#D97706'

function fmtSec(s: number | null) {
  if (s === null) return '—'
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60), sec = s % 60
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl shadow-lift px-3 py-2.5 text-xs">
      <p className="font-semibold text-[var(--text-primary)] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  )
}

type PageTab = 'analytics' | 'export'

export default function ReportsPage() {
  const { profile }   = useAuth()
  const { tenantId, tenantName, unitId } = useTenantContext()
  const { requestTypes } = useRequestTypes(tenantId)

  const analytics = useAnalytics(unitId, tenantId, requestTypes)
  const { requests, stats, connected, soundEnabled, setSoundEnabled } = useRequests(unitId, tenantId)
  const unitName = requests[0]?.room?.unit?.name ?? (unitId ? 'Assigned Unit' : `${tenantName ?? 'Tenant'} · All Units`)
  const [tab, setTab] = useState<PageTab>('analytics')

  if (!can(profile?.role, 'page.reports')) {
    return (
      <NurseShell stats={stats} connected={connected} soundEnabled={soundEnabled}
        onSoundToggle={() => setSoundEnabled(!soundEnabled)} unitName={unitName}>
        <div className="flex items-center justify-center h-full px-6">
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <p className="font-semibold text-[var(--text-primary)] mb-1">Reports not available</p>
            <p className="text-sm text-[var(--text-muted)]">
              Reports and exports are available to Nurse Managers and above.
            </p>
          </div>
        </div>
      </NurseShell>
    )
  }

  if (!tenantId) {
    return (
      <NurseShell stats={stats} connected={connected} soundEnabled={soundEnabled}
        onSoundToggle={() => setSoundEnabled(!soundEnabled)} unitName={unitName}>
        <div className="flex items-center justify-center h-full px-6">
          <div className="text-center max-w-md">
            <p className="font-semibold text-[var(--text-primary)] mb-1">Reports need a tenant context</p>
            <p className="text-sm text-[var(--text-muted)]">
              Sign in to a tenant-assigned account before loading analytics or exports.
            </p>
          </div>
        </div>
      </NurseShell>
    )
  }

  return (
    <NurseShell stats={stats} connected={connected} soundEnabled={soundEnabled}
      onSoundToggle={() => setSoundEnabled(!soundEnabled)} unitName={unitName}>
      <div className="flex flex-col h-full overflow-hidden">

        {/* Toolbar */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-white">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Analytics & Reports</h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">{unitName} · Today</p>
          </div>
          {/* Tab toggle */}
          <div className="flex border border-[var(--border)] rounded-xl overflow-hidden">
            {(['analytics', 'export'] as PageTab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-1.5 text-sm font-medium transition-colors capitalize ${
                  tab === t
                    ? 'bg-[var(--clinical-blue)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--page-bg)]'
                }`}>
                {t === 'export' ? '⬇ Export' : '📊 Analytics'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === 'analytics' && (
            <AnalyticsPanel analytics={analytics} />
          )}
          {tab === 'export' && (
            <ExportPanel unitId={unitId} tenantId={tenantId} unitName={unitName} />
          )}
        </div>
      </div>
    </NurseShell>
  )
}

// ── Analytics panel ───────────────────────────────────────────────────────────
function AnalyticsPanel({ analytics }: { analytics: ReturnType<typeof useAnalytics> }) {
  if (analytics.loading) return (
    <div className="flex items-center justify-center py-32 text-[var(--text-muted)]">
      <div className="w-6 h-6 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin mr-3" />
      <span className="text-sm">Loading analytics…</span>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Requests"   value={String(analytics.summary.totalToday)}          sub="across all bays"    accent={BLUE}  icon={<ReqIcon />} />
        <StatCard label="Avg Response Time" value={fmtSec(analytics.summary.avgResponseSec)}     sub="to acknowledge"     accent={AMBER} icon={<ClockIcon />} />
        <StatCard label="Fastest Response"  value={fmtSec(analytics.summary.fastestSec)}         sub="best today"         accent={GREEN} icon={<FastIcon />} />
        <StatCard label="Resolution Rate"   value={`${analytics.summary.resolvedPct}%`}          sub="resolved today"     accent={analytics.summary.resolvedPct >= 80 ? GREEN : AMBER} icon={<DoneIcon />} />
      </div>

      {/* Hourly + Type */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-2xl border border-[var(--border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Request Volume by Hour</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Total vs urgent requests</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: BLUE_LT }} />All</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: RED }} />Urgent</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={analytics.hourlyVolume} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gAll" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={BLUE} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gUrgent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={RED} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={RED} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="requests" name="All" stroke={BLUE} strokeWidth={2} fill="url(#gAll)" dot={false} />
              <Area type="monotone" dataKey="urgent"   name="Urgent" stroke={RED} strokeWidth={2} fill="url(#gUrgent)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Request Type Breakdown</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">Volume by category today</p>
          {analytics.typeBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-[var(--text-muted)]">No data yet</div>
          ) : (
            <div className="space-y-2.5">
              {analytics.typeBreakdown.map(t => (
                <div key={t.type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)]">
                      <RequestTypeIcon
                        icon={t.icon}
                        label={t.label}
                        className="text-base leading-none"
                        imageClassName="h-4 w-4 object-contain"
                      />
                      {t.label}
                    </span>
                    <span className="text-xs font-mono font-semibold text-[var(--text-secondary)]">
                      {t.count} <span className="text-[var(--text-muted)] font-normal">({t.pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[var(--page-bg)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${t.pct}%`, background: t.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Shift + Heatmap */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Volume by Shift</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">Night · Day · Evening</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={analytics.shiftVolume} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" vertical={false} />
              <XAxis dataKey="shift" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="requests" name="Requests" fill={BLUE}  radius={[4,4,0,0]} maxBarSize={36} />
              <Bar dataKey="resolved" name="Resolved" fill={GREEN} radius={[4,4,0,0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 border-t border-[var(--border)] pt-3 space-y-1.5">
            {analytics.shiftVolume.map(s => (
              <div key={s.shift} className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)] font-medium w-16">{s.shift}</span>
                <span className="text-[var(--text-muted)]">{s.requests} req</span>
                <span className="font-mono font-semibold" style={{ color: BLUE }}>
                  {s.avgResponseMin > 0 ? `${s.avgResponseMin}m avg` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2 bg-white rounded-2xl border border-[var(--border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Bay Demand Heatmap</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Request intensity by bay today</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <span>Low</span>
              {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
                <span key={v} className="w-5 h-5 rounded-md inline-block" style={{ background: heatColor(v) }} />
              ))}
              <span>High</span>
            </div>
          </div>
          {analytics.bayDemand.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-[var(--text-muted)]">No bay data yet</div>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
              {analytics.bayDemand.map(b => (
                <div key={b.bay} className="rounded-xl flex flex-col items-center justify-center py-4 px-2"
                  style={{ background: heatColor(b.intensity) }}>
                  <p className="text-xs font-bold text-center truncate w-full"
                    style={{ color: b.intensity > 0.55 ? '#fff' : '#1D6FA8' }}>{b.bay}</p>
                  <p className="text-lg font-bold" style={{ color: b.intensity > 0.55 ? '#fff' : '#1D6FA8' }}>{b.count}</p>
                  <p className="text-[10px]" style={{ color: b.intensity > 0.55 ? 'rgba(255,255,255,0.7)' : '#9CA3AF' }}>reqs</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Export panel ──────────────────────────────────────────────────────────────
function ExportPanel({ unitId, tenantId, unitName }: {
  unitId: string | undefined
  tenantId: string
  unitName: string
}) {
  const [loading, setLoading]       = useState<string | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [fetched, setFetched]       = useState(false)
  const [startDate, setStartDate]   = useState(todayInputValue)
  const [endDate, setEndDate]       = useState(todayInputValue)
  const [loadedRange, setLoadedRange] = useState<{ startDate: string; endDate: string } | null>(null)
  const invalidRange = endDate < startDate
  const rangeDirty = Boolean(
    loadedRange &&
    (loadedRange.startDate !== startDate || loadedRange.endDate !== endDate)
  )

  const load = async () => {
    if (invalidRange) { setError('End date must be the same as or later than start date.'); return }
    setError(null)
    setLoading('fetch')
    try {
      const data = await fetchReportData(unitId, tenantId, { startDate, endDate })
      setReportData(data)
      setFetched(true)
      setLoadedRange({ startDate, endDate })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load report data')
    }
    setLoading(null)
  }

  const run = async (key: string, fn: () => Promise<void>) => {
    setError(null)
    setLoading(key)
    try { await fn() } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Export failed') }
    setLoading(null)
  }

  const exports = [
    {
      key:     'csv-requests',
      icon:    '📋',
      title:   'Request Log',
      format:  'CSV',
      desc:    'Every request today — bay, type, status, response time, resolver. Open in Excel or Google Sheets.',
      color:   '#059669',
      fn:      () => Promise.resolve(exportRequestLogCSV(reportData!)),
    },
    {
      key:     'csv-staff',
      icon:    '👤',
      title:   'Staff Performance',
      format:  'CSV',
      desc:    'Per-nurse resolved count and average handle time. Ready for manager review.',
      color:   '#1D6FA8',
      fn:      () => Promise.resolve(exportStaffPerformanceCSV(reportData!)),
    },
    {
      key:     'docx-shift',
      icon:    '📄',
      title:   'Daily Shift Report',
      format:  'Word',
      desc:    'Formatted Word document — cover page, executive summary, full request log, staff performance, and definitions. Printable and fileable.',
      color:   '#7C3AED',
      fn:      () => exportShiftReportDOCX(reportData!),
    },
  ]

  const customReports = [
    {
      key:     'custom-urgent',
      icon:    '🚨',
      title:   'Urgent Requests Only',
      format:  'CSV',
      desc:    'Focused list of urgent requests for escalation review, handoff, and quality checks.',
      color:   '#DC2626',
      fn:      () => Promise.resolve(exportUrgentRequestsCSV(reportData!)),
    },
    {
      key:     'custom-open',
      icon:    '🕒',
      title:   'Open Requests Follow-up',
      format:  'CSV',
      desc:    'Pending and in-progress requests with minutes open, useful for shift handoff and active follow-up.',
      color:   '#D97706',
      fn:      () => Promise.resolve(exportOpenRequestsCSV(reportData!)),
    },
    {
      key:     'custom-bays',
      icon:    '🛏️',
      title:   'Bay Summary',
      format:  'CSV',
      desc:    'Per-bay totals, urgent load, open counts, resolved counts, and average response time.',
      color:   '#1D6FA8',
      fn:      () => Promise.resolve(exportBaySummaryCSV(reportData!)),
    },
    {
      key:     'custom-types',
      icon:    '🧩',
      title:   'Request Type Summary',
      format:  'CSV',
      desc:    'Breakdown by request category with urgent share, resolution rate, and average response time.',
      color:   '#7C3AED',
      fn:      () => Promise.resolve(exportRequestTypeSummaryCSV(reportData!)),
    },
  ]

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h3 className="text-base font-bold text-[var(--text-primary)]">Download Reports</h3>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          {unitName} · choose the reporting window before loading exports
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--border)] p-5 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Report Range</p>
            <p className="text-sm text-[var(--text-secondary)]">
              All exports below will use this date range once you load the report data.
            </p>
          </div>
          {rangeDirty && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
              Reload to apply changes
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Start date">
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--clinical-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]/10"
            />
          </Field>
          <Field label="End date">
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--clinical-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]/10"
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const today = todayInputValue()
              setStartDate(today)
              setEndDate(today)
            }}
            className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--page-bg)]">
            Today
          </button>
          <button
            type="button"
            onClick={() => {
              const end = new Date()
              const start = new Date()
              start.setDate(end.getDate() - 6)
              setStartDate(start.toISOString().slice(0, 10))
              setEndDate(end.toISOString().slice(0, 10))
            }}
            className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--page-bg)]">
            Last 7 days
          </button>
          <button
            type="button"
            onClick={() => {
              const end = new Date()
              const start = new Date(end.getFullYear(), end.getMonth(), 1)
              setStartDate(start.toISOString().slice(0, 10))
              setEndDate(end.toISOString().slice(0, 10))
            }}
            className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--page-bg)]">
            This month
          </button>
        </div>

        {invalidRange && (
          <p className="mt-3 text-xs text-red-600">End date must be the same as or later than start date.</p>
        )}
      </div>

      {/* Load data step */}
      {!fetched ? (
        <div className="bg-white rounded-2xl border border-[var(--border)] p-6 mb-5 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--clinical-blue-lt)] flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--clinical-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/>
            </svg>
          </div>
          <p className="font-medium text-[var(--text-primary)] mb-1">Load report data first</p>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Fetches all requests and staff activity from Supabase for the selected date range.
          </p>
          <button onClick={load} disabled={loading === 'fetch' || invalidRange}
            className="px-6 py-2.5 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium hover:bg-[var(--clinical-blue-dk)] disabled:opacity-50 transition-colors">
            {loading === 'fetch' ? 'Loading…' : 'Load Report Data'}
          </button>
          {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
        </div>
      ) : (

        <>
          {/* Data summary */}
          <div className="bg-[var(--clinical-blue-lt)] border border-[var(--clinical-blue)]/20 rounded-2xl px-5 py-4 mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--clinical-blue)]">
                Data loaded — {reportData!.requests.length} requests · {reportData!.staff.length} staff members
              </p>
              <p className="text-xs text-[var(--clinical-blue)]/70 mt-0.5">
                {unitName} · {reportData!.date} · Generated at {reportData!.generatedAt}
              </p>
            </div>
            <button onClick={load} disabled={loading === 'fetch' || invalidRange}
              className="text-xs font-medium text-[var(--clinical-blue)] hover:underline">
              {rangeDirty ? 'Reload range' : 'Refresh'}
            </button>
          </div>

          {rangeDirty && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              The selected dates changed after loading. Reload report data to update the exports.
            </div>
          )}

          {/* Export cards */}
          <div className="space-y-3">
            {exports.map(ex => (
              <ExportCard key={ex.key} report={ex} loading={loading} ready={Boolean(reportData) && !rangeDirty} onRun={run} />
            ))}
          </div>

          <div className="mt-6 mb-3">
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Possible Custom Reports</h4>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              These targeted exports use the same loaded shift data, but package it for common manager workflows.
            </p>
          </div>

          <div className="space-y-3">
            {customReports.map(ex => (
              <ExportCard key={ex.key} report={ex} loading={loading} ready={Boolean(reportData) && !rangeDirty} onRun={run} />
            ))}
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mt-3">{error}</p>
          )}
        </>
      )}
    </div>
  )
}

function ExportCard({
  report,
  loading,
  ready,
  onRun,
}: {
  report: {
    key: string
    icon: string
    title: string
    format: string
    desc: string
    color: string
    fn: () => Promise<void>
  }
  loading: string | null
  ready: boolean
  onRun: (key: string, fn: () => Promise<void>) => Promise<void>
}) {
  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] px-5 py-4 flex items-center gap-5">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ background: report.color + '15' }}>
        {report.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-bold text-[var(--text-primary)]">{report.title}</p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
            style={{ background: report.color + '15', color: report.color }}>
            {report.format}
          </span>
        </div>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{report.desc}</p>
      </div>

      <button
        onClick={() => onRun(report.key, report.fn)}
        disabled={loading === report.key || !ready}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 flex-shrink-0"
        style={{ background: loading === report.key ? '#9CA3AF' : report.color }}>
        {loading === report.key ? (
          <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
        ) : (
          <><DownloadIcon /> Download</>
        )}
      </button>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
        {label}
      </label>
      {children}
    </div>
  )
}

function heatColor(intensity: number): string {
  if (intensity < 0.5) {
    const t = intensity * 2
    return `rgb(${Math.round(239+(29-239)*t)},${Math.round(246+(111-246)*t)},${Math.round(255+(168-255)*t)})`
  }
  const t = (intensity - 0.5) * 2
  return `rgb(${Math.round(29+(220-29)*t)},${Math.round(111+(38-111)*t)},${Math.round(168+(38-168)*t)})`
}

function StatCard({ label, value, sub, accent, icon }: {
  label: string; value: string; sub: string; accent: string; icon: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: accent + '18', color: accent }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--text-muted)] font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

const ico = (d: React.ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
)
const ReqIcon  = () => ico(<><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/></>)
const ClockIcon = () => ico(<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>)
const FastIcon  = () => ico(<><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></>)
const DoneIcon  = () => ico(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>)
const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/>
  </svg>
)
