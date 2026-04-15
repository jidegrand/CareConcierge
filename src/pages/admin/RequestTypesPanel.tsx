import { useRef, useMemo, useState } from 'react'
import { useRequestTypes, type ManagedRequestType } from '@/hooks/useRequestTypes'
import RequestTypeIcon, { isImageIcon } from '@/components/RequestTypeIcon'

interface Props {
  tenantId: string
}

interface FormState {
  label: string
  icon: string
  color: string
  urgent: boolean
}

const EMPTY_FORM: FormState = {
  label: '',
  icon: '',
  color: '#1D6FA8',
  urgent: false,
}

export default function RequestTypesPanel({ tenantId }: Props) {
  const {
    requestTypes,
    loading,
    error,
    setupRequired,
    createRequestType,
    updateRequestType,
    toggleRequestType,
    deleteRequestType,
  } = useRequestTypes(tenantId)

  const [modalType, setModalType] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<ManagedRequestType | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const activeCount = useMemo(
    () => requestTypes.filter(item => item.active && item.id !== 'nurse').length,
    [requestTypes]
  )

  const openCreate = () => {
    setEditing(null)
    setErr(null)
    setModalType('create')
  }

  const openEdit = (item: ManagedRequestType) => {
    setEditing(item)
    setErr(null)
    setModalType('edit')
  }

  const handleSubmit = async (values: FormState) => {
    setErr(null)
    try {
      if (modalType === 'create') {
        await createRequestType(values)
      } else if (modalType === 'edit' && editing) {
        await updateRequestType(editing.id, values)
      }
      setModalType(null)
      setEditing(null)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Unable to save request type.')
    }
  }

  const handleToggle = async (item: ManagedRequestType) => {
    try {
      await toggleRequestType(item.id, !item.active)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Unable to update request type.')
    }
  }

  const handleDelete = async (item: ManagedRequestType) => {
    const confirmed = window.confirm(`Delete "${item.label}"? Existing request history will remain, but this common request will no longer appear for patients.`)
    if (!confirmed) return

    try {
      await deleteRequestType(item.id)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Unable to delete request type.')
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">Common Requests</h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Add patient-facing request tiles with a label, icon, and urgency setting.
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={setupRequired}
          className="rounded-xl bg-[var(--clinical-blue)] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--clinical-blue-dk)]">
          + Add Request
        </button>
      </div>

      {setupRequired && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Run <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs">supabase/migrations/004_request_types.sql</code> in your Supabase SQL Editor, then refresh this page. The fallback list below is local-only until that table exists.
        </div>
      )}

      <div className="mb-4 grid grid-cols-3 gap-4">
        <StatCard label="Total Types" value={String(requestTypes.length)} color="#1D6FA8" />
        <StatCard label="Active Tiles" value={String(activeCount)} color="#059669" />
        <StatCard label="Urgent Types" value={String(requestTypes.filter(item => item.urgent).length)} color="#DC2626" />
      </div>

      {loading ? (
        <PanelLoading />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
          <div className="grid grid-cols-[1.1fr_120px_120px_120px_120px] gap-3 border-b border-[var(--border)] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            <span>Request</span>
            <span>Type ID</span>
            <span>Urgent</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          {requestTypes.map(item => (
            <div
              key={item.id}
              className="grid grid-cols-[1.1fr_120px_120px_120px_120px] gap-3 border-b border-[var(--border)] px-4 py-3 last:border-0">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border"
                  style={{ background: `${item.color}14`, borderColor: `${item.color}33` }}>
                  <RequestTypeIcon
                    icon={item.icon}
                    label={item.label}
                    className="text-xl"
                    imageClassName="h-7 w-7 object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.label}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {item.system ? 'System request' : 'Custom request'}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <code className="rounded bg-[var(--page-bg)] px-2 py-1 text-[11px] text-[var(--text-secondary)]">
                  {item.id}
                </code>
              </div>

              <div className="flex items-center">
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                  item.urgent ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {item.urgent ? 'Urgent' : 'Standard'}
                </span>
              </div>

              <div className="flex items-center">
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                  item.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {item.active ? 'Active' : 'Hidden'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => openEdit(item)}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--clinical-blue)] transition-colors hover:bg-[var(--clinical-blue-lt)]">
                  Edit
                </button>
                {item.id !== 'nurse' && (
                  <>
                    <button
                      onClick={() => handleToggle(item)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--page-bg)]">
                      {item.active ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50">
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {requestTypes.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-[var(--text-muted)]">
              No request types found yet.
            </div>
          )}
        </div>
      )}

      {(error || err) && !setupRequired && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err ?? error}
        </div>
      )}

      {modalType && (
        <RequestTypeModal
          title={modalType === 'create' ? 'Add Common Request' : 'Edit Common Request'}
          defaults={editing
            ? {
                label: editing.label,
                icon: editing.icon,
                color: editing.color,
                urgent: editing.urgent,
              }
            : EMPTY_FORM}
          error={err}
          onClose={() => {
            setModalType(null)
            setEditing(null)
            setErr(null)
          }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}

function RequestTypeModal({
  title,
  defaults,
  error,
  onClose,
  onSubmit,
}: {
  title: string
  defaults: FormState
  error: string | null
  onClose: () => void
  onSubmit: (values: FormState) => Promise<void>
}) {
  const [values, setValues] = useState<FormState>(defaults)
  const [saving, setSaving] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const uploadRef = useRef<HTMLInputElement | null>(null)
  const hasUploadedIcon = values.icon.startsWith('data:image/')

  const submit = async () => {
    setSaving(true)
    await onSubmit(values)
    setSaving(false)
  }

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file.')
      return
    }
    if (file.size > 256 * 1024) {
      setUploadError('Icon image must be 256 KB or smaller.')
      return
    }

    const dataUrl = await readFileAsDataUrl(file)
    setUploadError(null)
    setValues(prev => ({ ...prev, icon: dataUrl }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lift">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--page-bg)]">
            <CloseIcon />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-[1fr_88px] gap-3">
            <Field label="Label">
              <input
                value={values.label}
                onChange={e => setValues(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Ice Chips"
                className="w-full rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--clinical-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]/10"
              />
            </Field>

            <Field label="Icon">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    value={hasUploadedIcon ? '' : values.icon}
                    onChange={e => {
                      setUploadError(null)
                      setValues(prev => ({ ...prev, icon: e.target.value }))
                    }}
                    placeholder={hasUploadedIcon ? 'Uploaded image selected' : '🧊 or paste an image URL'}
                    className="min-w-0 flex-1 rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-center text-sm text-[var(--text-primary)] focus:border-[var(--clinical-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]/10"
                  />
                  <button
                    type="button"
                    onClick={() => uploadRef.current?.click()}
                    className="rounded-xl border border-[var(--clinical-blue)]/25 bg-[var(--clinical-blue-lt)] px-3 py-2 text-xs font-semibold text-[var(--clinical-blue)] transition-colors hover:bg-[#DDEEFF]">
                    Upload
                  </button>
                </div>
                <input
                  ref={uploadRef}
                  type="file"
                  accept="image/*"
                  onChange={handleIconUpload}
                  className="hidden"
                />
                <p className="text-[11px] text-[var(--text-muted)]">
                  Use an emoji, paste an image URL, or upload a small PNG, SVG, or JPG icon.
                </p>
                {isImageIcon(values.icon) && (
                  <p className="text-[11px] font-medium text-[var(--clinical-blue)]">
                    {hasUploadedIcon ? 'Uploaded image ready to save.' : 'Image icon preview ready to save.'}
                  </p>
                )}
              </div>
            </Field>
          </div>

          <Field label="Accent Color">
            <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2">
              <input
                type="color"
                value={values.color}
                onChange={e => setValues(prev => ({ ...prev, color: e.target.value }))}
                className="h-8 w-10 rounded border-0 bg-transparent p-0"
              />
              <input
                value={values.color}
                onChange={e => setValues(prev => ({ ...prev, color: e.target.value }))}
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] focus:outline-none"
              />
            </div>
          </Field>

          <label className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3.5 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Mark as urgent</p>
              <p className="text-xs text-[var(--text-muted)]">Use for requests that should appear with higher priority.</p>
            </div>
            <input
              type="checkbox"
              checked={values.urgent}
              onChange={e => setValues(prev => ({ ...prev, urgent: e.target.checked }))}
              className="h-4 w-4 rounded border-[var(--border)] text-[var(--clinical-blue)] focus:ring-[var(--clinical-blue)]"
            />
          </label>

          <div className="rounded-2xl border border-[#DCE8F3] p-4" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F7FBFF 100%)' }}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Preview</p>
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl border"
                style={{ background: `${values.color}14`, borderColor: `${values.color}33` }}>
                <RequestTypeIcon
                  icon={values.icon}
                  label={values.label || 'Request'}
                  className="text-xl"
                  imageClassName="h-7 w-7 object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{values.label || 'Request name'}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {values.urgent ? 'Urgent request tile' : 'Standard request tile'}
                </p>
              </div>
            </div>
          </div>

          {(uploadError || error) && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {uploadError ?? error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
          <button onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--page-bg)]">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-xl bg-[var(--clinical-blue)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--clinical-blue-dk)] disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
        {label}
      </label>
      {children}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  )
}

function PanelLoading() {
  return (
    <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
      <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-[var(--clinical-blue)] border-t-transparent" />
      <span className="text-sm">Loading…</span>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('Unable to read that icon file.'))
    reader.readAsDataURL(file)
  })
}
