import { useState, useEffect, useRef } from 'react'
import NurseShell from '@/components/NurseShell'
import RequestTypeIcon from '@/components/RequestTypeIcon'
import { useFeed, type FeedEvent, type EventKind } from '@/hooks/useFeed'
import { useRequests }  from '@/hooks/useRequests'
import { useRequestTypes } from '@/hooks/useRequestTypes'
import { useTenantContext } from '@/hooks/useTenantContext'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function fmtElapsed(s: number): string {
  if (s < 60)  return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
}
function timeAgoShort(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)  return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

// ── Event config ──────────────────────────────────────────────────────────────
const KIND_CFG: Record<EventKind, {
  label: string
  dot: string
  line: string
  badge: string
  badgeText: string
  verb: string
}> = {
  submitted: {
    label:     'Request submitted',
    dot:       '#1D6FA8',
    line:      '#BFDBFE',
    badge:     '#EFF6FF',
    badgeText: '#1D4ED8',
    verb:      'New request',
  },
  acknowledged: {
    label:     'Acknowledged',
    dot:       '#D97706',
    line:      '#FDE68A',
    badge:     '#FFFBEB',
    badgeText: '#92400E',
    verb:      'Acknowledged',
  },
  resolved: {
    label:     'Resolved',
    dot:       '#059669',
    line:      '#A7F3D0',
    badge:     '#ECFDF5',
    badgeText: '#065F46',
    verb:      'Resolved',
  },
}

// ── Component ─────────────────────────────────────────────────────────────────
type FilterBay   = 'all' | string
type FilterKind  = 'all' | EventKind
type FilterType  = 'all' | string

