import { useState } from 'react'
import { useResidents } from '@/hooks/useResidents'
import { useFamilyMembers } from '@/hooks/useFamilyMembers'
import type { FamilyAccessLevel, FamilyMember, Resident } from '@/types'

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
  canAddNote: boolean
  onAddNote: (residentId: string, requestId: string | null, body: string, visibleToFamily: boolean, attachment?: File | null) => Promise<void>
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatMoveInDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function RoomDetail({ roomId, roomLabel, tenantId, rooms, canManage, canAddNote, onAddNote }: RoomDetailProps) {
  const { residents, loading, createResident, assignToRoom, deactivateResident } = useResidents(tenantId)
  const [modal, setModal] = useState<'assign' | 'move' | 'deactivate' | 'inviteFamily' | 'addNote' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [familyError, setFamilyError] = useState<string | null>(null)
  const [familyWarning, setFamilyWarning] = useState<string | null>(null)
  const [noteSent, setNoteSent] = useState(false)

  const currentResident = residents.find(r => r.room_id === roomId && r.active) ?? null
  const otherRooms = rooms.filter(r => r.roomId !== roomId)
  const { familyMembers, loading: familyLoading, inviteFamilyMember, revokeFamilyMember } = useFamilyMembers(currentResident?.id ?? null)

  const closeModal = () => { setModal(null); setError(null); setFamilyError(null) }

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

      {currentResident && (
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Family</p>
            {canManage && (
              <button onClick={() => setModal('inviteFamily')}
                className="text-xs font-semibold text-[var(--clinical-blue)] hover:underline">
                + Invite
              </button>
            )}
          </div>

          {familyLoading ? (
            <p className="text-xs text-[var(--text-muted)]">Loading…</p>
          ) : familyMembers.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No family members invited yet</p>
          ) : (
            <ul className="space-y-2">
              {familyMembers.map(fm => (
                <li key={fm.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{fm.full_name}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{fm.relationship ?? 'Family'} · {fm.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <FamilyStatusPill status={fm.status} />
                    {canManage && (
                      <button onClick={() => revokeFamilyMember(fm.id)}
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors">
                        Revoke
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {familyWarning && (
            <p className="text-xs mt-2" style={{ color: 'var(--clinical-blue)' }}>{familyWarning}</p>
          )}
        </div>
      )}

      {currentResident && canAddNote && (
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Notes</p>
            <button onClick={() => setModal('addNote')}
              className="text-xs font-semibold text-[var(--clinical-blue)] hover:underline">
              + Add Note
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {noteSent ? '✓ Note added' : "Share an update with this resident's family."}
          </p>
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

      {modal === 'inviteFamily' && currentResident && (
        <InviteFamilyModal
          residentName={currentResident.display_name}
          error={familyError}
          onClose={closeModal}
          onInvite={async (input) => {
            const result = await inviteFamilyMember(input)
            if (!result.success) {
              setFamilyError(result.error ?? 'Something went wrong.')
              return false
            }
            if (result.warning) setFamilyWarning(result.warning)
            closeModal()
            return true
          }}
        />
      )}

      {modal === 'addNote' && currentResident && (
        <AddNoteModal
          residentName={currentResident.display_name}
          onClose={closeModal}
          onSubmit={async (body, visibleToFamily, attachment) => {
            await onAddNote(currentResident.id, null, body, visibleToFamily, attachment)
            setModal(null)
            setNoteSent(true)
            window.setTimeout(() => setNoteSent(false), 3000)
          }}
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

// ── Family status pill ───────────────────────────────────────────────────────
function FamilyStatusPill({ status }: { status: FamilyMember['status'] }) {
  const cfg: Record<FamilyMember['status'], { label: string; color: string; bg: string }> = {
    invited: { label: 'Invited', color: 'var(--text-muted)', bg: 'var(--page-bg)' },
    active:  { label: 'Active',  color: 'var(--success)',    bg: 'var(--success-lt)' },
    revoked: { label: 'Revoked', color: 'var(--danger)',     bg: 'var(--danger-lt)' },
  }
  const c = cfg[status]
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ color: c.color, background: c.bg }}>
      {c.label}
    </span>
  )
}

// ── Invite family member modal ──────────────────────────────────────────────
function InviteFamilyModal({ residentName, error, onClose, onInvite }: {
  residentName: string
  error: string | null
  onClose: () => void
  onInvite: (input: { fullName: string; email: string; relationship?: string; accessLevel: FamilyAccessLevel }) => Promise<boolean>
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [relationship, setRelationship] = useState('')
  const [accessLevel, setAccessLevel] = useState<FamilyAccessLevel>('digest')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!fullName.trim() || !email.trim()) return
    setBusy(true)
    const ok = await onInvite({ fullName, email, relationship, accessLevel })
    if (!ok) setBusy(false)
  }

  return (
    <ModalShell title={`Invite family member for ${residentName}`} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)]">Full name</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)}
            placeholder="e.g. Margaret Hughes"
            autoFocus
            className="w-full mt-1 text-sm px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]" />
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)]">Email address</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email"
            placeholder="family@example.com"
            className="w-full mt-1 text-sm px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]" />
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)]">Relationship (optional)</label>
          <input value={relationship} onChange={e => setRelationship(e.target.value)}
            placeholder="e.g. Daughter"
            className="w-full mt-1 text-sm px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]" />
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)]">Access level</label>
          <div className="flex gap-2 mt-1">
            {(['digest', 'full'] as const).map(level => (
              <button key={level} type="button" onClick={() => setAccessLevel(level)}
                className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                  accessLevel === level
                    ? 'border-[var(--clinical-blue)] text-[var(--clinical-blue)]'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--page-bg)]'
                }`}>
                {level === 'digest' ? 'Digest only' : 'Full activity'}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose}
            className="text-xs font-semibold px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={busy || !fullName.trim() || !email.trim()}
            className="text-xs font-bold px-3 py-2 rounded-lg text-white disabled:opacity-50"
            style={{ background: 'var(--clinical-blue)' }}>
            {busy ? '…' : 'Send invite'}
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

// ── Add note modal ───────────────────────────────────────────────────────────
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10MB

export function AddNoteModal({ residentName, onClose, onSubmit }: {
  residentName: string
  onClose: () => void
  onSubmit: (body: string, visibleToFamily: boolean, attachment?: File | null) => Promise<void>
}) {
  const [body, setBody] = useState('')
  const [visibleToFamily, setVisibleToFamily] = useState(true)
  const [busy, setBusy] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)

  const pickFile = (file: File | null) => {
    setAttachmentError(null)

    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview)

    if (!file) {
      setAttachment(null)
      setAttachmentPreview(null)
      return
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      setAttachmentError('File must be smaller than 10MB')
      setAttachment(null)
      setAttachmentPreview(null)
      return
    }

    setAttachment(file)
    setAttachmentPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
  }

  const submit = async () => {
    if (!body.trim()) return
    setBusy(true)
    await onSubmit(body.trim(), visibleToFamily, attachment)
  }

  return (
    <ModalShell title={`Add note — ${residentName}`} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)]">Note</label>
          <textarea value={body} onChange={e => setBody(e.target.value)}
            placeholder="e.g. Enjoyed lunch in the dining room and joined the afternoon activity group."
            rows={4}
            autoFocus
            maxLength={1000}
            className="w-full mt-1 text-sm px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)] resize-none" />
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)]">Attachment (optional)</label>
          {attachment ? (
            <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)]">
              {attachmentPreview ? (
                <img src={attachmentPreview} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded bg-[var(--page-bg)] flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
              )}
              <span className="flex-1 min-w-0 text-xs text-[var(--text-secondary)] truncate">{attachment.name}</span>
              <button type="button" onClick={() => pickFile(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ) : (
            <label className="mt-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--page-bg)] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Add photo or file
              <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden"
                onChange={e => pickFile(e.target.files?.[0] ?? null)} />
            </label>
          )}
          {attachmentError && <p className="mt-1 text-[11px] text-[var(--danger)]">{attachmentError}</p>}
        </div>

        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={visibleToFamily} onChange={e => setVisibleToFamily(e.target.checked)}
            className="rounded border-[var(--border)]" />
          Visible to family in their activity feed
        </label>

        <div className="flex justify-end gap-2">
          <button onClick={onClose}
            className="text-xs font-semibold px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={busy || !body.trim()}
            className="text-xs font-bold px-3 py-2 rounded-lg text-white disabled:opacity-50"
            style={{ background: 'var(--clinical-blue)' }}>
            {busy ? '…' : 'Add note'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
