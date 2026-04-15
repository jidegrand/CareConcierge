import { useState, useEffect, useRef, useMemo } from 'react'
import NurseShell from '@/components/NurseShell'
import { useRequests } from '@/hooks/useRequests'
import { useRequestTypes } from '@/hooks/useRequestTypes'
import { useTenantContext } from '@/hooks/useTenantContext'
import { usePrefs } from '@/hooks/usePrefs'
import { useOverdueAlerts } from '@/hooks/useOverdueAlerts'
import { timeAgo } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import RequestTypeIcon from '@/components/RequestTypeIcon'
import HandoverReportModal from '@/pages/HandoverReportModal'
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

// ── Assignable staff fetcher ──────────────────────────────────────────────────
interface AssignableStaffMember {
  id:       string
  fullName: string
  initials: string
  role:     string
}

const ASSIGNABLE_ROLES = ['nurse', 'charge_nurse', 'volunteer', 'site_manager']

function useAssignableStaff(unitId: string | undefined, tenantId: string | undefined) {
  const [staff, setStaff] = useState<AssignableStaffMember[]>([])

  useEffect(() => {
    if (!tenantId && !unitId) { setStaff([]); return }

    let query = supabase
      .from('user_profiles')
      .select('id, full_name, role')
      .in('role', ASSIGNABLE_ROLES)

    if (unitId) {
      query = query.or(`unit_id.eq.${unitId},unit_id.is.null`)
    } else if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    query.order('role').then(({ data }) => {
      if (!data) return
      setStaff(
        (data as { id: string; full_name: string | null; role: string }[]).map(p => {
          const name = p.full_name ?? `User ${p.id.slice(0, 6)}`
          return {
            id:       p.id,
            fullName: name,
            initials: name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
            role:     p.role,
          }
        })
      )
    })
  }, [tenantId, unitId])

  return staff
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NurseDashboard() {
  const { tenantId, tenantName, unitId } = useTenantContext()
  const { requestTypes, requestTypeMap } = useRequestTypes(tenantId)
  const {
    requests, loading, connected, stats,
    staffEvents,
    soundEnabled, setSoundEnabled,
    updateStatus, reassign, clearResolved,
  } = useRequests(unitId, tenantId)

  const shiftManager    = useShiftManager(unitId, tenantId)
  const assignableStaff = useAssignableStaff(unitId, tenantId)
  const prefs = usePrefs()
  const [showHandover, setShowHandover] = useState(false)
  const overdueIds = useOverdueAlerts(
    requests,
    prefs.overdueThreshold,
    soundEnabled,
    prefs.urgentSoundOnly,
  )
  const [tab, setTab] = useState<Tab>('all')

  const pending      = requests.filter(r => r.status === 'pending')
  const acknowledged = requests.filter(r => r.status === 'acknowledged')
  const resolved     = requests.filter(r => r.status === 'resolved')

  // Count duplicates per room+type so PendingCard can show a ×N badge
  const pendingDupeCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of pending) {
      const key = `${r.room_id}:${r.type}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [pending])
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
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(220,38,38,0.35); }
          50%       { opacity: 0.35; transform: scale(0.72); box-shadow: 0 0 0 5px rgba(220,38,38,0); }
        }
        .critical-dot-blink { animation: criticalDotBlink 1s ease-in-out infinite; }

        @keyframes overduePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(234,88,12,0.4); }
          50%       { box-shadow: 0 0 0 6px rgba(234,88,12,0); }
        }
        .overdue-pulse { animation: overduePulse 1.6s ease-in-out infinite; }
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
                        isOverdue={overdueIds.has(r.id)}
                        responseTargetSec={prefs.responseTarget * 60}
                        duplicateCount={pendingDupeCounts.get(`${r.room_id}:${r.type}`) ?? 1}
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
                        overdueThresholdSec={prefs.overdueThreshold * 60 * 2}
                        assignableStaff={assignableStaff}
                        onResolve={() => updateStatus(r.id, 'resolved')}
                        onReassign={(newUserId, newUserName) => reassign(r.id, newUserId, newUserName)} />
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

          {/* Handover report trigger */}
          <button
            onClick={() => setShowHandover(true)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-[var(--border)] bg-white hover:border-[var(--clinical-blue)] hover:bg-[var(--clinical-blue-lt)] transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: '#EFF6FF' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--clinical-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--clinical-blue)]">
                  Handover Report
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">Generate end-of-shift summary</p>
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

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

      {showHandover && (
        <HandoverReportModal
          unitName={unitName}
          requests={requests}
          staffEvents={staffEvents}
          requestTypeMap={requestTypeMap}
          onClose={() => setShowHandover(false)}
        />
      )}
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
// Visual escalation levels:
//   normal      → plain red left border
//   approaching → amber tint + "Waiting" badge  (age ≥ responseTarget)
//   overdue     → pulsing orange border + "Overdue" badge  (age ≥ overdueThreshold)
//   urgent      → always "Critical" dot regardless of age
function PendingCard({
  request,
  typeMap,
  isOverdue,
  responseTargetSec,
  duplicateCount,
  onAcknowledge,
}: {
  request: Request
  typeMap: Record<string, RequestTypeConfig>
  isOverdue: boolean
  responseTargetSec: number
  duplicateCount: number
  onAcknowledge: () => void
}) {
  const config     = typeMap[request.type]
  const ageSeconds = (Date.now() - new Date(request.created_at).getTime()) / 1000
  const isApproaching = !isOverdue && ageSeconds >= responseTargetSec
  const bayLabel   = request.room?.name?.toUpperCase() ?? 'BAY —'

  // Determine border/background based on severity
  const cardStyle = isOverdue
    ? { background: '#FFF7ED', borderColor: '#FED7AA', borderLeft: '4px solid #EA580C' }
    : isApproaching
      ? { background: '#FFFBEB', borderColor: '#FDE68A', borderLeft: '4px solid #D97706' }
      : { background: STATUS_COLORS.pending.bg, borderColor: STATUS_COLORS.pending.border, borderLeft: `4px solid ${STATUS_COLORS.pending.accent}` }

  const btnColor = isOverdue ? '#EA580C' : isApproaching ? '#D97706' : STATUS_COLORS.pending.accent

  return (
    <div className={`rounded-2xl border flex flex-col ${isOverdue ? 'overdue-pulse' : ''}`}
      style={cardStyle}>
      <div className="px-4 py-4 flex-1">
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
            {bayLabel}
          </span>

          {/* Duplicate count badge */}
          {duplicateCount > 1 && (
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: '#F3E8FF', color: '#7C3AED' }}
              title={`${duplicateCount} identical requests from this bay — acknowledging will clear all`}>
              ×{duplicateCount}
            </span>
          )}

          {/* Overdue badge — highest priority */}
          {isOverdue && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: '#FED7AA', color: '#9A3412' }}>
              <span className="critical-dot-blink h-2 w-2 rounded-full" style={{ background: '#EA580C' }} />
              Overdue
            </span>
          )}

          {/* Approaching badge */}
          {isApproaching && !isOverdue && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: '#FEF3C7', color: '#92400E' }}>
              Waiting
            </span>
          )}

          {/* Urgent / critical badge */}
          {request.is_urgent && !isOverdue && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: STATUS_COLORS.pending.soft, color: STATUS_COLORS.pending.accent }}>
              <span className="critical-dot-blink h-2 w-2 rounded-full" style={{ background: STATUS_COLORS.pending.accent }} />
              Urgent
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
          style={{ background: btnColor }}>
          {duplicateCount > 1 ? `Acknowledge all ×${duplicateCount}` : 'Acknowledge'}
        </button>
      </div>
    </div>
  )
}

/* ── In Progress card ───────────────────────────────────────────────────────── */
// Visual escalation:
//   normal    → blue border + "In Progress" badge
//   long wait → amber tint + pulsing "Long Wait" badge  (elapsed ≥ overdueThresholdSec)
// Actions: Resolve | Reassign → (inline staff picker)
function InProgressCard({
  request,
  typeMap,
  overdueThresholdSec,
  assignableStaff,
  onResolve,
  onReassign,
}: {
  request: Request
  typeMap: Record<string, RequestTypeConfig>
  overdueThresholdSec: number
  assignableStaff: AssignableStaffMember[]
  onResolve: () => void
  onReassign: (newUserId: string, newUserName: string) => void
}) {
  const config   = typeMap[request.type]
  const bayLabel = request.room?.name?.toUpperCase() ?? 'BAY —'
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close picker when clicking outside
  useEffect(() => {
    if (!showPicker) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPicker])

  // Measure elapsed from acknowledged_at if available, otherwise created_at
  const startMs    = new Date(request.acknowledged_at ?? request.created_at).getTime()
  const elapsedSec = (Date.now() - startMs) / 1000
  const elapsedMin = Math.floor(elapsedSec / 60)
  const isLongWait = elapsedSec >= overdueThresholdSec

  // Current assignee name from joined data
  const assigneeName = (request as Request & {
    acknowledger?: { full_name: string | null }
  }).acknowledger?.full_name

  const cardStyle = isLongWait
    ? { background: '#FFFBEB', borderColor: '#FDE68A', borderLeft: '4px solid #D97706' }
    : { background: STATUS_COLORS.inProgress.bg, borderColor: STATUS_COLORS.inProgress.border, borderLeft: `4px solid ${STATUS_COLORS.inProgress.accent}` }

  return (
    <div className={`rounded-2xl border flex flex-col ${isLongWait ? 'overdue-pulse' : ''}`}
      style={cardStyle}>
      <div className="px-4 py-4 flex-1">
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
            {bayLabel}
          </span>
          {isLongWait ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: '#FEF3C7', color: '#92400E' }}>
              <span className="critical-dot-blink h-2 w-2 rounded-full" style={{ background: '#D97706' }} />
              Long Wait
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: '#FACC15', color: '#111827' }}>
              In Progress
            </span>
          )}
        </div>

        <p className="text-sm font-bold mb-1.5" style={{ color: '#111827' }}>
          {config?.label ?? request.type}
        </p>

        <p className="flex items-center gap-1 text-xs mb-1" style={{ color: isLongWait ? '#D97706' : STATUS_COLORS.inProgress.text }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {elapsedMin}m active
        </p>

        {/* Assignee name */}
        {assigneeName && (
          <p className="text-[11px] truncate" style={{ color: '#6B7280' }}>
            ↳ {assigneeName}
          </p>
        )}
      </div>

      <div className="px-4 pb-3 flex items-center justify-between relative" ref={pickerRef}>
        {/* Reassign button + picker */}
        <div className="relative">
          <button
            onClick={() => setShowPicker(v => !v)}
            className="text-xs font-medium flex items-center gap-1 transition-colors"
            style={{ color: '#6B7280' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3l5 5-5 5"/><path d="M21 8H10a7 7 0 0 0 0 14h1"/>
            </svg>
            Reassign
          </button>

          {showPicker && (
            <div className="absolute bottom-full left-0 mb-1 z-50 w-48 rounded-xl border bg-white shadow-lg overflow-hidden"
              style={{ borderColor: '#E5E7EB' }}>
              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: '#9CA3AF', borderBottom: '1px solid #F3F4F6' }}>
                Hand off to…
              </p>
              {assignableStaff.length === 0 ? (
                <p className="px-3 py-2 text-xs italic" style={{ color: '#9CA3AF' }}>No staff found</p>
              ) : (
                <ul>
                  {assignableStaff.map(s => (
                    <li key={s.id}>
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#F9FAFB] transition-colors"
                        onClick={() => {
                          onReassign(s.id, s.fullName)
                          setShowPicker(false)
                        }}>
                        <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
                          style={{ background: '#3B82F6' }}>
                          {s.initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate" style={{ color: '#111827' }}>{s.fullName}</p>
                          <p className="text-[10px] capitalize" style={{ color: '#9CA3AF' }}>{s.role.replace('_', ' ')}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <button onClick={onResolve} className="text-xs font-bold transition-colors"
          style={{ color: isLongWait ? '#D97706' : STATUS_COLORS.inProgress.text }}>
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
