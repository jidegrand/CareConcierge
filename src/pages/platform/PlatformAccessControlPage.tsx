import { useMemo, useState } from 'react'
import { usePlatformAccess, useSites, useTenants, type PlatformAccessUser } from '@/hooks/useAdminData'
import { usePlatformContext } from '@/pages/platform/usePlatformContext'

const ALL_ROLES = [
  { value: 'super_admin',   label: 'Super Admin' },
  { value: 'tenant_admin',  label: 'Tenant Admin' },
  { value: 'nurse_manager', label: 'Nurse Manager' },
  { value: 'site_manager',  label: 'Site Manager' },
  { value: 'charge_nurse',  label: 'Charge Nurse' },
  { value: 'nurse',         label: 'Nurse' },
  { value: 'volunteer',     label: 'Volunteer' },
  { value: 'viewer',        label: 'Viewer' },
] as const

// Roles available to assign in the edit modal (excludes super_admin — use invite flow)
const EDIT_ROLES = ALL_ROLES.filter(r => r.value !== 'super_admin')

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function PlatformAccessControlPage() {
  const { selectedOrganizationId } = usePlatformContext()
  const { users, loading, error, updateAccess, inviteSuperAdmin } = usePlatformAccess(true)
  const { sites } = useSites(selectedOrganizationId)
  const { tenants } = useTenants(true)
  const [roleFilter, setRoleFilter] = useState<'all' | string>('all')
  const [search, setSearch] = useState('')
  const [editUser, setEditUser] = useState<PlatformAccessUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showAddSuperAdmin, setShowAddSuperAdmin] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteTenantId, setInviteTenantId] = useState('')
  const [inviteSent, setInviteSent] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter(user => (
      (!selectedOrganizationId || user.tenant_id === selectedOrganizationId) &&
      (roleFilter === 'all' || user.role === roleFilter) &&
      (!query || (user.full_name ?? '').toLowerCase().includes(query) || user.organizationName.toLowerCase().includes(query))
    ))
  }, [users, selectedOrganizationId, roleFilter, search])

  const counts = useMemo(() => ({
    superAdmins: users.filter(user => user.role === 'super_admin').length,
    admins: users.filter(user => user.role === 'tenant_admin' || user.role === 'nurse_manager' || user.role === 'site_manager').length,
    clinicians: users.filter(user => user.role === 'charge_nurse' || user.role === 'nurse').length,
    support: users.filter(user => user.role === 'volunteer' || user.role === 'viewer').length,
  }), [users])

  const unitOptions = sites.flatMap(site => (site.units ?? []).map(unit => ({
    id: unit.id,
    label: `${site.name} — ${unit.name}`,
  })))

  const handleSave = async () => {
    if (!editUser) return
    setSaving(true)
    setSaveError(null)
    setMessage(null)
    try {
      await updateAccess(editUser.id, {
        role: editUser.role,
        unit_id: editUser.role === 'super_admin' ? null : editUser.unit_id,
      })
      setMessage('Access updated.')
      setEditUser(null)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Unable to update access')
    }
    setSaving(false)
  }

  const handleInviteSuperAdmin = async () => {
    if (!inviteEmail.trim() || !inviteTenantId) return
    setInviting(true)
    setInviteError(null)
    try {
      await inviteSuperAdmin(inviteEmail.trim(), inviteTenantId)
      setInviteSent(true)
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Invite failed')
    }
    setInviting(false)
  }

  const openAddSuperAdmin = () => {
    setInviteEmail('')
    const extendiHealth = tenants.find(t => t.name.toLowerCase().includes('extendihealth'))
    setInviteTenantId(extendiHealth?.id ?? tenants[0]?.id ?? '')
    setInviteSent(false)
    setInviteError(null)
    setShowAddSuperAdmin(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">Access Control</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Manage platform administrators and organization access roles</p>
        </div>
        <button
          onClick={openAddSuperAdmin}
          className="px-3.5 py-2 rounded-xl bg-[#5B21B6] text-white text-sm font-medium hover:bg-[#4C1D95] transition-colors"
        >
          + Add Super Admin
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <AccessStat label="Super Admins" value={counts.superAdmins} color="#5B21B6" />
        <AccessStat label="Admins" value={counts.admins} color="#1D4ED8" />
        <AccessStat label="Clinicians" value={counts.clinicians} color="#059669" />
        <AccessStat label="Support" value={counts.support} color="#D97706" />
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or organization…"
            className="w-full max-w-xs border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[var(--clinical-blue)] transition-all"
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-[var(--text-muted)]">Role</span>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="min-w-[180px] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[var(--clinical-blue)] transition-all"
          >
            <option value="all">All roles</option>
            {ALL_ROLES.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
        </div>
      </div>

      {error && <Banner tone="error" message={error} />}
      {message && <Banner tone="success" message={message} />}

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        {loading ? (
          <PanelLoading label="Loading access roster…" />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--page-bg)] border-b border-[var(--border)]">
                {['User', 'Role', 'Organization', 'Unit', 'Joined', 'Actions'].map((header) => (
                  <th key={header} className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[var(--page-bg)]">
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{user.full_name ?? `User ${user.id.slice(0, 8)}`}</p>
                    <p className="text-xs text-[var(--text-muted)] font-mono">{user.id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-4 py-3.5"><RolePill role={user.role} /></td>
                  <td className="px-4 py-3.5 text-sm text-[var(--text-secondary)]">{user.organizationName}</td>
                  <td className="px-4 py-3.5 text-sm text-[var(--text-secondary)]">{user.unitName ?? 'All units'}</td>
                  <td className="px-4 py-3.5 text-xs text-[var(--text-muted)]">{fmtDate(user.created_at)}</td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => { setEditUser({ ...user }); setSaveError(null) }}
                      className="text-xs font-medium text-[var(--clinical-blue)] hover:underline"
                    >
                      Edit access
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-lift w-full max-w-md animate-bounce-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Add Super Admin</h3>
              <button onClick={() => setShowAddSuperAdmin(false)} className="w-7 h-7 rounded-full hover:bg-[var(--page-bg)] flex items-center justify-center text-[var(--text-muted)]">✕</button>
            </div>

            {inviteSent ? (
              <div className="px-5 py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5B21B6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <p className="font-semibold text-[var(--text-primary)] mb-1">Invite sent!</p>
                <p className="text-sm text-[var(--text-muted)]">
                  A sign-in link was sent to <strong>{inviteEmail}</strong>. They'll have Super Admin access on first login.
                </p>
                <button onClick={() => setShowAddSuperAdmin(false)}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#5B21B6] text-white text-sm font-medium hover:bg-[#4C1D95] transition-colors">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Email address</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="admin@example.com"
                      className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#5B21B6] focus:ring-2 focus:ring-[#5B21B6]/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Associated organization</label>
                    <select
                      value={inviteTenantId}
                      onChange={e => setInviteTenantId(e.target.value)}
                      className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[#5B21B6] transition-all"
                    >
                      <option value="">Select organization…</option>
                      {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  {inviteError && <Banner tone="error" message={inviteError} />}
                </div>
                <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border)]">
                  <button onClick={() => setShowAddSuperAdmin(false)}
                    className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleInviteSuperAdmin}
                    disabled={inviting || !inviteEmail.trim() || !inviteTenantId}
                    className="px-4 py-2 rounded-xl bg-[#5B21B6] text-white text-sm font-medium disabled:opacity-50 hover:bg-[#4C1D95] transition-colors"
                  >
                    {inviting ? 'Sending…' : 'Send invite'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-lift w-full max-w-md animate-bounce-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Edit Access</h3>
              <button onClick={() => setEditUser(null)} className="w-7 h-7 rounded-full hover:bg-[var(--page-bg)] flex items-center justify-center text-[var(--text-muted)]">✕</button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">User</label>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--page-bg)] px-3.5 py-2.5 text-sm text-[var(--text-secondary)]">
                  {editUser.full_name ?? `User ${editUser.id.slice(0, 8)}`} — {editUser.organizationName}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Role</label>
                {editUser.role === 'super_admin' ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--page-bg)] px-3.5 py-2.5 text-sm text-[var(--text-secondary)]">
                      Super Admin
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">Use invite flow to change</span>
                  </div>
                ) : (
                  <select
                    value={editUser.role}
                    onChange={(event) => setEditUser(current => current ? { ...current, role: event.target.value } : current)}
                    className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[var(--clinical-blue)] transition-all"
                  >
                    {EDIT_ROLES.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Unit scope</label>
                <select
                  value={editUser.unit_id ?? ''}
                  onChange={(event) => setEditUser(current => current ? { ...current, unit_id: event.target.value || null } : current)}
                  disabled={editUser.role === 'super_admin'}
                  className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-white disabled:bg-[var(--page-bg)] focus:outline-none focus:border-[var(--clinical-blue)] transition-all"
                >
                  <option value="">All units</option>
                  {unitOptions.map(unit => <option key={unit.id} value={unit.id}>{unit.label}</option>)}
                </select>
              </div>
              {saveError && <Banner tone="error" message={saveError} />}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border)]">
              <button onClick={() => setEditUser(null)}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium disabled:opacity-50 hover:bg-[var(--clinical-blue-dk)] transition-colors">
                {saving ? 'Saving…' : 'Save access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AccessStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4">
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-[var(--text-muted)] mt-1">{label}</p>
    </div>
  )
}

function RolePill({ role }: { role: string }) {
  const labels: Record<string, { bg: string; text: string; label: string }> = {
    super_admin:  { bg: '#EDE9FE', text: '#5B21B6', label: 'Super Admin' },
    tenant_admin: { bg: '#EDE9FE', text: '#5B21B6', label: 'Tenant Admin' },
    nurse_manager:{ bg: '#DBEAFE', text: '#1D4ED8', label: 'Nurse Manager' },
    site_manager: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Site Manager' },
    charge_nurse: { bg: '#ECFDF5', text: '#065F46', label: 'Charge Nurse' },
    nurse:        { bg: '#ECFDF5', text: '#065F46', label: 'Nurse' },
    volunteer:    { bg: '#FEF3C7', text: '#92400E', label: 'Volunteer' },
    viewer:       { bg: '#E5E7EB', text: '#374151', label: 'Viewer' },
  }
  const config = labels[role] ?? { bg: '#E5E7EB', text: '#374151', label: role }
  return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: config.bg, color: config.text }}>{config.label}</span>
}

function Banner({ tone, message }: { tone: 'error' | 'success'; message: string }) {
  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
      {message}
    </div>
  )
}

function PanelLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
      <div className="w-5 h-5 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin mr-2" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
