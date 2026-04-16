import { useDarkMode } from '@/hooks/useDarkMode'
import { useState, useEffect, FormEvent } from 'react'
import NurseShell from '@/components/NurseShell'
import { useAuth } from '@/hooks/useAuth'
import { useTenantSettings } from '@/hooks/useTenantSettings'
import { useTenantContext } from '@/hooks/useTenantContext'
import { useRequests } from '@/hooks/useRequests'
import { supabase } from '@/lib/supabase'
import { isAtLeast } from '@/lib/roles'
import { COMPANY_NAME, PRODUCT_NAME, SYSTEM_LAYER_NAME } from '@/lib/brand'
const APP_VERSION     = '1.1.0'

type Tab = 'profile' | 'notifications' | 'security' | 'preferences'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',       label: 'Profile',       icon: <ProfileIcon /> },
  { id: 'notifications', label: 'Notifications',  icon: <BellIcon /> },
  { id: 'security',      label: 'Security',       icon: <LockIcon /> },
  { id: 'preferences',   label: 'Preferences',   icon: <SlidersIcon /> },
]

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  tenant_admin: 'Tenant Admin', site_manager: 'Site Manager',
  charge_nurse: 'Charge Nurse', nurse_manager: 'Nurse Manager',
  nurse: 'Nurse', volunteer: 'Volunteer', viewer: 'Viewer',
}

