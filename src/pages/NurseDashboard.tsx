import { useState, useEffect } from 'react'
import NurseShell from '@/components/NurseShell'
import { useRequests } from '@/hooks/useRequests'
import { useRequestTypes } from '@/hooks/useRequestTypes'
import { useTenantContext } from '@/hooks/useTenantContext'
import { timeAgo } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import RequestTypeIcon from '@/components/RequestTypeIcon'
import type { Request, RequestTypeConfig } from '@/types'
type Tab = 'all' | 'pending' | 'in-progress' | 'resolved'

const STATUS_COLORS = {
  pending: {
    accent: '#EF4444',
    bg: '#FFF1F2',
    border: '#FECDD3',
    soft: '#FFE4E6',
    text: '#B91C1C',
  },
  inProgress: {
    accent: '#3B82F6',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    soft: '#DBEAFE',
    text: '#1D4ED8',
  },
  resolved: {
    accent: '#22C55E',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    soft: '#DCFCE7',
    text: '#16A34A',
  },
}

// ── Shift manager fetcher ─────────────────────────────────────────────────────
interface ShiftManager {
  name: string
  role: string
  initials: string
  unitName: string
}

function useShiftManager(unitId: string | undefined, tenantId: string | undefined) {
  const [manager, setManager] = useState<ShiftManager | null>(null)

  useEffect(() => {
    if (!tenantId && !unitId) {
      setManager(null)
      return
    }

    let query = supabase
      .from('user_profiles')
      .select('id, full_name, role, unit:units(name)')
      .in('role', ['charge_nurse', 'site_manager', 'tenant_admin'])
      .limit(1)

    if (unitId) {
      query = query.eq('unit_id', unitId)
    } else if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    query.single()
      .then(({ data }) => {
        if (!data) return
        const unit = Array.isArray(data.unit) ? data.unit[0] : data.unit
        const name  = data.full_name ?? `User ${data.id.slice(0, 6)}`
        const parts = name.split(' ')
        setManager({
          name,
          role:     data.role.replace('_', ' '),
          initials: parts.map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
          unitName: unit?.name ?? '',
        })
      })
  }, [tenantId, unitId])

  return manager
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NurseDashboard() {
  const { tenantId, tenantName, unitId } = useTenantContext()
  const { requestTypes, requestTypeMap } = useRequestTypes(tenantId)
  const {
    requests, loading, connected, stats,
    staffEvents,
    soundEnabled, setSoundEnabled,
    updateStatus, clearResolved,
  } = useRequests(unitId, tenantId)

  const shiftManager = useShiftManager(unitId, tenantId)
  const [tab, setTab] = useState<Tab>('all')

  const pending      = requests.filter(r => r.status === 'pending')
  const acknowledged = requests.filter(r => r.status === 'acknowledged')
  const resolved     = requests.filter(r => r.status === 'resolved')
  const unitName     = requests[0]?.room?.unit?.name ?? (unitId ? 'Assigned Unit' : `${tenantName ?? 'Tenant'} · All Units`)

  if (!tenantId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--page-bg)' }}>
        <p className="text-sm text-[var(--text-secondary)]">
          Sign in to a tenant-assigned account to access the request queue.
        </p>
      </div>
    )
  }

  return (
    <NurseShell stats={stats} connected={connected} soundEnabled={soundEnabled}
      onSoundToggle={() => setSoundEnabled(!soundEnabled)} unitName={unitName}>
      <style>{`
        @keyframes criticalDotBlink {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.35);
          }
          50% {
            opacity: 0.35;
            transform: scale(0.72);
            box-shadow: 0 0 0 5px rgba(220, 38, 38, 0);
          }
        }
        .critical-dot-blink {
          animation: criticalDotBlink 1s ease-in-out infinite;
        }
      `}</style>

      <div className="flex h-full">

        {/* ── Centre queue ─────────────────────────────────────────── */}
        <div className="flex-1 px-6 py-5 overflow-y-auto min-w-0">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Request Queue</h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5 mb-4">
            Monitoring active patient needs for {unitName}
          </p>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-5">
            {(['all','pending','in-progress','resolved'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  tab === t
                    ? 'bg-[var(--clinical-blue)] text-white border-[var(--clinical-blue)] shadow-sm'
                    : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]'
                }`}>
                {t === 'in-progress' ? 'In Progress' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {loading && (
            <div className="text-center py-16 text-[var(--text-muted)]">
              <div className="w-6 h-6 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading…</p>
            </div>
          )}

          {!loading && (
            <div className="space-y-5">
              {/* Pending — 4-col grid */}
              {(tab === 'all' || tab === 'pending') && pending.length > 0 && (
                <div>
                  <SectionLabel color={STATUS_COLORS.pending.accent} label="Pending" count={pending.length} />
                  <div className="grid grid-cols-4 gap-3">
                    {pending.map(r => (
                      <PendingCard key={r.id} request={r}
                        typeMap={requestTypeMap}
                        onAcknowledge={() => updateStatus(r.id, 'acknowledged')} />
                    ))}
                  </div>
                </div>
              )}

              {/* In Progress — 4-col grid */}
              {(tab === 'all' || tab === 'in-progress') && acknowledged.length > 0 && (
                <div>
                  <SectionLabel color={STATUS_COLORS.inProgress.accent} label="In Progress" count={acknowledged.length} />
                  <div className="grid grid-cols-4 gap-3">
                    {acknowledged.map(r => (
                      <InProgressCard key={r.id} request={r}
                        typeMap={requestTypeMap}
                        onResolve={() => updateStatus(r.id, 'resolved')} />
                    ))}
                  </div>
                </div>
              )}

              {/* Resolved — rows */}
              {(tab === 'all' || tab === 'resolved') && resolved.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <SectionLabel color={STATUS_COLORS.resolved.accent} label="Recently Resolved" count={resolved.length} />
                    <button onClick={clearResolved}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--clinical-blue)] transition-colors">
                      Clear all
                    </button>
                  </div>
                  <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden divide-y divide-[#F0F4F8]">
                    {resolved.map(r => <ResolvedRow key={r.id} request={r} typeMap={requestTypeMap} />)}
                  </div>
                </div>
              )}

              {requests.length === 0 && (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-full bg-[var(--clinical-blue-lt)] flex items-center justify-center mx-auto mb-4">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--clinical-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                  </div>
                  <p className="font-medium text-[var(--text-secondary)]">No requests today</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    Patients scan their bay QR code to submit requests
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right panel ───────────────────────────────────────────── */}
        <aside className="w-72 flex-shrink-0 border-l border-[var(--border)] overflow-y-auto px-4 py-5 space-y-4 bg-[var(--page-bg)]">

          {/* Status Overview */}
          <div className="rounded-2xl p-4" style={{ background: '#2C3E50' }}>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Status Overview
            </p>
            <div className="flex items-start justify-between mb-5">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{stats.pendingCount}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{stats.inProgressCount}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Active</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{stats.resolvedTodayCount}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Resolved</p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-gray-400">Response Target</p>
                <p className="text-xs font-semibold text-green-400">On Track</p>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-[var(--clinical-blue)] transition-all"
                  style={{ width: `${Math.min(100, Math.round(
                    (stats.resolvedTodayCount / Math.max(1,
                      stats.resolvedTodayCount + stats.pendingCount + stats.inProgressCount
                    )) * 100
                  ))}%` }} />
              </div>
            </div>
          </div>

          {/* Staff Activity — real data */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-4">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">
              Staff Activity
            </p>

            {staffEvents.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] italic py-2">
                No staff activity recorded yet today.
                Activity appears here as nurses acknowledge and resolve requests.
              </p>
            ) : (
              <div className="space-y-3">
                {staffEvents.map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-[var(--clinical-blue-lt)] flex items-center justify-center text-[var(--clinical-blue)] text-xs font-bold">
                        {s.initials}
                      </div>
                      {s.online && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{s.name}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{s.action}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {timeAgo(s.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shift Manager — real data */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-4">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">
              Shift Manager
            </p>

            {shiftManager ? (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-bold text-[var(--text-primary)]">{shiftManager.name}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 capitalize">{shiftManager.role}</p>
                  <button className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-[var(--clinical-blue)] hover:underline">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.55 1.28h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.32a16 16 0 0 0 7.77 7.77l1.32-1.32a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    Direct Call
                  </button>
                </div>
                <div className="w-10 h-10 rounded-full bg-[var(--clinical-blue)] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {shiftManager.initials}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)] italic">
                No manager-level staff member is assigned to this scope. Set a user's role to
                <span className="font-mono text-[var(--clinical-blue)]"> charge_nurse</span> in the Admin portal.
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[var(--border)] p-4">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">
              Active Common Requests
            </p>

            <div className="space-y-2">
              {requestTypes
                .filter(item => item.active)
                .map(item => (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2">
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border"
                      style={{ background: `${item.color}14`, borderColor: `${item.color}33` }}>
                      <RequestTypeIcon
                        icon={item.icon}
                        label={item.label}
                        className="text-lg"
                        imageClassName="h-5 w-5 object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.label}</p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {item.id === 'nurse'
                          ? 'Emergency call tile'
                          : item.urgent
                            ? 'Marked urgent'
                            : 'Standard priority'}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </aside>
      </div>
    </NurseShell>
  )
}

/* ── Section label ──────────────────────────────────────────────────────────── */
function SectionLabel({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
      <span className="text-xs font-mono text-[var(--text-muted)]">({count})</span>
    </div>
  )
}

/* ── Pending card ───────────────────────────────────────────────────────────── */
function PendingCard({
  request,
  typeMap,
  onAcknowledge,
}: {
  request: Request
  typeMap: Record<string, RequestTypeConfig>
  onAcknowledge: () => void
}) {
  const config     = typeMap[request.type]
  const ageSeconds = (Date.now() - new Date(request.created_at).getTime()) / 1000
  const isCritical = request.is_urgent || ageSeconds > 300
  const bayLabel   = request.room?.name?.toUpperCase() ?? 'BAY —'

  return (
    <div className="rounded-2xl border flex flex-col"
      style={{
        background: STATUS_COLORS.pending.bg,
        borderColor: STATUS_COLORS.pending.border,
        borderLeft: `4px solid ${STATUS_COLORS.pending.accent}`,
      }}>
      <div className="px-4 py-4 flex-1">
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
            {bayLabel}
          </span>
          {isCritical && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: STATUS_COLORS.pending.soft, color: STATUS_COLORS.pending.accent }}>
              {request.is_urgent && (
                <span className="critical-dot-blink h-2 w-2 rounded-full" style={{ background: STATUS_COLORS.pending.accent }} />
              )}
              Critical
            </span>
          )}
        </div>
        <p className="text-sm font-bold mb-1.5" style={{ color: '#111827' }}>
          {config?.label ?? request.type}
        </p>
        <p className="flex items-center gap-1 text-xs" style={{ color: '#9CA3AF' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {timeAgo(request.created_at)}
        </p>
      </div>
      <div className="px-4 pb-3">
        <button onClick={onAcknowledge}
          className="w-full py-2 rounded-xl text-white text-xs font-bold transition-colors"
          style={{ background: STATUS_COLORS.pending.accent }}>
          Acknowledge
        </button>
      </div>
    </div>
  )
}

/* ── In Progress card ───────────────────────────────────────────────────────── */
function InProgressCard({
  request,
  typeMap,
  onResolve,
}: {
  request: Request
  typeMap: Record<string, RequestTypeConfig>
  onResolve: () => void
}) {
  const config   = typeMap[request.type]
  const elapsed  = Math.floor((Date.now() - new Date(request.created_at).getTime()) / 60000)
  const bayLabel = request.room?.name?.toUpperCase() ?? 'BAY —'

  return (
    <div className="rounded-2xl border flex flex-col"
      style={{
        background: STATUS_COLORS.inProgress.bg,
        borderColor: STATUS_COLORS.inProgress.border,
        borderLeft: `4px solid ${STATUS_COLORS.inProgress.accent}`,
      }}>
      <div className="px-4 py-4 flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
            {bayLabel}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
            style={{ background: '#FACC15', color: '#111827' }}>
            In Progress
          </span>
        </div>
        <p className="text-sm font-bold mb-1.5" style={{ color: '#111827' }}>
          {config?.label ?? request.type}
        </p>
        <p className="text-xs" style={{ color: STATUS_COLORS.inProgress.text }}>{elapsed}m elapsed</p>
      </div>
      <div className="px-4 pb-3 flex justify-end">
        <button onClick={onResolve} className="text-xs font-bold" style={{ color: STATUS_COLORS.inProgress.text }}>
          Resolve
        </button>
      </div>
    </div>
  )
}

/* ── Resolved row ───────────────────────────────────────────────────────────── */
function ResolvedRow({
  request,
  typeMap,
}: {
  request: Request
  typeMap: Record<string, RequestTypeConfig>
}) {
  const config   = typeMap[request.type]
  const bayLabel = request.room?.name?.toUpperCase() ?? 'BAY —'
  const resolverName = (request as Request & {
    resolver?: { full_name: string | null }
  }).resolver?.full_name

  return (
    <div
      className="flex items-center px-4 py-3 gap-3 transition-colors"
      style={{
        background: STATUS_COLORS.resolved.bg,
        borderLeft: `4px solid ${STATUS_COLORS.resolved.accent}`,
      }}>
      <span className="text-xs font-bold w-14 flex-shrink-0" style={{ color: STATUS_COLORS.resolved.text }}>
        {bayLabel}
      </span>
      <span className="flex-1 text-sm font-medium" style={{ color: '#111827' }}>
        {config?.label ?? request.type}
      </span>
      {resolverName && (
        <span className="text-xs text-[var(--text-muted)] hidden sm:block truncate max-w-[100px]"
          title={`Resolved by ${resolverName}`}>
          {resolverName}
        </span>
      )}
      <span className="text-xs font-mono whitespace-nowrap" style={{ color: '#9CA3AF' }}>
        {timeAgo(request.resolved_at ?? request.created_at)}
      </span>
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: STATUS_COLORS.resolved.soft }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={STATUS_COLORS.resolved.accent} strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    </div>
  )
}
