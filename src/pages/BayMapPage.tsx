import { useState } from 'react'
import NurseShell from '@/components/NurseShell'
import RequestTypeIcon from '@/components/RequestTypeIcon'
import { useBayMap, type BayState, type BayStatus, type ActiveRequest } from '@/hooks/useBayMap'
import { useRequestTypes } from '@/hooks/useRequestTypes'
import { useRequests } from '@/hooks/useRequests'
import { useTenantContext } from '@/hooks/useTenantContext'

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<BayStatus, {
  bg: string; border: string; dot: string; text: string
  label: string; pulse: boolean
}> = {
  urgent:      { bg: '#FEF2F2', border: '#FCA5A5', dot: '#DC2626', text: '#991B1B', label: 'Urgent',      pulse: true  },
  pending:     { bg: '#FFF7ED', border: '#FCD34D', dot: '#D97706', text: '#92400E', label: 'Pending',     pulse: true  },
  'in-progress':{ bg: '#EFF6FF', border: '#93C5FD', dot: '#1D6FA8', text: '#1E40AF', label: 'In Progress', pulse: false },
  resolved:    { bg: '#ECFDF5', border: '#6EE7B7', dot: '#059669', text: '#065F46', label: 'Resolved',    pulse: false },
  idle:        { bg: '#F9FAFB', border: '#E5E7EB', dot: '#D1D5DB', text: '#9CA3AF', label: 'Idle',        pulse: false },
}

