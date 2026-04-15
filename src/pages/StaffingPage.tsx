import { useState } from 'react'
import NurseShell from '@/components/NurseShell'
import { useStaffing, type StaffMember, type StaffRole } from '@/hooks/useStaffing'
import { useRequests } from '@/hooks/useRequests'
import { useTenantContext } from '@/hooks/useTenantContext'

// ── Role config ───────────────────────────────────────────────────────────────
const ROLE_CFG: Record<string, { label: string; bg: string; text: string }> = {
  super_admin:   { label: 'Super Admin',    bg: '#EDE9FE', text: '#5B21B6' },
  tenant_admin:  { label: 'Tenant Admin',   bg: '#EDE9FE', text: '#5B21B6' },
  nurse_manager: { label: 'Nurse Manager',  bg: '#DBEAFE', text: '#1D4ED8' },
  site_manager:  { label: 'Site Manager',   bg: '#DBEAFE', text: '#1D4ED8' },
  charge_nurse:  { label: 'Charge Nurse',   bg: '#DBEAFE', text: '#1D4ED8' },
  nurse:         { label: 'Nurse',          bg: '#ECFDF5', text: '#065F46' },
  volunteer:     { label: 'Volunteer',      bg: '#FEF3C7', text: '#92400E' },
  viewer:        { label: 'Viewer',         bg: '#FEF3C7', text: '#92400E' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtSec(s: number | null): string {
  if (s === null) return '—'
  if (s < 60)    return `${s}s`
  const m = Math.floor(s / 60), sec = s % 60
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return 'earlier'
}

// ── Avatar colour from initials ───────────────────────────────────────────────
const AVATAR_COLORS = [
  '#1D6FA8','#7C3AED','#059669','#D97706',
  '#DC2626','#0891B2','#BE185D','#065F46',
]
function avatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ── Workload bar ──────────────────────────────────────────────────────────────
function WorkloadBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--page-bg)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-xs font-semibold w-5 text-right"
        style={{ color }}>{value}</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
type ViewMode = 'roster' | 'workload'

export default function StaffingPage() {
  const { tenantId, tenantName, unitId } = useTenantContext()

  const { requests, stats, connected, soundEnabled, setSoundEnabled } = useRequests(unitId, tenantId)
  const { staff, summary, loading, refresh } = useStaffing(tenantId, unitId)

  const unitName = requests[0]?.room?.unit?.name ?? (unitId ? 'Assigned Unit' : `${tenantName ?? 'Tenant'} · All Units`)
  const [view,         setView]         = useState<ViewMode>('roster')
  const [roleFilter,   setRoleFilter]   = useState<StaffRole | 'all'>('all')
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)

  const maxResolved = Math.max(1, ...staff.map(s => s.resolvedToday))

  const visible = staff.filter(s =>
    roleFilter === 'all' || s.role === roleFilter
  )

  const roles = Array.from(new Set(staff.map(s => s.role))) as StaffRole[]

  if (!tenantId) {
    return (
      <NurseShell stats={stats} connected={connected}
        soundEnabled={soundEnabled} onSoundToggle={() => setSoundEnabled(!soundEnabled)}
        unitName={unitName}>
        <div className="flex items-center justify-center h-full px-6">
          <div className="text-center max-w-md">
            <p className="font-semibold text-[var(--text-primary)] mb-1">Staffing needs a tenant assignment</p>
            <p className="text-sm text-[var(--text-muted)]">
              This page only works for users attached to a tenant profile.
            </p>
          </div>
        </div>
      </NurseShell>
    )
  }

  return (
    <NurseShell stats={stats} connected={connected}
      soundEnabled={soundEnabled} onSoundToggle={() => setSoundEnabled(!soundEnabled)}
      unitName={unitName}>

      <div className="flex h-full overflow-hidden">

        {/* ── Main content ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Toolbar */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-white">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Staffing</h2>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                {unitName} · {staff.length} staff member{staff.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex border border-[var(--border)] rounded-xl overflow-hidden">
                {(['roster', 'workload'] as ViewMode[]).map(v => (
                  <button key={v} onClick={() => setView(v)}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors capitalize ${
                      view === v
                        ? 'bg-[var(--clinical-blue)] text-white'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--page-bg)]'
                    }`}>
                    {v}
                  </button>
                ))}
              </div>
              {/* Refresh */}
              <button onClick={refresh}
                className="w-9 h-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--page-bg)] transition-colors">
                <RefreshIcon />
              </button>
            </div>
          </div>

          {/* Summary bar */}
          <div className="flex-shrink-0 grid grid-cols-4 gap-px bg-[var(--border)] border-b border-[var(--border)]">
            {[
              { label: 'Total Staff',    value: String(summary.totalStaff),             color: '#1D6FA8' },
              { label: 'Active Now',     value: String(summary.activeNow),              color: '#059669' },
              { label: 'Resolved Today', value: String(summary.resolvedToday),          color: '#7C3AED' },
              { label: 'Avg Handle Time',value: fmtSec(summary.avgResolveSec),          color: '#D97706' },
            ].map(c => (
              <div key={c.label} className="bg-white px-5 py-3 flex items-center gap-3">
                <p className="text-xl font-bold" style={{ color: c.color }}>{c.value}</p>
                <p className="text-xs text-[var(--text-muted)] leading-tight">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Role filter pills */}
          <div className="flex-shrink-0 flex items-center gap-2 px-6 py-3 bg-white border-b border-[var(--border)] flex-wrap">
            <button onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                roleFilter === 'all'
                  ? 'bg-[var(--clinical-blue)] text-white border-[var(--clinical-blue)]'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
              }`}>
              All roles
            </button>
            {roles.map(r => {
              const cfg = ROLE_CFG[r]
              return (
                <button key={r} onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    roleFilter === r ? 'ring-2 ring-offset-1' : ''
                  }`}
                  style={{
                    background:  roleFilter === r ? cfg.bg    : 'white',
                    color:       cfg.text,
                    borderColor: roleFilter === r ? cfg.text  : 'var(--border)',
                  }}>
                  {cfg.label}
                </button>
              )
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">

            {loading && (
              <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
                <div className="w-5 h-5 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin mr-2" />
                <span className="text-sm">Loading staff…</span>
              </div>
            )}

            {!loading && staff.length === 0 && (
              <div className="text-center py-24">
                <div className="w-16 h-16 rounded-full bg-[var(--clinical-blue-lt)] flex items-center justify-center mx-auto mb-4">
                  <StaffIcon />
                </div>
                <p className="font-medium text-[var(--text-secondary)]">No staff configured</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Invite nurses in the Admin portal to see them here
                </p>
              </div>
            )}

            {!loading && visible.length > 0 && view === 'roster' && (
              <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--page-bg)]">
                      {['Staff Member', 'Role', 'Unit', 'Status', 'Resolved Today', 'Avg Handle Time', 'Last Active'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {visible.map(s => {
                      const roleCfg = ROLE_CFG[s.role]
                      const color   = avatarColor(s.id)
                      return (
                        <tr key={s.id}
                          onClick={() => setSelectedStaff(s.id === selectedStaff?.id ? null : s)}
                          className="hover:bg-[var(--page-bg)] transition-colors cursor-pointer">

                          {/* Name + avatar */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="relative flex-shrink-0">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                  style={{ background: color }}>
                                  {s.initials}
                                </div>
                                {s.isActive && (
                                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                                )}
                              </div>
                              <p className="text-sm font-semibold text-[var(--text-primary)]">{s.fullName}</p>
                            </div>
                          </td>

                          {/* Role badge */}
                          <td className="px-4 py-3.5">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={{ background: roleCfg.bg, color: roleCfg.text }}>
                              {roleCfg.label}
                            </span>
                          </td>

                          {/* Unit */}
                          <td className="px-4 py-3.5">
                            <p className="text-sm text-[var(--text-secondary)]">
                              {s.unitName ?? <span className="text-[var(--text-muted)] italic text-xs">All units</span>}
                            </p>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <span className="text-xs text-[var(--text-muted)]">
                                {s.isActive ? 'Active' : 'Offline'}
                              </span>
                            </div>
                          </td>

                          {/* Resolved today */}
                          <td className="px-4 py-3.5">
                            <span className={`text-sm font-bold ${
                              s.resolvedToday > 0 ? 'text-[var(--clinical-blue)]' : 'text-[var(--text-muted)]'
                            }`}>
                              {s.resolvedToday}
                            </span>
                          </td>

                          {/* Avg handle time */}
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-sm text-[var(--text-secondary)]">
                              {fmtSec(s.avgResolveSec)}
                            </span>
                          </td>

                          {/* Last active */}
                          <td className="px-4 py-3.5">
                            <span className="text-xs text-[var(--text-muted)]">
                              {s.lastActivityAt ? timeAgo(s.lastActivityAt) : <span className="italic">No activity today</span>}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Workload view — card grid */}
            {!loading && visible.length > 0 && view === 'workload' && (
              <div className="grid grid-cols-3 gap-4">
                {visible.map(s => {
                  const roleCfg = ROLE_CFG[s.role]
                  const color   = avatarColor(s.id)
                  return (
                    <div key={s.id}
                      onClick={() => setSelectedStaff(s.id === selectedStaff?.id ? null : s)}
                      className={`bg-white rounded-2xl border p-5 cursor-pointer hover:shadow-lift transition-all ${
                        selectedStaff?.id === s.id
                          ? 'border-[var(--clinical-blue)] ring-2 ring-[var(--clinical-blue)]/20'
                          : 'border-[var(--border)]'
                      }`}>

                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                              style={{ background: color }}>
                              {s.initials}
                            </div>
                            {s.isActive && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[var(--text-primary)] leading-tight">{s.fullName}</p>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 inline-block"
                              style={{ background: roleCfg.bg, color: roleCfg.text }}>
                              {roleCfg.label}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-2xl font-bold" style={{ color: s.resolvedToday > 0 ? color : 'var(--text-muted)' }}>
                            {s.resolvedToday}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">resolved</p>
                        </div>
                      </div>

                      {/* Workload bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                            Shift workload
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">
                            vs max {maxResolved}
                          </span>
                        </div>
                        <WorkloadBar value={s.resolvedToday} max={maxResolved} color={color} />
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[var(--border)]">
                        <div>
                          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Avg time</p>
                          <p className="text-sm font-bold font-mono text-[var(--text-primary)] mt-0.5">
                            {fmtSec(s.avgResolveSec)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Last active</p>
                          <p className="text-sm font-medium text-[var(--text-secondary)] mt-0.5">
                            {s.lastActivityAt ? timeAgo(s.lastActivityAt) : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Staff detail panel ────────────────────────────────────── */}
        <div className={`flex-shrink-0 border-l border-[var(--border)] bg-white transition-all duration-200 overflow-hidden flex flex-col ${
          selectedStaff ? 'w-72' : 'w-0'
        }`}>
          {selectedStaff && (
            <StaffDetailPanel
              staff={selectedStaff}
              onClose={() => setSelectedStaff(null)}
            />
          )}
        </div>
      </div>
    </NurseShell>
  )
}

// ── Staff detail panel ────────────────────────────────────────────────────────
function StaffDetailPanel({ staff: s, onClose }: {
  staff: StaffMember; onClose: () => void
}) {
  const color   = avatarColor(s.id)
  const roleCfg = ROLE_CFG[s.role]

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: color }}>
              {s.initials}
            </div>
            {s.isActive && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">{s.fullName}</p>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: roleCfg.bg, color: roleCfg.text }}>
              {roleCfg.label}
            </span>
          </div>
        </div>
        <button onClick={onClose}
          className="w-7 h-7 rounded-full hover:bg-[var(--page-bg)] flex items-center justify-center text-[var(--text-muted)] transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Stats */}
      <div className="px-4 py-4 space-y-3">
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Today's performance</p>

        {[
          { label: 'Requests resolved',  value: String(s.resolvedToday),      accent: color },
          { label: 'Avg handle time',    value: fmtSec(s.avgResolveSec),      accent: '#D97706' },
          { label: 'Unit',               value: s.unitName ?? 'All units',    accent: '#1D6FA8' },
          { label: 'Last activity',      value: s.lastActivityAt ? timeAgo(s.lastActivityAt) : 'No activity today', accent: '#059669' },
          { label: 'Status',             value: s.isActive ? 'Active now' : 'Offline',  accent: s.isActive ? '#059669' : '#9CA3AF' },
        ].map(row => (
          <div key={row.label} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
            <span className="text-xs text-[var(--text-muted)]">{row.label}</span>
            <span className="text-sm font-semibold" style={{ color: row.accent }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* User ID */}
      <div className="px-4 mt-auto pb-4 border-t border-[var(--border)] pt-3">
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">User ID</p>
        <p className="font-mono text-[10px] text-[var(--text-muted)] break-all">{s.id}</p>
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Edit role and unit in the
          <span className="text-[var(--clinical-blue)] font-medium"> Admin portal</span>
        </p>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const StaffIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--clinical-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
)
