import { useMemo, useState } from 'react'
import { slugify } from '@/lib/utils'
import type { OrganizationWithStats } from '@/hooks/useAdminData'

type ModalState =
  | { kind: 'create' }
  | { kind: 'edit'; organization: OrganizationWithStats }
  | null

interface Props {
  selectedOrganizationId: string | undefined
  onSelectOrganization: (organizationId: string) => void
  organizations: OrganizationWithStats[]
  loading: boolean
  error: string | null
  createOrganization: (name: string, slug?: string) => Promise<void>
  updateOrganization: (id: string, name: string, slug: string) => Promise<void>
  deleteOrganization: (id: string) => Promise<void>
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function OrganizationsPanel({
  selectedOrganizationId,
  onSelectOrganization,
  organizations,
  loading,
  error,
  createOrganization,
  updateOrganization,
  deleteOrganization,
}: Props) {
  const [modal, setModal] = useState<ModalState>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<OrganizationWithStats | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const totals = useMemo(() => organizations.reduce((acc, organization) => ({
    organizations: acc.organizations + 1,
    sites: acc.sites + organization.siteCount,
    units: acc.units + organization.unitCount,
    rooms: acc.rooms + organization.roomCount,
    users: acc.users + organization.userCount,
  }), {
    organizations: 0,
    sites: 0,
    units: 0,
    rooms: 0,
    users: 0,
  }), [organizations])

  const filteredOrganizations = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return organizations
    return organizations.filter(
      (org) => org.name.toLowerCase().includes(query) || org.slug.toLowerCase().includes(query),
    )
  }, [organizations, search])

  const handleSubmit = async (values: { name: string; slug: string }) => {
    setSaving(true)
    setFormError(null)
    try {
      if (modal?.kind === 'create') await createOrganization(values.name, values.slug)
      if (modal?.kind === 'edit') await updateOrganization(modal.organization.id, values.name, values.slug)
      setModal(null)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Unable to save organization')
    }
    setSaving(false)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteOrganization(deleteTarget.id)
      if (selectedOrganizationId === deleteTarget.id && organizations.length > 1) {
        const fallback = organizations.find((entry) => entry.id !== deleteTarget.id)
        if (fallback) onSelectOrganization(fallback.id)
      }
      setDeleteTarget(null)
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Unable to delete organization')
    }
    setDeleting(false)
  }

  if (loading) return <PanelLoading label="Loading organizations…" />

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">Organizations</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Global operating directory for hospitals and care facilities on Care Concierge
          </p>
        </div>
        <button
          onClick={() => { setModal({ kind: 'create' }); setFormError(null) }}
          className="px-3.5 py-2 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium hover:bg-[var(--clinical-blue-dk)] transition-colors"
        >
          + Add Organization
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <SummaryCard label="Organizations" value={totals.organizations} color="#5B21B6" />
        <SummaryCard label="Sites" value={totals.sites} color="#1D6FA8" />
        <SummaryCard label="Units" value={totals.units} color="#D97706" />
        <SummaryCard label="Rooms" value={totals.rooms} color="#0891B2" />
        <SummaryCard label="Users" value={totals.users} color="#059669" />
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {organizations.length > 0 && (
        <div className="mb-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or slug…"
            className="w-full max-w-xs border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[var(--clinical-blue)] transition-all"
          />
        </div>
      )}

      {organizations.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
          <p className="text-3xl mb-3">🏥</p>
          <p className="font-medium text-[var(--text-secondary)]">No organizations yet</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Create the first hospital or care facility to get started.</p>
        </div>
      ) : filteredOrganizations.length === 0 ? (
        <div className="text-center py-12 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
          <p className="font-medium text-[var(--text-secondary)]">No results for "{search}"</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Try a different name or slug.</p>
        </div>
      ) : (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--page-bg)]">
                {['Organization', 'Slug', 'Footprint', 'Catalog', 'Created', 'Actions'].map((header) => (
                  <th key={header} className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredOrganizations.map((organization) => {
                const selected = organization.id === selectedOrganizationId
                return (
                  <tr key={organization.id} className={selected ? 'bg-[var(--clinical-blue-lt)]/40' : 'hover:bg-[var(--page-bg)]'}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {selected && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)] uppercase tracking-wider flex-shrink-0">
                            Active
                          </span>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{organization.name}</p>
                          <p className="text-xs text-[var(--text-muted)] font-mono">{organization.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--page-bg)] text-[var(--text-secondary)]">
                        {organization.slug}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-[var(--text-secondary)]">
                        {organization.siteCount} site{organization.siteCount !== 1 ? 's' : ''} · {organization.unitCount} unit{organization.unitCount !== 1 ? 's' : ''} · {organization.roomCount} room{organization.roomCount !== 1 ? 's' : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-[var(--text-secondary)]">
                        {organization.userCount} user{organization.userCount !== 1 ? 's' : ''} · {organization.requestTypeCount} type{organization.requestTypeCount !== 1 ? 's' : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-[var(--text-muted)]">{fmtDate(organization.created_at)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectOrganization(organization.id)}
                          className="text-xs font-medium text-[var(--clinical-blue)] hover:underline"
                        >
                          {selected ? 'Selected' : 'Manage'}
                        </button>
                        <span className="text-[var(--border)]">·</span>
                        <button
                          onClick={() => { setModal({ kind: 'edit', organization }); setFormError(null) }}
                          className="text-xs font-medium text-[var(--clinical-blue)] hover:underline"
                        >
                          Edit
                        </button>
                        <span className="text-[var(--border)]">·</span>
                        <button
                          onClick={() => { setDeleteTarget(organization); setDeleteError(null) }}
                          className="text-xs font-medium text-red-500 hover:underline"
                        >
                          Delete
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

      {modal && (
        <OrganizationModal
          title={modal.kind === 'create' ? 'Add Organization' : 'Edit Organization'}
          defaultName={modal.kind === 'edit' ? modal.organization.name : ''}
          defaultSlug={modal.kind === 'edit' ? modal.organization.slug : ''}
          error={formError}
          saving={saving}
          onClose={() => { setModal(null); setFormError(null) }}
          onSubmit={handleSubmit}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-lift w-full max-w-md animate-bounce-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Delete Organization</h3>
              <button
                onClick={() => setDeleteTarget(null)}
                className="w-7 h-7 rounded-full hover:bg-[var(--page-bg)] flex items-center justify-center text-[var(--text-muted)] transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="px-5 py-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Delete "{deleteTarget.name}"?
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                    This will permanently remove the organization and all its sites, units, rooms, request types, and users. This action cannot be undone.
                  </p>
                  {deleteTarget.userCount > 0 && (
                    <p className="mt-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      Warning: {deleteTarget.userCount} user{deleteTarget.userCount !== 1 ? 's' : ''} will lose access immediately.
                    </p>
                  )}
                </div>
              </div>
              {deleteError && (
                <p className="mt-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deleteError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border)]">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-red-700 transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete organization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4">
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-[var(--text-muted)] mt-1">{label}</p>
    </div>
  )
}

function OrganizationModal({
  title,
  defaultName,
  defaultSlug,
  error,
  saving,
  onClose,
  onSubmit,
}: {
  title: string
  defaultName: string
  defaultSlug: string
  error: string | null
  saving: boolean
  onClose: () => void
  onSubmit: (values: { name: string; slug: string }) => void
}) {
  const [name, setName] = useState(defaultName)
  const [slug, setSlug] = useState(defaultSlug)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(Boolean(defaultSlug))

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slugManuallyEdited) {
      setSlug(slugify(value))
    }
  }

  const handleSlugChange = (value: string) => {
    setSlug(value)
    setSlugManuallyEdited(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-lift w-full max-w-md animate-bounce-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-[var(--page-bg)] flex items-center justify-center text-[var(--text-muted)] transition-colors">
            ✕
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Organization name</label>
            <input
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="ExtendiHealth East Hospital"
              className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[var(--clinical-blue)] focus:ring-2 focus:ring-[var(--clinical-blue)]/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Subdomain slug
              {!slugManuallyEdited && name.trim() && (
                <span className="ml-2 font-normal text-[var(--text-muted)] normal-case">auto-generated</span>
              )}
            </label>
            <input
              value={slug}
              onChange={(event) => handleSlugChange(event.target.value)}
              placeholder="east-hospital"
              className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[var(--clinical-blue)] focus:ring-2 focus:ring-[var(--clinical-blue)]/10 transition-all"
            />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border)]">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSubmit({ name, slug })}
            disabled={saving || !name.trim()}
            className="px-4 py-2 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium disabled:opacity-50 hover:bg-[var(--clinical-blue-dk)] transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
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