function fmtAge(s: number | null): string {
  if (s === null) return ''
  if (s < 60)   return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h`
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BayMapPage() {
  const { tenantId, tenantName, unitId } = useTenantContext()
  const { requestTypeMap } = useRequestTypes(tenantId)
  const { bays, summary, loading, connected, updateStatus } = useBayMap(unitId, requestTypeMap)
  const { requests, stats, soundEnabled, setSoundEnabled } = useRequests(unitId, tenantId)
  const [selectedBay, setSelectedBay] = useState<BayState | null>(null)
  const unitName = requests[0]?.room?.unit?.name ?? (tenantName ?? 'Assigned Unit')

  // Keep selected bay in sync with live data
  const liveBay = selectedBay
    ? bays.find(b => b.roomId === selectedBay.roomId) ?? null
    : null

  // Arrange bays: split into two rows (north/south wings)
  const half      = Math.ceil(bays.length / 2)
  const northWing = bays.slice(0, half)
  const southWing = bays.slice(half)

  if (!unitId) {
    return (
      <NurseShell stats={stats} connected={connected}
        soundEnabled={soundEnabled} onSoundToggle={() => setSoundEnabled(!soundEnabled)}
        unitName={unitName}>
        <div className="flex items-center justify-center h-full px-6">
          <div className="text-center max-w-md">
            <p className="font-semibold text-[var(--text-primary)] mb-1">Bay map needs a unit assignment</p>
            <p className="text-sm text-[var(--text-muted)]">
              This screen is unit-specific. Assign the user to a unit, or open Staffing or Reports for tenant-wide views.
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

      <style>{`
        @keyframes urgentPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(220,38,38,0); }
        }
        @keyframes pendingPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(217,119,6,0.35); }
          50%       { box-shadow: 0 0 0 8px rgba(217,119,6,0); }
        }
        .pulse-urgent  { animation: urgentPulse  1.4s ease-in-out infinite; }
        .pulse-pending { animation: pendingPulse 2s   ease-in-out infinite; }
      `}</style>

      <div className="flex h-full overflow-hidden">

        {/* ── Main map area ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Toolbar */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-white">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Bay Map</h2>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">{unitName} · live floor view</p>
            </div>
            {/* Summary chips */}
            <div className="flex items-center gap-2">
              {[
                { label: `${summary.urgent} Urgent`,      color: '#DC2626', bg: '#FEF2F2', show: summary.urgent > 0 },
                { label: `${summary.pending} Pending`,    color: '#D97706', bg: '#FFF7ED', show: summary.pending > 0 },
                { label: `${summary.inProgress} Active`,  color: '#1D6FA8', bg: '#EFF6FF', show: summary.inProgress > 0 },
                { label: `${summary.idle} Idle`,          color: '#9CA3AF', bg: '#F9FAFB', show: true },
              ].filter(c => c.show).map(c => (
                <span key={c.label} className="text-xs font-semibold px-3 py-1.5 rounded-full border"
                  style={{ color: c.color, background: c.bg, borderColor: c.color + '40' }}>
                  {c.label}
                </span>
              ))}
              {/* Connection dot */}
              <div className="flex items-center gap-1.5 ml-2 text-xs text-[var(--text-muted)]">
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
                {connected ? 'Live' : 'Reconnecting'}
              </div>
            </div>
          </div>

          {/* Floor plan */}
          <div className="flex-1 overflow-y-auto px-6 py-6 bg-[var(--page-bg)]">

            {loading ? (
              <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
                <div className="w-6 h-6 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin mr-2" />
                <span className="text-sm">Loading floor plan…</span>
              </div>
            ) : bays.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-4xl mb-3">🏥</p>
                  <p className="font-medium text-[var(--text-secondary)]">No bays configured</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">Add rooms in the Admin portal to see them here</p>
                </div>
              </div>
            ) : (
              <div className="max-w-5xl mx-auto">

                {/* Ward border */}
                <div className="bg-white rounded-3xl border-2 border-[var(--border)] shadow-card overflow-hidden">

                  {/* Ward header */}
                  <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)]"
                    style={{ background: '#1D6FA8' }}>
                    <p className="text-white font-semibold text-sm tracking-wide">{unitName}</p>
                    <p className="text-white/70 text-xs font-mono">{bays.length} bays</p>
                  </div>

                  {/* North wing */}
                  {northWing.length > 0 && (
                    <div className="px-5 pt-5 pb-2">
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 pl-1">
                        North Wing
                      </p>
                      <div className="grid gap-3"
                        style={{ gridTemplateColumns: `repeat(${Math.min(northWing.length, 6)}, 1fr)` }}>
                        {northWing.map(bay => (
                          <BayCell key={bay.roomId} bay={bay}
                            selected={liveBay?.roomId === bay.roomId}
                            onClick={() => setSelectedBay(
                              liveBay?.roomId === bay.roomId ? null : bay
                            )} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Corridor + Nurse station */}
                  <div className="mx-5 my-4 relative flex items-center">
                    <div className="flex-1 h-px border-t-2 border-dashed border-[var(--border)]" />
                    <div className="mx-4 flex-shrink-0">
                      <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl border-2 bg-[var(--clinical-blue-lt)] border-[var(--clinical-blue)]/30">
                        <div className="w-7 h-7 rounded-lg bg-[var(--clinical-blue)] flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--clinical-blue)]">Nurse Station</p>
                          <p className="text-[10px] text-[var(--clinical-blue)]/70">{unitName}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 h-px border-t-2 border-dashed border-[var(--border)]" />
                  </div>

                  {/* South wing */}
                  {southWing.length > 0 && (
                    <div className="px-5 pb-5 pt-2">
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 pl-1">
                        South Wing
                      </p>
                      <div className="grid gap-3"
                        style={{ gridTemplateColumns: `repeat(${Math.min(southWing.length, 6)}, 1fr)` }}>
                        {southWing.map(bay => (
                          <BayCell key={bay.roomId} bay={bay}
                            selected={liveBay?.roomId === bay.roomId}
                            onClick={() => setSelectedBay(
                              liveBay?.roomId === bay.roomId ? null : bay
                            )} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 px-2 flex-wrap">
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Legend</p>
                  {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: cfg.dot }} />
                      <span className="text-xs text-[var(--text-muted)]">{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Bay detail panel ──────────────────────────────────────── */}
        <div className={`flex-shrink-0 border-l border-[var(--border)] bg-white transition-all duration-200 overflow-hidden flex flex-col ${
          liveBay ? 'w-80' : 'w-0'
        }`}>
          {liveBay && (
            <BayDetailPanel
              bay={liveBay}
              onClose={() => setSelectedBay(null)}
              onUpdateStatus={updateStatus}
            />
          )}
        </div>
      </div>
    </NurseShell>
  )
}

// ── Bay cell ──────────────────────────────────────────────────────────────────
function BayCell({ bay, selected, onClick }: {
  bay: BayState; selected: boolean; onClick: () => void
}) {
  const cfg      = STATUS_CFG[bay.status]
  const pulseClass = bay.status === 'urgent' ? 'pulse-urgent'
    : bay.status === 'pending' ? 'pulse-pending' : ''

  // Top icons for active requests (up to 3)
  const activeReqs = bay.requests.filter(r => r.status !== 'resolved').slice(0, 3)

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col rounded-2xl border-2 p-3.5 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${pulseClass} ${
        selected ? 'ring-2 ring-[var(--clinical-blue)] ring-offset-2' : ''
      }`}
      style={{
        background:   cfg.bg,
        borderColor:  selected ? 'var(--clinical-blue)' : cfg.border,
        minHeight:    '120px',
      }}>

      {/* Status dot */}
      <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full"
        style={{ background: cfg.dot }} />

      {/* Bay name */}
      <p className="text-sm font-bold pr-5 leading-tight" style={{ color: cfg.text }}>
        {bay.name}
      </p>

      {/* Request icons */}
      {activeReqs.length > 0 ? (
        <div className="flex gap-1 mt-2 flex-wrap">
          {activeReqs.map(r => (
            <RequestTypeIcon
              key={r.id}
              icon={r.icon}
              label={r.label}
              className="text-base leading-none"
              imageClassName="h-4 w-4 object-contain"
            />
          ))}
          {bay.pendingCount + bay.inProgressCount > 3 && (
            <span className="text-xs font-bold" style={{ color: cfg.text }}>
              +{bay.pendingCount + bay.inProgressCount - 3}
            </span>
          )}
        </div>
      ) : bay.status === 'resolved' ? (
        <p className="text-xs mt-2" style={{ color: cfg.text }}>All resolved</p>
      ) : (
        <p className="text-xs mt-2" style={{ color: cfg.text }}>No requests</p>
      )}

      {/* Age of oldest pending */}
      {bay.oldestPendingSec !== null && (
        <p className="text-[10px] font-mono font-semibold mt-auto pt-2" style={{ color: cfg.dot }}>
          {fmtAge(bay.oldestPendingSec)} waiting
        </p>
      )}

      {/* Request count badges */}
      {(bay.pendingCount > 0 || bay.inProgressCount > 0) && (
        <div className="absolute top-2.5 left-2.5 flex gap-1">
          {bay.pendingCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {bay.pendingCount}
            </span>
          )}
          {bay.inProgressCount > 0 && (
            <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
              style={{ background: '#1D6FA8' }}>
              {bay.inProgressCount}
            </span>
          )}
        </div>
      )}
    </button>
  )
}

