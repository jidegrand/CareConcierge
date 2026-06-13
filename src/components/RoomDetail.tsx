import { useState } from 'react'
import { useResidents } from '@/hooks/useResidents'
import type { Resident } from '@/types'

interface RoomOption {
  roomId: string
  name: string
}

interface RoomDetailProps {
  roomId: string
  roomLabel: string
  tenantId: string | undefined
  rooms: RoomOption[]
  canManage: boolean
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatMoveInDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function RoomDetail({ roomId, roomLabel, tenantId, rooms, canManage }: RoomDetailProps) {
  const { residents, loading, createResident, assignToRoom, deactivateResident } = useResidents(tenantId)
  const [modal, setModal] = useState<'assign' | 'move' | 'deactivate' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentResident = residents.find(r => r.room_id === roomId && r.active) ?? null
  const otherRooms = rooms.filter(r => r.roomId !== roomId)

  const closeModal = () => { setModal(null); setError(null) }

  const runMutation = async (fn: () => Promise<{ success: boolean; error?: string }>) => {
    const result = await fn()
    if (!result.success) {
      setError(result.error ?? 'Something went wrong.')
      return false
    }
    closeModal()
    return true
  }

  if (loading) {
    return (
      <div className="px-4 py-4 border-t border-[var(--border)]">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Resident</p>
        <p className="text-xs text-[var(--text-muted)]">Loading…</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 border-t border-[var(--border)]">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Resident</p>

      {currentResident ? (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
              style={{ background: 'var(--clinical-blue)' }}>
              {initials(currentResident.display_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{currentResident.display_name}</p>
              <p className="text-xs text-[var(--text-muted)]">Move-in: {formatMoveInDate(currentResident.created_at)}</p>
            </div>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <button onClick={() => setModal('move')}
                className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--page-bg)] transition-colors">
                → Move
              </button>
              <button onClick={() => setModal('deactivate')}
                className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors"
                style={{ borderColor: 'var(--danger)', color: 'var(--danger)', background: 'var(--danger-lt)' }}>
                Deactivate
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-3">No resident assigned</p>
          {canManage && (
            <button onClick={() => setModal('assign')}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--page-bg)] transition-colors">
              + Assign resident
            </button>
          )}
        </div>
      )}

      {modal === 'assign' && (
        <AssignModal
          roomLabel={roomLabel}
          error={error}
          onClose={closeModal}
          onAssign={(name) => runMutation(() => createResident(name, roomId))}
        />
      )}

      {modal === 'move' && currentResident && (
        <MoveModal
          resident={currentResident}
          rooms={otherRooms}
          error={error}
          onClose={closeModal}
          onMove={(targetRoomId) => runMutation(() => assignToRoom(currentResident.id, targetRoomId))}
        />
      )}

      {modal === 'deactivate' && currentResident && (
        <DeactivateModal
          resident={currentResident}
          error={error}
          onClose={closeModal}
          onConfirm={() => runMutation(() => deactivateResident(currentResident.id))}
        />
      )}
    </div>
  )
}

// ── Modal shell ─────────────────────────────────────────────────────────────
function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-card w-full max-w-sm p-4"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-[var(--text-primary)]">{title}</p>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Assign / check-in modal ──────────────────────────────────────────────────
function AssignModal({ roomLabel, error, onClose, onAssign }: {
  roomLabel: string
  error: string | null
  onClose: () => void
  onAssign: (name: string) => Promise<boolean>
}) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setBusy(true)
    const ok = await onAssign(name.trim())
    if (!ok) setBusy(false)
  }

  return (
    <ModalShell title={`Assign resident to ${roomLabel}`} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)]">Resident name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Margaret H."
            autoFocus
            className="w-full mt-1 text-sm px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]" />
        </div>

        {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose}
            className="text-xs font-semibold px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={busy || !name.trim()}
            className="text-xs font-bold px-3 py-2 rounded-lg text-white disabled:opacity-50"
            style={{ background: 'var(--clinical-blue)' }}>
            {busy ? '…' : 'Assign'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

// ── Move modal ──────────────────────────────────────────────────────────────
function MoveModal({ resident, rooms, error, onClose, onMove }: {
  resident: Resident
  rooms: RoomOption[]
  error: string | null
  onClose: () => void
  onMove: (roomId: string) => Promise<boolean>
}) {
  return (
    <ModalShell title={`Move ${resident.display_name}`} onClose={onClose}>
      <div className="space-y-2">
        <p className="text-xs text-[var(--text-muted)]">Select a new room for this resident.</p>
        {rooms.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic">No other rooms available.</p>
        ) : (
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {rooms.map(r => (
              <li key={r.roomId}>
                <button onClick={() => onMove(r.roomId)}
                  className="w-full text-left text-sm px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--page-bg)] transition-colors">
                  {r.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
        <div className="flex justify-end">
          <button onClick={onClose}
            className="text-xs font-semibold px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

// ── Deactivate modal ────────────────────────────────────────────────────────
function DeactivateModal({ resident, error, onClose, onConfirm }: {
  resident: Resident
  error: string | null
  onClose: () => void
  onConfirm: () => Promise<boolean>
}) {
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    setBusy(true)
    const ok = await onConfirm()
    if (!ok) setBusy(false)
  }

  return (
    <ModalShell title="Deactivate Resident" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-[var(--text-secondary)]">
          Deactivate <span className="font-semibold">{resident.display_name}</span>? They will be removed from this room and marked inactive.
        </p>
        {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose}
            className="text-xs font-semibold px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors">
            Cancel
          </button>
          <button onClick={confirm} disabled={busy}
            className="text-xs font-bold px-3 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
            style={{ background: 'var(--danger)' }}>
            {busy ? '…' : 'Deactivate'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
