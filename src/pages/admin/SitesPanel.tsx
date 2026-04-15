import { useState } from 'react'
import { useSites, type SiteWithUnits, type UnitWithRooms } from '@/hooks/useAdminData'
import type { Room } from '@/types'

interface Props { tenantId: string }

type ModalState =
  | { kind: 'create-site' }
  | { kind: 'edit-site';   id: string; name: string }
  | { kind: 'create-unit'; siteId: string; siteName: string }
  | { kind: 'edit-unit';   id: string; name: string }
  | { kind: 'create-room'; unitId: string; unitName: string }
  | { kind: 'edit-room';   id: string; name: string; label: string }
  | null

export default function SitesPanel({ tenantId }: Props) {
  const ops = useSites(tenantId)
  const [modal, setModal]     = useState<ModalState>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [err, setErr]         = useState<string | null>(null)

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleSubmit = async (values: Record<string, string>) => {
    setErr(null)
    try {
      if (!modal) return
      if (modal.kind === 'create-site')  await ops.createSite(values.name)
      if (modal.kind === 'edit-site')    await ops.updateSite(modal.id, values.name)
      if (modal.kind === 'create-unit')  await ops.createUnit(modal.siteId, values.name)
      if (modal.kind === 'edit-unit')    await ops.updateUnit(modal.id, values.name)
      if (modal.kind === 'create-room')  await ops.createRoom(modal.unitId, values.name, values.label)
      if (modal.kind === 'edit-room')    await ops.updateRoom(modal.id, values.name, values.label)
      setModal(null)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  const handleDelete = async (kind: string, id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will also remove all nested records.`)) return
    try {
      if (kind === 'site') await ops.deleteSite(id)
      if (kind === 'unit') await ops.deleteUnit(id)
      if (kind === 'room') await ops.deleteRoom(id)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  if (ops.loading) return <PanelLoading />

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">Sites & Rooms</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Manage campuses, wards, and patient bays
          </p>
        </div>
        <Btn onClick={() => setModal({ kind: 'create-site' })} primary>+ Add Site</Btn>
      </div>

      {ops.sites.length === 0 ? (
        <Empty icon="🏥" text="No sites yet" sub='Click "Add Site" to create your first campus' />
      ) : (
        <div className="space-y-3">
          {ops.sites.map(site => (
            <SiteRow key={site.id} site={site}
              expanded={expanded.has(site.id)}
              onToggle={() => toggle(site.id)}
              onEdit={() => setModal({ kind: 'edit-site', id: site.id, name: site.name })}
              onDelete={() => handleDelete('site', site.id, site.name)}
              onAddUnit={() => setModal({ kind: 'create-unit', siteId: site.id, siteName: site.name })}
              onEditUnit={(u) => setModal({ kind: 'edit-unit', id: u.id, name: u.name })}
              onDeleteUnit={(u) => handleDelete('unit', u.id, u.name)}
              onAddRoom={(u) => setModal({ kind: 'create-room', unitId: u.id, unitName: u.name })}
              onEditRoom={(r) => setModal({ kind: 'edit-room', id: r.id, name: r.name, label: r.label ?? r.name })}
              onToggleRoom={(r) => ops.toggleRoom(r.id, !r.active)}
              onDeleteRoom={(r) => handleDelete('room', r.id, r.name)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <Modal
          title={modalTitle(modal)}
          fields={modalFields(modal)}
          defaults={modalDefaults(modal)}
          error={err}
          onSubmit={handleSubmit}
          onClose={() => { setModal(null); setErr(null) }}
        />
      )}
    </div>
  )
}

// ── Site row ──────────────────────────────────────────────────────────────────
function SiteRow({ site, expanded, onToggle, onEdit, onDelete, onAddUnit,
  onEditUnit, onDeleteUnit, onAddRoom, onEditRoom, onToggleRoom, onDeleteRoom
}: {
  site: SiteWithUnits
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onAddUnit: () => void
  onEditUnit: (u: UnitWithRooms) => void
  onDeleteUnit: (u: UnitWithRooms) => void
  onAddRoom: (u: UnitWithRooms) => void
  onEditRoom: (r: Room) => void
  onToggleRoom: (r: Room) => void
  onDeleteRoom: (r: Room) => void
}) {
  const unitCount = site.units?.length ?? 0
  const roomCount = site.units?.reduce((a, u) => a + (u.rooms?.length ?? 0), 0) ?? 0

  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
      {/* Site header */}
      <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-[var(--page-bg)] transition-colors"
        onClick={onToggle}>
        <div className="w-8 h-8 rounded-lg bg-[var(--clinical-blue-lt)] flex items-center justify-center flex-shrink-0">
          <SiteIcon />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[var(--text-primary)]">{site.name}</p>
          <p className="text-xs text-[var(--text-muted)]">
            {unitCount} unit{unitCount !== 1 ? 's' : ''} · {roomCount} room{roomCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <IconBtn title="Edit site"   onClick={onEdit}   icon={<EditIcon />} />
          <IconBtn title="Delete site" onClick={onDelete} icon={<TrashIcon />} danger />
          <IconBtn title="Add unit"    onClick={onAddUnit} icon={<PlusIcon />} />
        </div>
        <ChevronIcon open={expanded} />
      </div>

      {/* Units */}
      {expanded && (
        <div className="border-t border-[var(--border)]">
          {(site.units ?? []).length === 0 ? (
            <div className="px-6 py-4 text-xs text-[var(--text-muted)] italic">
              No units — click + to add one
            </div>
          ) : (
            (site.units ?? []).map(unit => (
              <UnitRow key={unit.id} unit={unit}
                onEdit={() => onEditUnit(unit)}
                onDelete={() => onDeleteUnit(unit)}
                onAddRoom={() => onAddRoom(unit)}
                onEditRoom={onEditRoom}
                onToggleRoom={onToggleRoom}
                onDeleteRoom={onDeleteRoom}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Unit row ──────────────────────────────────────────────────────────────────
function UnitRow({ unit, onEdit, onDelete, onAddRoom, onEditRoom, onToggleRoom, onDeleteRoom }: {
  unit: UnitWithRooms
  onEdit: () => void
  onDelete: () => void
  onAddRoom: () => void
  onEditRoom: (r: Room) => void
  onToggleRoom: (r: Room) => void
  onDeleteRoom: (r: Room) => void
}) {
  const [open, setOpen] = useState(true)
  const rooms = unit.rooms ?? []

  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <div className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-[var(--page-bg)] transition-colors"
        onClick={() => setOpen(o => !o)}>
        <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center flex-shrink-0">
          <UnitIcon />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{unit.name}</p>
          <p className="text-xs text-[var(--text-muted)]">{rooms.length} room{rooms.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <IconBtn title="Edit unit"   onClick={onEdit}    icon={<EditIcon />} small />
          <IconBtn title="Delete unit" onClick={onDelete}  icon={<TrashIcon />} small danger />
          <IconBtn title="Add room"    onClick={onAddRoom} icon={<PlusIcon />} small />
        </div>
        <ChevronIcon open={open} small />
      </div>

      {open && (
        <div className="pl-10 pr-4 pb-3">
          {rooms.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic px-2 py-1">No rooms yet</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {rooms.map(r => (
                <RoomChip key={r.id} room={r}
                  onEdit={() => onEditRoom(r)}
                  onToggle={() => onToggleRoom(r)}
                  onDelete={() => onDeleteRoom(r)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Room chip ─────────────────────────────────────────────────────────────────
function RoomChip({ room, onEdit, onToggle, onDelete }: {
  room: Room
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-all ${
      room.active
        ? 'bg-[var(--clinical-blue-lt)] border-[var(--clinical-blue)]/20'
        : 'bg-[var(--page-bg)] border-[var(--border)] opacity-60'
    }`}>
      <span className="font-semibold text-[var(--clinical-blue)] truncate max-w-[60px]" title={room.name}>
        {room.name}
      </span>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onToggle} title={room.active ? 'Deactivate' : 'Activate'}
          className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--clinical-blue)] transition-colors">
          {room.active ? <EyeIcon /> : <EyeOffIcon />}
        </button>
        <button onClick={onEdit} title="Edit room"
          className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--clinical-blue)] transition-colors">
          <EditIcon size={10} />
        </button>
        <button onClick={onDelete} title="Delete room"
          className="p-0.5 rounded text-[var(--text-muted)] hover:text-red-500 transition-colors">
          <TrashIcon size={10} />
        </button>
      </div>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, fields, defaults, error, onSubmit, onClose }: {
  title: string
  fields: { key: string; label: string; placeholder?: string }[]
  defaults: Record<string, string>
  error: string | null
  onSubmit: (v: Record<string, string>) => void
  onClose: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>(defaults)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    await onSubmit(values)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-lift w-full max-w-md animate-bounce-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-[var(--page-bg)] flex items-center justify-center text-[var(--text-muted)] transition-colors">
            <CloseIcon />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                {f.label}
              </label>
              <input
                value={values[f.key] ?? ''}
                onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--clinical-blue)] focus:ring-2 focus:ring-[var(--clinical-blue)]/10 transition-all" />
            </div>
          ))}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border)]">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium hover:bg-[var(--clinical-blue-dk)] transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