// ── Bay detail panel ──────────────────────────────────────────────────────────
function BayDetailPanel({ bay, onClose, onUpdateStatus }: {
  bay: BayState
  onClose: () => void
  onUpdateStatus: (id: string, status: 'acknowledged' | 'resolved') => Promise<void>
}) {
  const cfg     = STATUS_CFG[bay.status]
  const pending = bay.requests.filter(r => r.status === 'pending')
  const inProg  = bay.requests.filter(r => r.status === 'acknowledged')
  const resolved = bay.requests.filter(r => r.status === 'resolved')

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}` }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.dot }} />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">{bay.name}</p>
            <p className="text-xs font-medium" style={{ color: cfg.dot }}>{cfg.label}</p>
          </div>
        </div>
        <button onClick={onClose}
          className="w-7 h-7 rounded-full hover:bg-[var(--page-bg)] flex items-center justify-center text-[var(--text-muted)] transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Requests */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {bay.requests.length === 0 && (
          <div className="text-center py-12">
            <p className="text-2xl mb-2">✓</p>
            <p className="text-sm font-medium text-[var(--text-secondary)]">No active requests</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">This bay is clear</p>
          </div>
        )}

        {pending.length > 0 && (
          <RequestSection label="Pending" color="#DC2626" requests={pending}
            onUpdateStatus={onUpdateStatus} />
        )}
        {inProg.length > 0 && (
          <RequestSection label="In Progress" color="#1D6FA8" requests={inProg}
            onUpdateStatus={onUpdateStatus} />
        )}
        {resolved.length > 0 && (
          <RequestSection label="Resolved" color="#059669" requests={resolved}
            onUpdateStatus={onUpdateStatus} muted />
        )}
      </div>
    </div>
  )
}

// ── Request section in panel ──────────────────────────────────────────────────
function RequestSection({ label, color, requests, onUpdateStatus, muted }: {
  label: string; color: string
  requests: ActiveRequest[]
  onUpdateStatus: (id: string, status: 'acknowledged' | 'resolved') => Promise<void>
  muted?: boolean
}) {
  return (
    <div className={muted ? 'opacity-60' : ''}>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {label} ({requests.length})
        </p>
      </div>
      <div className="space-y-2">
        {requests.map(r => (
          <RequestItem key={r.id} request={r} onUpdateStatus={onUpdateStatus} />
        ))}
      </div>
    </div>
  )
}

// ── Single request item in panel ──────────────────────────────────────────────
function RequestItem({ request: r, onUpdateStatus }: {
  request: ActiveRequest
  onUpdateStatus: (id: string, status: 'acknowledged' | 'resolved') => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  const act = async (status: 'acknowledged' | 'resolved') => {
    setBusy(true)
    await onUpdateStatus(r.id, status)
    setBusy(false)
  }

  const statusStyle = {
    pending:      { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
    acknowledged: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' },
    resolved:     { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
  }[r.status]

  return (
    <div className="rounded-xl border p-3 transition-all"
      style={{ background: statusStyle.bg, borderColor: statusStyle.border }}>
      <div className="flex items-center gap-2 mb-1.5">
        <RequestTypeIcon
          icon={r.icon}
          label={r.label}
          className="text-lg leading-none"
          imageClassName="h-5 w-5 object-contain"
        />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {r.label}
        </p>
        {r.isUrgent && r.status !== 'resolved' && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 ml-auto">
            Urgent
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px]" style={{ color: statusStyle.text }}>
          {r.status === 'resolved' ? 'Resolved' : fmtAge(r.ageSeconds) + ' ago'}
        </span>
        {r.status === 'pending' && (
          <button onClick={() => act('acknowledged')} disabled={busy}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-white transition-colors disabled:opacity-50"
            style={{ background: '#1D6FA8' }}>
            {busy ? '…' : 'Acknowledge'}
          </button>
        )}
        {r.status === 'acknowledged' && (
          <button onClick={() => act('resolved')} disabled={busy}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-white transition-colors disabled:opacity-50"
            style={{ background: '#059669' }}>
            {busy ? '…' : 'Resolve'}
          </button>
        )}
      </div>
    </div>
  )
}
