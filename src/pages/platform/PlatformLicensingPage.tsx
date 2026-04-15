import { useEffect, useMemo, useState } from 'react'
import { useTenantLicenses, type TenantLicenseRecord } from '@/hooks/useAdminData'
import { usePlatformContext } from '@/pages/platform/usePlatformContext'

type LicenseStatus = TenantLicenseRecord['status']
type LicensePlan = TenantLicenseRecord['plan']

export default function PlatformLicensingPage() {
  const { selectedOrganizationId, setSelectedOrganizationId } = usePlatformContext()
  const { licenses, loading, error, saveLicense, deleteLicense } = useTenantLicenses(true)
  const selectedLicense = licenses.find(entry => entry.tenant_id === selectedOrganizationId) ?? licenses[0]

  const counts = useMemo(() => ({
    active: licenses.filter(entry => entry.status === 'active').length,
    trial: licenses.filter(entry => entry.status === 'trial').length,
    suspended: licenses.filter(entry => entry.status === 'suspended').length,
    archived: licenses.filter(entry => entry.status === 'archived').length,
  }), [licenses])

  return (
    <div>
      <div className="mb-5">
        <h3 className="text-base font-bold text-[var(--text-primary)]">Licensing</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">Manage activation status, plans, capacity limits, and organization entitlements</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Active" value={counts.active} color="#059669" />
        <StatCard label="Trial" value={counts.trial} color="#1D6FA8" />
        <StatCard label="Suspended" value={counts.suspended} color="#DC2626" />
        <StatCard label="Archived" value={counts.archived} color="#6B7280" />
      </div>

      {error && <Banner tone="error" message={error} />}

      <div className="grid grid-cols-[1.1fr,1.2fr] gap-4">
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <p className="text-sm font-bold text-[var(--text-primary)]">Organization Licenses</p>
          </div>
          {loading ? (
            <PanelLoading label="Loading licenses…" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--page-bg)] border-b border-[var(--border)]">
                  {['Organization', 'Plan', 'Status', 'Expires'].map((header) => (
                    <th key={header} className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {licenses.map((license) => (
                  <tr
                    key={license.tenant_id}
                    className={`${license.tenant_id === selectedLicense?.tenant_id ? 'bg-[var(--clinical-blue-lt)]/40' : 'hover:bg-[var(--page-bg)]'} cursor-pointer`}
                    onClick={() => setSelectedOrganizationId(license.tenant_id)}
                  >
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{license.organizationName}</p>
                      <p className="text-xs text-[var(--text-muted)]">{license.organizationSlug}</p>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[var(--text-secondary)] capitalize">{license.plan}</td>
                    <td className="px-4 py-3.5">
                      <StatusPill status={license.status} />
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[var(--text-secondary)]">{license.expires_at ?? 'Open-ended'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <LicenseEditor
          license={selectedLicense}
          onSave={saveLicense}
          onDelete={deleteLicense}
        />
      </div>
    </div>
  )
}

function LicenseEditor({
  license,
  onSave,
  onDelete,
}: {
  license: TenantLicenseRecord | undefined
  onSave: (tenantId: string, values: Omit<TenantLicenseRecord, 'id' | 'tenant_id' | 'organizationName' | 'organizationSlug' | 'exists' | 'created_at' | 'updated_at'>) => Promise<void>
  onDelete: (tenantId: string) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(() => buildLicenseForm(license))

  useEffect(() => {
    setForm(buildLicenseForm(license))
    setMessage(null)
    setError(null)
  }, [license])

  if (!license) {
    return (
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">
        Select an organization to manage its license.
      </div>
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await onSave(license.tenant_id, {
        status: form.status,
        plan: form.plan,
        site_limit: numberOrNull(form.site_limit),
        unit_limit: numberOrNull(form.unit_limit),
        room_limit: numberOrNull(form.room_limit),
        user_limit: numberOrNull(form.user_limit),
        starts_at: form.starts_at || null,
        expires_at: form.expires_at || null,
        features: {
          custom_requests: form.custom_requests,
          global_reports: form.global_reports,
          qr_codes: form.qr_codes,
          api_access: form.api_access,
        },
        notes: form.notes || null,
      })
      setMessage('License saved.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save license')
    }
    setSaving(false)
  }

  const handleReset = () => setForm(buildLicenseForm(license))
  const handleDelete = async () => {
    if (!license.exists) {
      handleReset()
      return
    }
    if (!confirm(`Reset the stored license for ${license.organizationName}? Default trial values will be used until you save a new record.`)) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await onDelete(license.tenant_id)
      setMessage('Stored license removed. Defaults will apply until a new license is saved.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to remove license')
    }
    setSaving(false)
  }

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
      <p className="text-sm font-bold text-[var(--text-primary)] mb-1">{license.organizationName}</p>
      <p className="text-xs text-[var(--text-muted)] mb-4">Organization slug: {license.organizationSlug}</p>

      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Plan" value={form.plan} onChange={value => setForm(prev => ({ ...prev, plan: value as LicensePlan }))}>
          <option value="pilot">Pilot</option>
          <option value="standard">Standard</option>
          <option value="enterprise">Enterprise</option>
          <option value="custom">Custom</option>
        </SelectField>
        <SelectField label="Status" value={form.status} onChange={value => setForm(prev => ({ ...prev, status: value as LicenseStatus }))}>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="archived">Archived</option>
        </SelectField>
        <InputField label="Start date" type="date" value={form.starts_at} onChange={value => setForm(prev => ({ ...prev, starts_at: value }))} />
        <InputField label="Expiry date" type="date" value={form.expires_at} onChange={value => setForm(prev => ({ ...prev, expires_at: value }))} />
        <InputField label="Site limit" value={form.site_limit} onChange={value => setForm(prev => ({ ...prev, site_limit: value }))} />
        <InputField label="Unit limit" value={form.unit_limit} onChange={value => setForm(prev => ({ ...prev, unit_limit: value }))} />
        <InputField label="Room limit" value={form.room_limit} onChange={value => setForm(prev => ({ ...prev, room_limit: value }))} />
        <InputField label="User limit" value={form.user_limit} onChange={value => setForm(prev => ({ ...prev, user_limit: value }))} />
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Entitlements</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['custom_requests', 'Custom requests'],
            ['global_reports', 'Global reports'],
            ['qr_codes', 'QR code management'],
            ['api_access', 'API access'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={Boolean(form[key as keyof typeof form])}
                onChange={(event) => setForm(prev => ({ ...prev, [key]: event.target.checked }))}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Notes</label>
        <textarea
          value={form.notes}
          onChange={(event) => setForm(prev => ({ ...prev, notes: event.target.value }))}
          rows={4}
          className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[var(--clinical-blue)] transition-all"
          placeholder="Contract notes, rollout constraints, internal reminders…"
        />
      </div>

      {error && <Banner tone="error" message={error} />}
      {message && <Banner tone="success" message={message} />}

      <div className="mt-4 flex gap-2">
        <button onClick={handleReset}
          className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors">
          Reset form
        </button>
        <button onClick={handleDelete}
          className="px-4 py-2 rounded-xl border border-red-200 text-sm text-red-600 hover:bg-red-50 transition-colors">
          Remove stored license
        </button>
        <button onClick={handleSave} disabled={saving}
          className="ml-auto px-4 py-2 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium disabled:opacity-50 hover:bg-[var(--clinical-blue-dk)] transition-colors">
          {saving ? 'Saving…' : 'Save license'}
        </button>
      </div>
    </div>
  )
}

function buildLicenseForm(license: TenantLicenseRecord | undefined) {
  return {
    tenantId: license?.tenant_id ?? '',
    status: license?.status ?? 'trial',
    plan: license?.plan ?? 'pilot',
    site_limit: license?.site_limit?.toString() ?? '',
    unit_limit: license?.unit_limit?.toString() ?? '',
    room_limit: license?.room_limit?.toString() ?? '',
    user_limit: license?.user_limit?.toString() ?? '',
    starts_at: license?.starts_at ?? '',
    expires_at: license?.expires_at ?? '',
    custom_requests: Boolean(license?.features?.custom_requests),
    global_reports: Boolean(license?.features?.global_reports),
    qr_codes: Boolean(license?.features?.qr_codes),
    api_access: Boolean(license?.features?.api_access),
    notes: license?.notes ?? '',
  }
}

function numberOrNull(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function StatusPill({ status }: { status: LicenseStatus }) {
  const styles: Record<LicenseStatus, { bg: string; text: string }> = {
    active: { bg: '#DCFCE7', text: '#166534' },
    trial: { bg: '#DBEAFE', text: '#1D4ED8' },
    suspended: { bg: '#FEE2E2', text: '#B91C1C' },
    archived: { bg: '#E5E7EB', text: '#374151' },
  }
  const style = styles[status]
  return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: style.bg, color: style.text }}>{status}</span>
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4">
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-[var(--text-muted)] mt-1">{label}</p>
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

function Banner({ tone, message }: { tone: 'error' | 'success'; message: string }) {
  return (
    <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
      {message}
    </div>
  )
}

function InputField({ label, value, onChange, type = 'text' }: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[var(--clinical-blue)] transition-all"
      />
    </div>
  )
}

function SelectField({ label, value, onChange, children }: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[var(--clinical-blue)] transition-all"
      >
        {children}
      </select>
    </div>
  )
}