// ── Persistence helpers ───────────────────────────────────────────────────────
import { loadPrefs, savePrefs, type Prefs } from '@/hooks/usePrefs'

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { profile, user } = useAuth()
  const { tenantId, tenantName, unitId } = useTenantContext()
  const { requests, stats, connected, soundEnabled, setSoundEnabled } = useRequests(unitId, tenantId)
  const unitName = requests[0]?.room?.unit?.name ?? (unitId ? 'Assigned Unit' : `${tenantName ?? 'Tenant'} · All Units`)
  const [tab, setTab] = useState<Tab>('profile')

  return (
    <NurseShell stats={stats} connected={connected}
      soundEnabled={soundEnabled} onSoundToggle={() => setSoundEnabled(!soundEnabled)}
      unitName={unitName}>

      <div className="flex h-full overflow-hidden">

        {/* Settings sub-nav */}
        <aside className="w-52 flex-shrink-0 bg-white border-r border-[var(--border)] flex flex-col py-5">
          <div className="px-4 mb-4">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Settings</p>
          </div>
          <nav className="flex-1 px-2 space-y-0.5">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  tab === t.id
                    ? 'bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--page-bg)] hover:text-[var(--text-primary)]'
                }`}>
                <span className={tab === t.id ? 'text-[var(--clinical-blue)]' : 'text-[var(--text-muted)]'}>
                  {t.icon}
                </span>
                {t.label}
              </button>
            ))}
          </nav>

          {/* App version */}
          <div className="px-4 pt-3 border-t border-[var(--border)]">
            <p className="text-[10px] text-[var(--text-muted)] font-mono">v{APP_VERSION}</p>
          </div>
        </aside>

        {/* Panel */}
        <main className="flex-1 overflow-y-auto px-8 py-7 max-w-2xl">
          {tab === 'profile'       && <ProfileTab       user={user} profile={profile} unitName={unitName} tenantId={tenantId} />}
          {tab === 'notifications' && <NotificationsTab />}
          {tab === 'security'      && <SecurityTab      user={user} />}
          {tab === 'preferences'   && <PreferencesTab tenantId={tenantId} role={profile?.role} />}
        </main>
      </div>
    </NurseShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Profile
// ─────────────────────────────────────────────────────────────────────────────
function ProfileTab({ user, profile, unitName, tenantId }: {
  user: ReturnType<typeof useAuth>['user']
  profile: ReturnType<typeof useAuth>['profile']
  unitName: string
  tenantId: string | undefined
}) {
  const [name,    setName]    = useState(profile?.full_name ?? '')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [err,     setErr]     = useState<string | null>(null)

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true); setErr(null); setSaved(false)
    const { error } = await supabase
      .from('user_profiles')
      .update({ full_name: name.trim() })
      .eq('id', profile.id)
    if (error) { setErr(error.message) } else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??'

  return (
    <div>
      <SectionHeader title="Profile" sub="Your personal details and account information" />

      {/* Avatar + name */}
      <Card>
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-full bg-[var(--clinical-blue)] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-base font-bold text-[var(--text-primary)]">{name || '—'}</p>
            <p className="text-sm text-[var(--text-muted)]">{user?.email ?? '—'}</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)] mt-1 inline-block">
              {ROLE_LABELS[profile?.role ?? ''] ?? profile?.role ?? '—'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Display name">
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[var(--clinical-blue)] focus:ring-2 focus:ring-[var(--clinical-blue)]/10 transition-all" />
          </Field>
          <Field label="Email address">
            <input value={user?.email ?? ''} disabled
              className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-[var(--page-bg)] text-[var(--text-muted)] cursor-not-allowed" />
            <p className="text-xs text-[var(--text-muted)] mt-1">Email is managed by your organisation and cannot be changed here.</p>
          </Field>
          <Field label="Role">
            <input value={ROLE_LABELS[profile?.role ?? ''] ?? profile?.role ?? '—'} disabled
              className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-[var(--page-bg)] text-[var(--text-muted)] cursor-not-allowed" />
            <p className="text-xs text-[var(--text-muted)] mt-1">Role changes must be made by a Tenant Admin in the Admin portal.</p>
          </Field>
          <Field label="Assigned unit">
            <input value={unitName} disabled
              className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-[var(--page-bg)] text-[var(--text-muted)] cursor-not-allowed" />
          </Field>

          {err   && <Alert type="error"   msg={err} />}
          {saved && <Alert type="success" msg="Profile updated successfully." />}

          <SaveBtn saving={saving} />
        </form>
      </Card>

      {/* Read-only account info */}
      <Card className="mt-4">
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Account Info</p>
        <InfoRow label="User ID"    value={profile?.id ? `${profile.id.slice(0, 20)}…` : '—'} mono />
        <InfoRow label="Tenant ID"  value={tenantId ? `${tenantId.slice(0, 20)}…` : '—'}    mono />
        <InfoRow label="Created"    value={user?.created_at ? new Date(user.created_at).toLocaleDateString('en-CA') : '—'} />
        <InfoRow label="Last login" value={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' }) : '—'} />
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Notifications
// ─────────────────────────────────────────────────────────────────────────────
function NotificationsTab() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [pushStatus, setPushStatus] = useState<'unknown' | 'granted' | 'denied' | 'unsupported'>('unknown')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!('Notification' in window)) { setPushStatus('unsupported'); return }
    setPushStatus(Notification.permission as typeof pushStatus)
  }, [])

  const update = (patch: Partial<Prefs>) => setPrefs(p => ({ ...p, ...patch }))

  const requestPush = async () => {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission()
    setPushStatus(result as typeof pushStatus)
    if (result === 'granted') update({ browserPush: true })
  }

  const handleSave = () => {
    savePrefs(prefs)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      <SectionHeader title="Notifications" sub="Control how and when you receive alerts" />

      <Card>
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Sound Alerts</p>
        <div className="space-y-4">
          <Toggle
            label="Enable sound alerts"
            sub="Play a chime when a new request arrives"
            checked={prefs.soundEnabled}
            onChange={v => update({ soundEnabled: v })} />
          <Toggle
            label="Urgent requests only"
            sub="Only play sound for urgent or overdue requests"
            checked={prefs.urgentSoundOnly}
            disabled={!prefs.soundEnabled}
            onChange={v => update({ urgentSoundOnly: v })} />
        </div>
      </Card>

      <Card className="mt-4">
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Browser Push</p>
        <Toggle
          label="Browser push notifications"
          sub="Get notified even when this tab is in the background"
          checked={prefs.browserPush && pushStatus === 'granted'}
          disabled={pushStatus === 'denied' || pushStatus === 'unsupported'}
          onChange={v => { if (v && pushStatus !== 'granted') { requestPush(); return } update({ browserPush: v }) }} />

        {pushStatus === 'denied' && (
          <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            Push notifications are blocked in your browser. Go to <strong>Site Settings</strong> → Notifications → Allow for this site, then refresh.
          </div>
        )}
        {pushStatus === 'unsupported' && (
          <div className="mt-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            Your browser does not support push notifications. Use Chrome or Edge on desktop.
          </div>
        )}
        {pushStatus === 'unknown' && (
          <div className="mt-3">
            <button onClick={requestPush}
              className="text-xs font-medium text-[var(--clinical-blue)] hover:underline">
              Enable push — click to grant permission →
            </button>
          </div>
        )}
      </Card>

      <div className="mt-4 flex items-center justify-between">
        {saved && <Alert type="success" msg="Notification preferences saved." />}
        <div className="ml-auto">
          <SaveBtn saving={false} onClick={handleSave} label="Save preferences" />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Security
// ─────────────────────────────────────────────────────────────────────────────
function SecurityTab({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
  const [newPwd,    setNewPwd]    = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [err,       setErr]       = useState<string | null>(null)
  const [signOutAll, setSignOutAll] = useState(false)

  const handlePassword = async (e: FormEvent) => {
    e.preventDefault()
    setErr(null); setSaved(false)
    if (newPwd.length < 8)   { setErr('Password must be at least 8 characters.'); return }
    if (newPwd !== confirmPwd){ setErr('Passwords do not match.'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    if (error) { setErr(error.message) } else { setSaved(true); setNewPwd(''); setConfirmPwd('') }
    setSaving(false)
  }

  const handleSignOutAll = async () => {
    setSignOutAll(true)
    await supabase.auth.signOut({ scope: 'global' })
    window.location.href = '/login'
  }

  return (
    <div>
      <SectionHeader title="Security" sub="Manage your password and active sessions" />

      <Card>
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Change Password</p>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Leave blank if you use magic link sign-in. Password must be at least 8 characters.
        </p>
        <form onSubmit={handlePassword} className="space-y-4">
          <Field label="New password">
            <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
              placeholder="••••••••" autoComplete="new-password"
              className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[var(--clinical-blue)] focus:ring-2 focus:ring-[var(--clinical-blue)]/10 transition-all" />
          </Field>
          <Field label="Confirm new password">
            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
              placeholder="••••••••" autoComplete="new-password"
              className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[var(--clinical-blue)] focus:ring-2 focus:ring-[var(--clinical-blue)]/10 transition-all" />
          </Field>

          {err   && <Alert type="error"   msg={err} />}
          {saved && <Alert type="success" msg="Password updated. You may need to sign in again on other devices." />}

          <SaveBtn saving={saving} label="Update password" />
        </form>
      </Card>

      <Card className="mt-4">
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Active Session</p>
        <InfoRow label="Signed in as" value={user?.email ?? '—'} />
        <InfoRow label="Last login"   value={user?.last_sign_in_at
          ? new Date(user.last_sign_in_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })
          : '—'} />

        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Sign out of all devices</p>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            Immediately invalidates all active sessions across every device.
          </p>
          <button onClick={handleSignOutAll} disabled={signOutAll}
            className="px-4 py-2 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50">
            {signOutAll ? 'Signing out…' : 'Sign out everywhere'}
          </button>
        </div>
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Preferences
// ─────────────────────────────────────────────────────────────────────────────
function PreferencesTab({ tenantId, role }: { tenantId: string | undefined; role: string | undefined }) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canManagePatientQrSettings = isAtLeast(role, 'nurse_manager')
  const { settings, loading: settingsLoading, saveSettings } = useTenantSettings(tenantId)
  const [patientFeedbackEnabled, setPatientFeedbackEnabled] = useState(false)

  const update = (patch: Partial<Prefs>) => setPrefs(p => ({ ...p, ...patch }))

  useEffect(() => {
    setPatientFeedbackEnabled(settings.patient_feedback_enabled)
  }, [settings.patient_feedback_enabled])

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      savePrefs(prefs)
      if (canManagePatientQrSettings && tenantId) {
        await saveSettings({
          patient_feedback_enabled: patientFeedbackEnabled,
          patient_idle_redirect_url: settings.patient_idle_redirect_url,
        })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences.')
    }

    setSaving(false)
  }

  const TIMEZONES = [
    'America/Toronto', 'America/Vancouver', 'America/Edmonton',
    'America/Winnipeg', 'America/Halifax', 'America/St_Johns',
    'UTC',
  ]

  const REFRESH_OPTIONS = [
    { value: 15, label: '15 seconds' }, { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },   { value: 120, label: '2 minutes' },
  ]

  const { dark, toggle: toggleDark } = useDarkMode()

  return (
    <div>
      <SectionHeader title="Preferences" sub="Customise how the dashboard behaves for you" />

      {/* Dark mode — top of preferences */}
      <Card>
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Appearance</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: dark ? '#1C2128' : '#FFF7ED', border: '1.5px solid var(--border)' }}>
              <span className="text-lg">{dark ? '🌙' : '☀️'}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {dark ? 'Night Mode' : 'Day Mode'}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {dark ? 'Dark theme — easier on the eyes at night' : 'Light theme — clinical white surfaces'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleDark}
            className="relative flex-shrink-0 w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none"
            style={{ background: dark ? 'var(--clinical-blue)' : '#D1D9E0' }}>
            <span
              className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300 flex items-center justify-center text-sm"
              style={{ transform: dark ? 'translateX(28px)' : 'translateX(0)' }}>
              {dark ? '🌙' : '☀️'}
            </span>
          </button>
        </div>
      </Card>

      <Card className="mt-4">
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Dashboard</p>
        <div className="space-y-5">
          <Toggle
            label="Compact view"
            sub="Reduce card padding for more requests on screen at once"
            checked={prefs.compactView}
            onChange={v => update({ compactView: v })} />

          <Field label="Auto-refresh interval">
            <select value={prefs.autoRefreshSec} onChange={e => update({ autoRefreshSec: Number(e.target.value) })}
              className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[var(--clinical-blue)] transition-all">
              {REFRESH_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className="text-xs text-[var(--text-muted)] mt-1">How often timestamps refresh when the tab is active.</p>
          </Field>

          <Field label="Timezone">
            <select value={prefs.timezone} onChange={e => update({ timezone: e.target.value })}
              className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[var(--clinical-blue)] transition-all">
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Card className="mt-4">
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Clinical Thresholds</p>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          These values control when warnings appear on request cards. They are local to your browser and do not affect other users.
        </p>
        <div className="space-y-5">
          <Field label={`Overdue threshold: ${prefs.overdueThreshold} min`}>
            <input type="range" min={1} max={15} step={1}
              value={prefs.overdueThreshold}
              onChange={e => update({ overdueThreshold: Number(e.target.value) })}
              className="w-full" />
            <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
              <span>1 min</span><span>15 min</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Requests pending longer than this show the Overdue badge.
            </p>
          </Field>

          <Field label={`Response target: ${prefs.responseTarget} min`}>
            <input type="range" min={1} max={10} step={1}
              value={prefs.responseTarget}
              onChange={e => update({ responseTarget: Number(e.target.value) })}
              className="w-full" />
            <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
              <span>1 min</span><span>10 min</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Used in the Reports analytics progress bar.
            </p>
          </Field>
        </div>
      </Card>

      {canManagePatientQrSettings && (
        <Card className="mt-4">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Patient QR Experience</p>
          <Toggle
            label="Patient satisfaction prompt"
            sub="Show a quick 1–5 star feedback prompt on the patient QR page after a request is resolved."
            checked={patientFeedbackEnabled}
            disabled={settingsLoading || !tenantId}
            onChange={setPatientFeedbackEnabled}
          />
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Managers and admins can also configure the patient idle redirect URL in Sites & Rooms for each hospital site.
          </p>
        </Card>
      )}

      <Card className="mt-4">
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">About {PRODUCT_NAME}</p>
        <InfoRow label="Version"    value={`v${APP_VERSION}`} mono />
        <InfoRow label="Platform"   value={`${PRODUCT_NAME} — Patient Request Management`} />
        <InfoRow label="System Layer" value={SYSTEM_LAYER_NAME} />
        <InfoRow label="Built by"   value={COMPANY_NAME} />
        <InfoRow label="Deployment" value="Standalone multi-tenant SaaS" />
      </Card>

      <div className="mt-4 flex items-center justify-between">
        {error && <Alert type="error" msg={error} />}
        {saved && <Alert type="success" msg="Preferences saved successfully." />}
        <div className="ml-auto">
          <SaveBtn saving={saving} onClick={handleSave} label="Save preferences" />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared components
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
      <p className="text-sm text-[var(--text-muted)] mt-0.5">{sub}</p>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-[var(--border)] px-5 py-5 ${className}`}>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function Toggle({ label, sub, checked, disabled, onChange }: {
  label: string; sub: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
          checked ? 'bg-[var(--clinical-blue)]' : 'bg-gray-200'
        }`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <span className={`text-sm text-[var(--text-secondary)] ${mono ? 'font-mono text-xs' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  )
}

function Alert({ type, msg }: { type: 'success' | 'error'; msg: string }) {
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-700',
    error:   'bg-red-50   border-red-200   text-red-700',
  }
  return (
    <div className={`text-xs px-3.5 py-2.5 rounded-xl border ${styles[type]}`}>{msg}</div>
  )
}

function SaveBtn({ saving, onClick, label = 'Save changes' }: {
  saving: boolean; onClick?: () => void; label?: string
}) {
  return (
    <button type={onClick ? 'button' : 'submit'} onClick={onClick} disabled={saving}
      className="px-5 py-2.5 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium hover:bg-[var(--clinical-blue-dk)] disabled:opacity-50 transition-colors">
      {saving ? 'Saving…' : label}
    </button>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const si = (d: React.ReactNode) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
)
function ProfileIcon()       { return si(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>) }
function BellIcon()          { return si(<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>) }
function LockIcon()          { return si(<><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>) }
function SlidersIcon()       { return si(<><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></>) }
