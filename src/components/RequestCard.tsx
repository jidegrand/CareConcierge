import { useEffect, useState } from 'react'
import { REQUEST_TYPE_MAP, timeAgo } from '@/lib/constants'
import RequestTypeIcon from '@/components/RequestTypeIcon'
import type { Request, RequestStatus } from '@/types'

interface Props {
  request: Request
  onAcknowledge?: () => void
  onResolve?: () => void
  isNew?: boolean
}

export default function RequestCard({ request, onAcknowledge, onResolve, isNew }: Props) {
  const [highlight, setHighlight] = useState(isNew ?? false)
  const [, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 15_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (isNew) {
      setHighlight(true)
      const t = setTimeout(() => setHighlight(false), 2500)
      return () => clearTimeout(t)
    }
  }, [isNew])

  const config = REQUEST_TYPE_MAP[request.type]
  if (!config) return null

  const ageSeconds = (Date.now() - new Date(request.created_at).getTime()) / 1000
  const isOverdue  = request.status === 'pending' && ageSeconds > 300

  // Status-based left accent
  const accentColor =
    request.status === 'resolved'    ? '#D1D9E0' :
    isOverdue                         ? '#DC2626' :
    request.status === 'pending'      ? '#EF4444' :
    /* acknowledged */                  '#D97706'

  // Row background
  const rowBg =
    highlight      ? '#F0FDF4' :
    isOverdue      ? '#FEF2F2' :
    request.status === 'resolved' ? 'var(--page-bg)' : 'var(--surface)'

  return (
    <div
      className={`relative flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all duration-300 ${
        highlight ? 'border-emerald-300' : 'border-[var(--border)]'
      }`}
      style={{ background: rowBg, borderLeftWidth: 4, borderLeftColor: accentColor }}
    >
      {/* Overdue badge */}
      {isOverdue && (
        <span className="absolute top-2 right-3 text-[10px] font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full uppercase tracking-wide animate-pulse">
          Overdue
        </span>
      )}

      {/* Type icon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
        style={{ background: config.color + '18' }}>
        <RequestTypeIcon
          icon={config.icon}
          label={config.label}
          className="text-xl"
          imageClassName="h-6 w-6 object-contain"
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {request.room?.name ?? 'Unknown room'}
          </span>
          {config.urgent && request.status !== 'resolved' && (
            <span className="text-[10px] font-semibold text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded uppercase tracking-wide">
              Urgent
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{config.label}</p>
      </div>

      {/* Time + status */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className={`font-mono text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-[var(--text-muted)]'}`}>
          {timeAgo(request.created_at)}
        </span>
        <StatusBadge status={request.status} />
      </div>

      {/* Actions */}
      {(onAcknowledge || onResolve) && (
        <div className="flex gap-2 flex-shrink-0 pl-1">
          {onAcknowledge && request.status === 'pending' && (
            <ActionBtn onClick={onAcknowledge} variant="ack" label="Acknowledge" />
          )}
          {onResolve && request.status !== 'resolved' && (
            <ActionBtn onClick={onResolve} variant="resolve" label="Resolve" />
          )}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const cfg: Record<RequestStatus, { bg: string; text: string; label: string }> = {
    pending:      { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Pending'      },
    acknowledged: { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'In Progress'  },
    resolved:     { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Resolved'     },
  }
  const c = cfg[status]
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

function ActionBtn({ onClick, variant, label }: { onClick: () => void; variant: 'ack' | 'resolve'; label: string }) {
  const styles = {
    ack:     'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100',
    resolve: 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100',
  }
  return (
    <button onClick={onClick}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap shadow-sm ${styles[variant]}`}>
      {label}
    </button>
  )
}