function modalTitle(m: NonNullable<ModalState>): string {
  const map: Record<string, string> = {
    'create-site': 'Add Site', 'edit-site': 'Edit Site',
    'create-unit': 'Add Unit', 'edit-unit': 'Edit Unit',
    'create-room': 'Add Room', 'edit-room': 'Edit Room',
  }
  return map[m.kind] ?? ''
}

function modalFields(m: NonNullable<ModalState>) {
  if (m.kind === 'create-room' || m.kind === 'edit-room') {
    return [
      { key: 'name',  label: 'Room name',  placeholder: 'Bay 1' },
      { key: 'label', label: 'Print label', placeholder: 'ED Bay 1 (optional)' },
    ]
  }
  return [{ key: 'name', label: 'Name', placeholder: 'Enter name' }]
}

function modalDefaults(m: NonNullable<ModalState>): Record<string, string> {
  if (m.kind === 'edit-site')  return { name: m.name }
  if (m.kind === 'edit-unit')  return { name: m.name }
  if (m.kind === 'edit-room')  return { name: m.name, label: m.label }
  return {}
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Btn({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick}
      className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
        primary
          ? 'bg-[var(--clinical-blue)] text-white hover:bg-[var(--clinical-blue-dk)]'
          : 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--page-bg)]'
      }`}>
      {children}
    </button>
  )
}

function IconBtn({ onClick, icon, title, small, danger }: {
  onClick: () => void; icon: React.ReactNode; title?: string; small?: boolean; danger?: boolean
}) {
  return (
    <button onClick={onClick} title={title}
      className={`rounded-lg flex items-center justify-center transition-colors ${
        small ? 'w-6 h-6' : 'w-7 h-7'
      } ${danger
        ? 'text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50'
        : 'text-[var(--text-muted)] hover:text-[var(--clinical-blue)] hover:bg-[var(--clinical-blue-lt)]'
      }`}>
      {icon}
    </button>
  )
}

function Empty({ icon, text, sub }: { icon: string; text: string; sub: string }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-[var(--border)]">
      <p className="text-3xl mb-3">{icon}</p>
      <p className="font-medium text-[var(--text-secondary)]">{text}</p>
      <p className="text-sm text-[var(--text-muted)] mt-1">{sub}</p>
    </div>
  )
}

function PanelLoading() {
  return (
    <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
      <div className="w-5 h-5 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin mr-2" />
      <span className="text-sm">Loading…</span>
    </div>
  )
}

function ChevronIcon({ open, small }: { open: boolean; small?: boolean }) {
  const s = small ? 12 : 14
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      className={`text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

const mk = (size = 14) => (d: React.ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">{d}</svg>
)

const SiteIcon  = () => mk(14)(<><rect x="3" y="9" width="18" height="12" rx="2"/><path d="M3 9l9-6 9 6"/></>)
const UnitIcon  = () => mk(12)(<><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>)
const PlusIcon  = () => mk(14)(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>)
const EditIcon  = ({ size = 13 }: { size?: number }) => mk(size)(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>)
const TrashIcon = ({ size = 13 }: { size?: number }) => mk(size)(<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></>)
const EyeIcon   = () => mk(12)(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>)
const EyeOffIcon = () => mk(12)(<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>)
const CloseIcon = () => mk(14)(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>)
