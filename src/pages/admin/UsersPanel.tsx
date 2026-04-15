import { useState } from 'react'
import { useUsers } from '@/hooks/useAdminData'
import { useSites } from '@/hooks/useAdminData'
import type { UserWithMeta } from '@/hooks/useAdminData'

const ROLES = ['super_admin', 'nurse_manager', 'nurse', 'volunteer'] as const
type Role = typeof ROLES[number]

const ROLE_LABELS: Record<string, string> = {
  super_admin:   'Super Admin',
  nurse_manager: 'Nurse Manager',
  nurse:         'Nurse',
  volunteer:     'Volunteer',
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  super_admin:   { bg: '#EDE9FE', text: '#5B21B6' },
  nurse_manager: { bg: '#DBEAFE', text: '#1D4ED8' },
  nurse:         { bg: '#ECFDF5', text: '#065F46' },
  volunteer:     { bg: '#FEF3C7', text: '#92400E' },
}

interface Props { tenantId: string }

export default function UsersPanel({ tenantId }: Props) {
  const { users, loading, inviteUser, updateRole, removeUser } = useUsers(tenantId)
  const { sites } = useSites(tenantId)

  const [showInvite,  setShowInvite]  = useState(false)
  const [editUser,    setEditUser]    = useState<UserWithMeta | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole,  setInviteRole]  = useState<Role>('nurse')
  const [inviteUnit,  setInviteUnit]  = useState('')
  const [inviteSent,  setInviteSent]  = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [err,         setErr]         = useState<string | null>(null)

  // Flat list of all units across sites for selector
  const allUnits = sites.flatMap(s =>
    (s.units ?? []).map(u => ({ id: u.id, label: `${s.name} — ${u.name}` }))
  )

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setErr(null); setSaving(true)
    try {
      await inviteUser(inviteEmail.trim(), inviteRole, inviteUnit || null)
      setInviteSent(true)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Invite failed')
    }
    setSaving(false)
  }

  const handleUpdateRole = async () => {
    if (!editUser) return
    setErr(null); setSaving(true)
    try {
      await updateRole(editUser.id, editUser.role, editUser.unit_id)
      setEditUser(null)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Update failed')
    }
    setSaving(false)
  }

  const handleRemove = async (u: UserWithMeta) => {
    if (!confirm(`Remove ${u.email} from this tenant?`)) return
    try { await removeUser(u.id) } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Remove failed') }
  }

  if (loading) return <PanelLoading />

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">Users</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {users.length} user{users.length !== 1 ? 's' : ''} in this tenant
          </p>
        </div>
        <button onClick={() => { setShowInvite(true); setInviteSent(false); setInviteEmail('') }}
          className="px-3.5 py-2 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium hover:bg-[var(--clinical-blue-dk)] transition-colors">
          + Invite User
        </button>
      </div>

      {/* User table */}
      {users.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[var(--border)]">
          <p className="text-3xl mb-3">👥</p>
          <p className="font-medium text-[var(--text-secondary)]">No users yet</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Invite nurses to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--page-bg)]">
                {['User', 'Role', 'Unit', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.map(u => {
                const rc = ROLE_COLORS[u.role] ?? ROLE_COLORS.viewer
                return (
                  <tr key={u.id} className="hover:bg-[var(--page-bg)] transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--clinical-blue)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(u.full_name ?? u.id).slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {u.full_name ?? '—'}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] font-mono">
                            {u.id.slice(0, 8)}…
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: rc.bg, color: rc.text }}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-[var(--text-secondary)]">
                        {u.unit_name ?? <span className="text-[var(--text-muted)] italic">All units</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditUser({ ...u }); setErr(null) }}
                          className="text-xs font-medium text-[var(--clinical-blue)] hover:underline">
                          Edit
                        </button>
                        <span className="text-[var(--border)]">·</span>
                        <button onClick={() => handleRemove(u)}
                          className="text-xs font-medium text-red-500 hover:underline">
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-lift w-full max-w-md animate-bounce-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Invite User</h3>
              <button onClick={() => setShowInvite(false)} className="w-7 h-7 rounded-full hover:bg-[var(--page-bg)] flex items-center justify-center text-[var(--text-muted)] transition-colors">
                ✕
              </button>
            </div>

            {inviteSent ? (
              <div className="px-5 py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <p className="font-semibold text-[var(--text-primary)] mb-1">Invite sent!</p>
                <p className="text-sm text-[var(--text-muted)]">
                  A sign-in link was sent to <strong>{inviteEmail}</strong>.
                  They'll be prompted to set up their account on first login.
                </p>
                <button onClick={() => setShowInvite(false)}
                  className="mt-4 px-4 py-2 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Email address</label>
                    <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                      placeholder="nurse@scarboroughhealth.ca"
                      className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[var(--clinical-blue)] focus:ring-2 focus:ring-[var(--clinical-blue)]/10 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Role</label>
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value as Role)}
                      className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[var(--clinical-blue)] transition-all">
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Assign to unit <span className="text-[var(--text-muted)] normal-case">(optional)</span></label>
                    <select value={inviteUnit} onChange={e => setInviteUnit(e.target.value)}
                      className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[var(--clinical-blue)] transition-all">
                      <option value="">All units</option>
                      {allUnits.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                    </select>
                  </div>
                  {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
                </div>
                <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border)]">
                  <button onClick={() => setShowInvite(false)}
                    className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleInvite} disabled={saving || !inviteEmail.trim()}
                    className="px-4 py-2 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium disabled:opacity-50 hover:bg-[var(--clinical-blue-dk)] transition-colors">
                    {saving ? 'Sending…' : 'Send invite'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit role modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-lift w-full max-w-sm animate-bounce-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Edit User</h3>
              <button onClick={() => setEditUser(null)} className="w-7 h-7 rounded-full hover:bg-[var(--page-bg)] flex items-center justify-center text-[var(--text-muted)]">✕</button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Role</label>
                <select value={editUser.role}
                  onChange={e => setEditUser(u => u ? { ...u, role: e.target.value as Role } : u)}
                  className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[var(--clinical-blue)] transition-all">
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Unit</label>
                <select value={editUser.unit_id ?? ''}
                  onChange={e => setEditUser(u => u ? { ...u, unit_id: e.target.value || null } : u)}
                  className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[var(--clinical-blue)] transition-all">
                  <option value="">All units</option>
                  {allUnits.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                </select>
              </div>
              {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border)]">
              <button onClick={() => setEditUser(null)}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors">
                Cancel
              </button>
              <button onClick={handleUpdateRole} disabled={saving}
                className="px-4 py-2 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium disabled:opacity-50 hover:bg-[var(--clinical-blue-dk)] transition-colors">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PanelLoading() {
  return (
    <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
      <div className="w-5 h-5 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin mr-2" />
      <span className="text-sm">Loading users…</span>
    </div>
  )
}
