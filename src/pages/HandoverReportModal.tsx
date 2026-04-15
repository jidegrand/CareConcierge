import { useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { timeAgo } from '@/lib/constants'
import type { Request, RequestTypeConfig } from '@/types'
import type { StaffEvent } from '@/hooks/useRequests'

interface Props {
  unitName:       string
  requests:       Request[]
  staffEvents:    StaffEvent[]
  requestTypeMap: Record<string, RequestTypeConfig>
  onClose:        () => void
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function fmtDateLong(d: Date) {
  return d.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export default function HandoverReportModal({
  unitName, requests, staffEvents, requestTypeMap, onClose,
}: Props) {
  const { profile } = useAuth()
  const reportRef   = useRef<HTMLDivElement>(null)

  const now         = new Date()
  const generatedBy = profile?.full_name ?? 'Unknown'

  const pending    = requests.filter(r => r.status === 'pending')
  const inProgress = requests.filter(r => r.status === 'acknowledged')
  const openItems  = [...pending, ...inProgress].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const resolved = requests
    .filter(r => r.status === 'resolved')
    .sort((a, b) =>
      new Date(b.resolved_at ?? b.created_at).getTime() -
      new Date(a.resolved_at ?? a.created_at).getTime()
    )

  // ── Copy as plain text ───────────────────────────────────────────────────────
  const handleCopy = () => {
    const lines: string[] = [
      '═══════════════════════════════════════════════════════',
      'SHIFT HANDOVER REPORT',
      `${unitName}`,
      `${fmtDateLong(now)} · ${fmtTime(now.toISOString())}`,
      `Prepared by: ${generatedBy}`,
      '═══════════════════════════════════════════════════════',
      '',
      `SUMMARY`,
      `  Pending:        ${pending.length}`,
      `  In Progress:    ${inProgress.length}`,
      `  Resolved Today: ${resolved.length}`,
      '',
    ]

    if (openItems.length > 0) {
      lines.push('OPEN REQUESTS — REQUIRES HANDOVER (oldest first)')
      for (const r of openItems) {
        const label    = requestTypeMap[r.type]?.label ?? r.type
        const bay      = r.room?.name ?? '—'
        const age      = timeAgo(r.created_at)
        const assignee = r.acknowledger?.full_name
        const urgency  = r.is_urgent ? ' [URGENT]' : ''
        lines.push(
          `  [${r.status === 'pending' ? 'PENDING    ' : 'IN-PROGRESS'}] ${bay.padEnd(8)} ${label}${urgency}`
          + `  ${age}${assignee ? `  →  ${assignee}` : '  →  Unassigned'}`
        )
      }
      lines.push('')
    } else {
      lines.push('OPEN REQUESTS: None — clean handover!')
      lines.push('')
    }

    if (resolved.length > 0) {
      lines.push('RESOLVED THIS SHIFT')
      for (const r of resolved) {
        const label    = requestTypeMap[r.type]?.label ?? r.type
        const bay      = r.room?.name ?? '—'
        const resolver = r.resolver?.full_name ?? '—'
        const time     = r.resolved_at ? fmtTime(r.resolved_at) : '—'
        lines.push(`  ${bay.padEnd(8)} ${label}  →  ${resolver}  at ${time}`)
      }
      lines.push('')
    }

    if (staffEvents.length > 0) {
      lines.push('STAFF ACTIVITY')
      for (const e of staffEvents) {
        lines.push(`  ${fmtTime(e.timestamp)}  ${e.name} — ${e.action}`)
      }
      lines.push('')
    }

    lines.push('═══════════════════════════════════════════════════════')
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {})
  }

  const handlePrint = () => window.print()

  // ── Row helpers ──────────────────────────────────────────────────────────────
  const BayBadge = ({ bay, variant }: { bay: string; variant: 'blue' | 'green' }) => (
    <span className="font-bold text-[11px] px-2 py-0.5 rounded-full"
      style={variant === 'green'
        ? { background: '#D1FAE5', color: '#065F46' }
        : { background: '#DBEAFE', color: '#1D4ED8' }}>
      {bay.toUpperCase()}
    </span>
  )

  const Th = ({ children }: { children: React.ReactNode }) => (
    <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wide"
      style={{ color: '#6B7280', background: '#F3F4F6' }}>
      {children}
    </th>
  )

  return (
    <>
      {/* Print styles — hides everything except the report */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #handover-print-root { display: block !important; position: static !important; background: white !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Backdrop */}
      <div className="fixed inset-0 z-50 flex items-center justify-center no-print"
        style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(2px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}>

        {/* Sheet */}
        <div id="handover-print-root"
          className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ width: 760, maxWidth: '95vw', maxHeight: '92vh' }}
          ref={reportRef}>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between px-6 py-5 flex-shrink-0"
            style={{ background: '#1E3A5F' }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#93C5FD' }}>
                Shift Handover Report
              </p>
              <p className="text-2xl font-bold text-white">{unitName}</p>
              <p className="text-sm mt-1" style={{ color: '#BFDBFE' }}>
                {fmtDateLong(now)} &nbsp;·&nbsp; Generated {fmtTime(now.toISOString())} by <span className="font-semibold">{generatedBy}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 no-print mt-1">
              <button onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'white', background: 'rgba(255,255,255,0.08)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy text
              </button>
              <button onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{ background: 'white', color: '#1E3A5F' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print
              </button>
              <button onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* ── Stats banner ────────────────────────────────────────────── */}
          <div className="flex flex-shrink-0 border-b" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
            {([
              { label: 'Pending',         value: pending.length,    color: '#DC2626', bg: '#FEF2F2' },
              { label: 'In Progress',     value: inProgress.length, color: '#D97706', bg: '#FFFBEB' },
              { label: 'Resolved Today',  value: resolved.length,   color: '#059669', bg: '#ECFDF5' },
            ] as const).map(s => (
              <div key={s.label} className="flex-1 px-6 py-4 border-r last:border-r-0"
                style={{ borderColor: '#E5E7EB', borderLeft: `4px solid ${s.color}` }}>
                <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs font-medium mt-0.5" style={{ color: '#6B7280' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── Scrollable body ─────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">

            {/* Open requests */}
            <section className="px-6 py-5">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
                style={{ color: '#374151' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
                Open Requests — Requires Handover
                <span className="font-mono text-[#9CA3AF]">({openItems.length})</span>
              </h3>

              {openItems.length === 0 ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                  style={{ background: '#ECFDF5', borderColor: '#A7F3D0' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <p className="text-sm font-semibold" style={{ color: '#065F46' }}>
                    No open requests — clean handover!
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm border-collapse rounded-xl overflow-hidden"
                  style={{ border: '1px solid #E5E7EB' }}>
                  <thead>
                    <tr>
                      <Th>Bay</Th>
                      <Th>Request</Th>
                      <Th>Status</Th>
                      <Th>Waiting</Th>
                      <Th>Assigned To</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {openItems.map((r, i) => {
                      const label    = requestTypeMap[r.type]?.label ?? r.type
                      const bay      = r.room?.name ?? '—'
                      const assignee = r.acknowledger?.full_name
                      return (
                        <tr key={r.id}
                          style={{ background: i % 2 === 0 ? 'white' : '#F9FAFB', borderTop: '1px solid #F3F4F6' }}>
                          <td className="px-3 py-2.5">
                            <BayBadge bay={bay} variant="blue" />
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-medium" style={{ color: '#111827' }}>{label}</span>
                            {r.is_urgent && (
                              <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: '#FEE2E2', color: '#DC2626' }}>URGENT</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                              style={r.status === 'pending'
                                ? { background: '#FEE2E2', color: '#DC2626' }
                                : { background: '#DBEAFE', color: '#1D4ED8' }}>
                              {r.status === 'pending' ? 'Pending' : 'In Progress'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs" style={{ color: '#6B7280' }}>
                            {timeAgo(r.created_at)}
                          </td>
                          <td className="px-3 py-2.5 text-xs" style={{ color: '#374151' }}>
                            {assignee ?? (
                              <span className="italic" style={{ color: '#9CA3AF' }}>Unassigned</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </section>

            <div style={{ borderTop: '1px solid #F3F4F6' }} />

            {/* Resolved this shift */}
            <section className="px-6 py-5">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
                style={{ color: '#374151' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: '#059669' }} />
                Resolved This Shift
                <span className="font-mono text-[#9CA3AF]">({resolved.length})</span>
              </h3>

              {resolved.length === 0 ? (
                <p className="text-sm italic px-1" style={{ color: '#9CA3AF' }}>
                  No requests resolved yet today.
                </p>
              ) : (
                <table className="w-full text-sm border-collapse rounded-xl overflow-hidden"
                  style={{ border: '1px solid #E5E7EB' }}>
                  <thead>
                    <tr>
                      <Th>Bay</Th>
                      <Th>Request</Th>
                      <Th>Resolved By</Th>
                      <Th>Time</Th>
                      <Th>Wait</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolved.map((r, i) => {
                      const label    = requestTypeMap[r.type]?.label ?? r.type
                      const bay      = r.room?.name ?? '—'
                      const resolver = r.resolver?.full_name
                      const waitSec  = r.resolved_at
                        ? (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()) / 1000
                        : null
                      const waitLabel = waitSec === null ? '—'
                        : waitSec < 60 ? `${Math.round(waitSec)}s`
                        : `${Math.floor(waitSec / 60)}m`
                      return (
                        <tr key={r.id}
                          style={{ background: i % 2 === 0 ? 'white' : '#F9FAFB', borderTop: '1px solid #F3F4F6' }}>
                          <td className="px-3 py-2.5">
                            <BayBadge bay={bay} variant="green" />
                          </td>
                          <td className="px-3 py-2.5 font-medium" style={{ color: '#111827' }}>{label}</td>
                          <td className="px-3 py-2.5 text-xs" style={{ color: '#374151' }}>
                            {resolver ?? <span className="italic" style={{ color: '#9CA3AF' }}>—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-mono" style={{ color: '#6B7280' }}>
                            {r.resolved_at ? fmtTime(r.resolved_at) : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-xs" style={{ color: '#6B7280' }}>{waitLabel}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </section>

            {/* Staff activity */}
            {staffEvents.length > 0 && (
              <>
                <div style={{ borderTop: '1px solid #F3F4F6' }} />
                <section className="px-6 py-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
                    style={{ color: '#374151' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: '#3B82F6' }} />
                    Staff Activity
                  </h3>
                  <div className="space-y-1.5">
                    {staffEvents.map((e, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b last:border-b-0"
                        style={{ borderColor: '#F3F4F6' }}>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
                          style={{ background: '#3B82F6' }}>
                          {e.initials}
                        </div>
                        <span className="font-semibold" style={{ color: '#374151' }}>{e.name}</span>
                        <span style={{ color: '#6B7280' }}>—</span>
                        <span style={{ color: '#374151' }}>{e.action}</span>
                        <span className="ml-auto font-mono text-xs" style={{ color: '#9CA3AF' }}>
                          {fmtTime(e.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* Footer */}
            <div className="px-6 py-4 border-t text-center text-xs" style={{ borderColor: '#E5E7EB', color: '#9CA3AF' }}>
              Care Concierge · Shift Handover · {generatedBy} · {now.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
