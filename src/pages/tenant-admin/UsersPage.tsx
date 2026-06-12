import { useState } from 'react'
import { useTenantContext } from '@/hooks/useTenantContext'
import { useTenantUsers } from '@/hooks/tenant/useTenantUsers'
import { useSites } from '@/hooks/useAdminData'

const ROLE_OPTIONS = [
  { value: 'tenant_admin', label: 'Organization Admin', description: 'Full access to organization settings' },
  { value: 'nurse_manager', label: 'Nurse Manager', description: 'Manage nursing staff and schedules' },
  { value: 'site_manager', label: 'Site Manager', description: 'Manage a specific location' },
  { value: 'charge_nurse', label: 'Charge Nurse', description: 'Manage nursing operations on shift' },
  { value: 'nurse', label: 'Nurse', description: 'Clinical staff' },
  { value: 'volunteer', label: 'Volunteer', description: 'Support staff' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access to reports' },
]

export default function UsersPage() {
  const { tenant } = useTenantContext()
  const { users, loading, inviting, saving, inviteUser, updateUserRole, deactivateUser } = useTenantUsers(tenant?.id || '')
  const { sites } = useSites(tenant?.id)

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'nurse', siteId: '', unitId: '' })
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [roleChangeError, setRoleChangeError] = useState<string | null>(null)

  const [filterRole, setFilterRole] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesRole = filterRole === 'all' || user.role === filterRole
    const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesRole && matchesSearch
  })

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError(null)
    setInviteSuccess(false)

    if (!inviteForm.email.trim()) {
      setInviteError('Email is required')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email)) {
      setInviteError('Invalid email address')
      return
    }

    const result = await inviteUser(
      inviteForm.email,
      inviteForm.role,
      inviteForm.siteId || undefined,
      inviteForm.unitId || undefined
    )

    if (result.success) {
      setInviteSuccess(true)
      setInviteForm({ email: '', role: 'nurse', siteId: '', unitId: '' })
      setTimeout(() => {
        setShowInviteModal(false)
        setInviteSuccess(false)
      }, 1500)
    } else {
      setInviteError(result.error || 'Failed to send invite')
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setRoleChangeError(null)
    const targetUser = users.find(u => u.id === userId)
    if (!targetUser || targetUser.role === newRole) {
      setEditingUserId(null)
      setEditingRole(null)
      return
    }

    if (targetUser.role === 'tenant_admin') {
      const activeAdminCount = users.filter(u => u.role === 'tenant_admin' && u.active).length
      if (activeAdminCount <= 1) {
        setRoleChangeError('Cannot change role: at least one Organization Admin is required.')
        return
      }
    }

    if (newRole === 'tenant_admin') {
      const confirmed = window.confirm(
        `Give ${targetUser.full_name || 'this user'} full Organization Admin access? They will be able to manage billing, users, and settings.`
      )
      if (!confirmed) return
    }

    const result = await updateUserRole(userId, newRole)
    if (result.success) {
      setEditingUserId(null)
      setEditingRole(null)
    } else {
      setRoleChangeError(result.error || 'Failed to update role')
    }
  }

  const handleDeactivate = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to deactivate ${userName}? They will no longer be able to log in.`)) {
      return
    }

    const result = await deactivateUser(userId)
    if (!result.success) {
      alert(`Error: ${result.error}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Staff Management</h1>
          <p className="text-[var(--text-secondary)]">Invite and manage team members</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 bg-[var(--clinical-blue)] text-white rounded-lg hover:opacity-90 transition flex items-center gap-2"
        >
          <span>➕</span>
          Invite User
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <div className="flex-1 min-w-64">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
          />
        </div>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
        >
          <option value="all">All Roles</option>
          {ROLE_OPTIONS.map(role => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>

      {roleChangeError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {roleChangeError}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[var(--text-secondary)]">No users found</p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="mt-3 text-[var(--clinical-blue)] hover:underline text-sm"
            >
              Invite your first team member
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--hover-bg)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Site</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className="border-b border-[var(--border)] hover:bg-[var(--hover-bg)] transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--text-primary)]">{user.full_name || 'Unnamed'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-[var(--text-secondary)]">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {editingUserId === user.id ? (
                        <div className="flex gap-2">
                          <select
                            value={editingRole || user.role}
                            onChange={e => setEditingRole(e.target.value)}
                            className="px-2 py-1 text-sm border border-[var(--border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
                          >
                            {ROLE_OPTIONS.map(role => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleRoleChange(user.id, editingRole || user.role)}
                            disabled={saving}
                            className="px-2 py-1 text-xs bg-[var(--clinical-blue)] text-white rounded hover:opacity-90 transition disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingUserId(null); setEditingRole(null); setRoleChangeError(null) }}
                            className="px-2 py-1 text-xs border border-[var(--border)] rounded hover:bg-[var(--hover-bg)] transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingUserId(user.id)}
                          className="text-sm text-[var(--clinical-blue)] hover:underline"
                        >
                          {ROLE_OPTIONS.find(r => r.value === user.role)?.label || user.role}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-[var(--text-secondary)]">{user.siteName || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeactivate(user.id, user.full_name || 'User')}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--surface)] rounded-lg p-6 max-w-md w-full border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Invite Team Member</h2>

            {inviteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {inviteError}
              </div>
            )}

            {inviteSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                ✓ Invitation sent successfully!
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Email Address</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="nurse@example.com"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
                >
                  {ROLE_OPTIONS.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {ROLE_OPTIONS.find(r => r.value === inviteForm.role)?.description}
                </p>
              </div>

              {sites && sites.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Site (Optional)</label>
                  <select
                    value={inviteForm.siteId}
                    onChange={e => setInviteForm({ ...inviteForm, siteId: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
                  >
                    <option value="">No site restriction</option>
                    {sites.map(site => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 px-4 py-2 bg-[var(--clinical-blue)] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {inviting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