export default function PatientFeedPage() {
  const { tenantId, tenantName, unitId } = useTenantContext()
  const { requestTypes, requestTypeMap } = useRequestTypes(tenantId)

  const { events, activeBays, summary, loading, connected } = useFeed(unitId, requestTypeMap)
  const { requests, stats, soundEnabled, setSoundEnabled } = useRequests(unitId, tenantId)

  const [filterBay,  setFilterBay]  = useState<FilterBay>('all')
  const [filterKind, setFilterKind] = useState<FilterKind>('all')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [paused,     setPaused]     = useState(false)
  const [, setTick] = useState(0)

  const unitName = requests[0]?.room?.unit?.name ?? (tenantName ?? 'Assigned Unit')
  const feedRef  = useRef<HTMLDivElement>(null)

  // Refresh relative timestamps
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 15_000)
    return () => clearInterval(t)
  }, [])

  // Auto-scroll to top on new events unless paused
  const prevLen = useRef(events.length)
  useEffect(() => {
    if (!paused && events.length > prevLen.current && feedRef.current) {
      feedRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
    prevLen.current = events.length
  }, [events.length, paused])

  // Apply filters
  const visible = events.filter(e => {
    if (filterBay  !== 'all' && e.bay   !== filterBay)   return false
    if (filterKind !== 'all' && e.kind  !== filterKind)  return false
    if (filterType !== 'all' && e.type  !== filterType)  return false
    return true
  })

  // Unique bays that appear in today's events
  const typeOptions = requestTypes.filter(rt => events.some(e => e.type === rt.id))

  if (!unitId) {
    return (
      <NurseShell stats={stats} connected={connected}
        soundEnabled={soundEnabled}
        onSoundToggle={() => setSoundEnabled(!soundEnabled)}
        unitName={unitName}>
        <div className="flex items-center justify-center h-full px-6">
          <div className="text-center max-w-md">
            <p className="font-semibold text-[var(--text-primary)] mb-1">Patient feed needs a unit assignment</p>
            <p className="text-sm text-[var(--text-muted)]">
              This live event feed is unit-specific. Assign the account to a unit to use it.
            </p>
          </div>
        </div>
      </NurseShell>
    )
  }

  return (
    <NurseShell stats={stats} connected={connected}
      soundEnabled={soundEnabled}
      onSoundToggle={() => setSoundEnabled(!soundEnabled)}
      unitName={unitName}>

      <div className="flex h-full overflow-hidden">

        {/* ── Left panel: summary + filters + active bays ─────────── */}
        <aside className="hidden lg:flex w-64 flex-shrink-0 border-r border-[var(--border)] flex-col bg-white overflow-y-auto">

          {/* Shift summary */}
          <div className="px-4 pt-5 pb-4 border-b border-[var(--border)]">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Shift Summary
            </p>
            <div className="grid grid-cols-2 gap-2">
              <SummaryChip label="Events"   value={String(summary.totalEvents)}   color="#1D6FA8" />
              <SummaryChip label="Bays"     value={String(summary.baysActive)}    color="#7C3AED" />
              <SummaryChip label="Urgent"   value={String(summary.urgentOpen)}    color="#DC2626" />
              <SummaryChip label="Resolved" value={String(summary.resolvedCount)} color="#059669" />
            </div>
          </div>

          {/* Active bays */}
          {activeBays.length > 0 && (
            <div className="px-4 py-4 border-b border-[var(--border)]">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Active Bays
              </p>
              <div className="space-y-1.5">
                {activeBays.map(b => (
                  <button key={b.roomId}
                    onClick={() => setFilterBay(filterBay === b.name ? 'all' : b.name)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all border ${
                      filterBay === b.name
                        ? 'bg-[var(--clinical-blue-lt)] border-[var(--clinical-blue)]/30 text-[var(--clinical-blue)]'
                        : 'border-[var(--border)] hover:bg-[var(--page-bg)] text-[var(--text-secondary)]'
                    }`}>
                    <span className="font-medium">{b.name}</span>
                    <div className="flex items-center gap-1.5">
                      {b.pendingCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold flex items-center justify-center">
                          {b.pendingCount}
                        </span>
                      )}
                      {b.inProgressCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center">
                          {b.inProgressCount}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Event type filter */}
          <div className="px-4 py-4 border-b border-[var(--border)]">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Event Type
            </p>
            <div className="space-y-1">
              {(['all', 'submitted', 'acknowledged', 'resolved'] as ('all' | EventKind)[]).map(k => (
                <button key={k}
                  onClick={() => setFilterKind(k)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
                    filterKind === k
                      ? 'bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--page-bg)]'
                  }`}>
                  {k !== 'all' && (
                    <span className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: KIND_CFG[k as EventKind].dot }} />
                  )}
                  <span className="capitalize">{k === 'all' ? 'All events' : KIND_CFG[k as EventKind].label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Request type filter */}
          {typeOptions.length > 0 && (
            <div className="px-4 py-4">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Request Category
              </p>
              <div className="space-y-1">
                <button onClick={() => setFilterType('all')}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-sm transition-all ${
                    filterType === 'all'
                      ? 'bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--page-bg)]'
                  }`}>
                  All categories
                </button>
                {typeOptions.map(rt => (
                  <button key={rt.id} onClick={() => setFilterType(filterType === rt.id ? 'all' : rt.id)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-all ${
                      filterType === rt.id
                        ? 'bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)] font-medium'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--page-bg)]'
                    }`}>
                    <RequestTypeIcon
                      icon={rt.icon}
                      label={rt.label}
                      className="text-base leading-none"
                      imageClassName="h-4 w-4 object-contain"
                    />
                    <span>{rt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── Main feed ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Feed toolbar */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-white">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Patient Feed</h2>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                {unitName} · {visible.length} event{visible.length !== 1 ? 's' : ''}
                {filterBay !== 'all' || filterKind !== 'all' || filterType !== 'all'
                  ? ' (filtered)' : ' today'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Live indicator */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] text-xs text-[var(--text-muted)]">
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
                {connected ? 'Live' : 'Reconnecting'}
              </div>
              {/* Pause/resume */}
              <button
                onClick={() => setPaused(p => !p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                  paused
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]'
                }`}>
                {paused ? <PlayIcon /> : <PauseIcon />}
                {paused ? 'Resume scroll' : 'Pause scroll'}
              </button>
              {/* Clear filters */}
              {(filterBay !== 'all' || filterKind !== 'all' || filterType !== 'all') && (
                <button
                  onClick={() => { setFilterBay('all'); setFilterKind('all'); setFilterType('all') }}
                  className="px-3 py-1.5 rounded-full border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-red-600 hover:border-red-200 transition-all">
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Timeline feed */}
          <div ref={feedRef} className="flex-1 overflow-y-auto px-6 py-5">

            {loading && (
              <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
                <div className="w-5 h-5 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin mr-2" />
                <span className="text-sm">Loading feed…</span>
              </div>
            )}

            {!loading && visible.length === 0 && (
              <div className="text-center py-24">
                <div className="w-16 h-16 rounded-full bg-[var(--clinical-blue-lt)] flex items-center justify-center mx-auto mb-4">
                  <ActivityIcon />
                </div>
                <p className="font-medium text-[var(--text-secondary)]">No events yet</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Activity will appear here as patients submit requests
                </p>
              </div>
            )}

            {/* Group events by date label */}
            {!loading && visible.length > 0 && (
              <div className="max-w-2xl">
                <TimelineList events={visible} />
              </div>
            )}
          </div>
        </div>
      </div>
    </NurseShell>
  )
}

// ── Timeline list with date grouping ─────────────────────────────────────────
function TimelineList({ events }: { events: FeedEvent[] }) {
  // Group by hour block for better readability
  const groups: { label: string; items: FeedEvent[] }[] = []
  let currentHour = -1

  for (const e of events) {
    const h = new Date(e.timestamp).getHours()
    if (h !== currentHour) {
      const d = new Date(e.timestamp)
      const label = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        .replace(/:\d{2}(?:\s|$)/, ':00 ').trim()
      groups.push({ label: `${label.replace('00', '00')}`, items: [] })
      currentHour = h
    }
    groups[groups.length - 1].items.push(e)
  }

  return (
    <div className="relative">
      {/* Vertical timeline spine */}
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[var(--border)]" />

      <div className="space-y-0">
        {groups.map((g, gi) => (
          <div key={gi} className="mb-1">
            {/* Hour separator */}
            <div className="flex items-center gap-3 mb-2 mt-4 first:mt-0">
              <div className="w-10 h-10 flex-shrink-0" />
              <span className="text-[10px] font-mono font-semibold text-[var(--text-muted)] uppercase tracking-widest bg-[var(--page-bg)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                {g.label}
              </span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            {/* Events in this hour */}
            {g.items.map((e, ei) => (
              <TimelineItem
                key={e.id}
                event={e}
                isLast={gi === groups.length - 1 && ei === g.items.length - 1}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Single timeline item ──────────────────────────────────────────────────────
function TimelineItem({ event: e, isLast }: { event: FeedEvent; isLast: boolean }) {
  const cfg = KIND_CFG[e.kind]

  return (
    <div className="flex gap-3 pb-2 group animate-slide-down">

      {/* Dot */}
      <div className="flex-shrink-0 w-10 flex flex-col items-center">
        <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0 mt-3 z-10"
          style={{ background: cfg.dot }} />
        {!isLast && <div className="flex-1 w-px mt-1" style={{ background: cfg.line }} />}
      </div>

      {/* Card */}
      <div className="flex-1 mb-2">
        <div className="bg-white rounded-2xl border border-[var(--border)] px-4 py-3.5 shadow-card hover:shadow-lift transition-shadow">

          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">

              {/* Top row: bay + badges */}
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                  style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
                  {e.bay.toUpperCase()}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide"
                  style={{ background: cfg.badge, color: cfg.badgeText }}>
                  {cfg.verb}
                </span>
                {e.isUrgent && e.kind === 'submitted' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                    style={{ background: '#FEE2E2', color: '#DC2626' }}>
                    Urgent
                  </span>
                )}
              </div>

              {/* Request label + icon */}
              <div className="flex items-center gap-2">
                <RequestTypeIcon
                  icon={e.icon}
                  label={e.label}
                  className="text-base leading-none"
                  imageClassName="h-4 w-4 object-contain"
                />
                <span className="text-sm font-semibold text-[var(--text-primary)]">{e.label}</span>
              </div>

              {/* Elapsed time for ack/resolve */}
              {e.kind !== 'submitted' && e.elapsed > 0 && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {e.kind === 'acknowledged' ? 'Response time: ' : 'Handled in: '}
                  <span className="font-semibold" style={{ color: cfg.dot }}>
                    {fmtElapsed(e.elapsed)}
                  </span>
                </p>
              )}

              {e.actorName && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  by <span className="font-medium text-[var(--text-secondary)]">{e.actorName}</span>
                </p>
              )}
            </div>

            {/* Timestamp */}
            <div className="text-right flex-shrink-0">
              <p className="font-mono text-xs font-medium text-[var(--text-secondary)]">
                {fmtTime(e.timestamp)}
              </p>
              <p className="font-mono text-[10px] text-[var(--text-muted)] mt-0.5">
                {timeAgoShort(e.timestamp)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Small components ──────────────────────────────────────────────────────────
function SummaryChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl px-3 py-2.5 border border-[var(--border)]"
      style={{ background: color + '0f' }}>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
      <p className="text-[10px] text-[var(--text-muted)] font-medium">{label}</p>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const svgIco = (d: React.ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
)
const PauseIcon    = () => svgIco(<><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>)
const PlayIcon     = () => svgIco(<polygon points="5 3 19 12 5 21 5 3"/>)
const ActivityIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--clinical-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)
