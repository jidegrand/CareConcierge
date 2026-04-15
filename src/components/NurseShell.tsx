import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { can, canAny, NAV_ITEMS, ROLE_CFG, type UserRole } from '@/lib/roles'
import { PRODUCT_NAME } from '@/lib/brand'
import type { RequestStats } from '@/hooks/useRequests'

interface Props {
  children:      React.ReactNode
  stats:         RequestStats
  connected:     boolean
  soundEnabled:  boolean
  onSoundToggle: () => void
  unitName?:     string
}

function fmtAck(s: number | null) {
  if (s === null) return '—'
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60), sec = s % 60
  return `${m}m ${sec > 0 ? ` ${sec}s` : ''}`
}

export default function NurseShell({
  children, stats, connected, soundEnabled, onSoundToggle, unitName,
}: Props) {
  const { user, profile, signOut } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [now, setNow]       = useState(new Date())
  const [shiftStart]        = useState(new Date())
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const shiftMin   = Math.floor((now.getTime() - shiftStart.getTime()) / 60000)
  const shiftLabel = shiftMin < 60 ? `${shiftMin}m` : `${Math.floor(shiftMin / 60)}h ${shiftMin % 60}m`
  const fmtTime    = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const role      = profile?.role as UserRole | undefined
  const roleCfg   = ROLE_CFG[role ?? 'nurse']
  const nurseName = profile?.full_name ?? user?.email?.split('@')[0] ?? 'User'
  const initials  = nurseName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  // Filter nav items by role permission
  const mainNav   = NAV_ITEMS.filter(item => item.section === 'main'   && can(role, item.perm))
  const bottomNav = NAV_ITEMS.filter(item => item.section === 'bottom' && can(role, item.perm))

  // Admin shows in main nav only for managers and above
  const showAdmin = canAny(role, 'page.admin')
  const showPlatform = canAny(role, 'page.platform')
  const showQR    = canAny(role, 'page.qrsheet')

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--page-bg)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── Top nav ───────────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 h-14 bg-[var(--surface)] border-b border-[var(--border)] z-10">
        <div className="flex items-center gap-6">
          <span className="text-[17px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {PRODUCT_NAME}
          </span>
          <nav className="flex items-center gap-1">
            {[
              { label: 'Dashboard',    path: '/dashboard' },
              { label: 'Patient Feed', path: '/feed'      },
              { label: 'Bay Map',      path: '/bay-map'   },
            ].map(({ label, path }) => {
              const active = location.pathname === path
              return (
                <button key={path} onClick={() => navigate(path)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    active
                      ? 'border-[var(--border)] text-[var(--clinical-blue)] font-semibold bg-[var(--clinical-blue-lt)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--page-bg)]'
                  }`}>
                  {label}
                </button>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {/* Urgent alert badge */}
          {stats.pendingCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: 'var(--danger-lt)', color: 'var(--danger)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)] animate-pulse" />
              {stats.pendingCount} pending
            </div>
          )}
          <button className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors shadow-sm">
            <span className="text-base">✚</span> Emergency
          </button>
          <button onClick={onSoundToggle} title={soundEnabled ? 'Mute' : 'Unmute'}
            className="relative w-9 h-9 rounded-full hover:bg-[var(--page-bg)] flex items-center justify-center text-[var(--text-muted)] transition-colors">
            <BellIcon />
            {stats.pendingCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
          <button className="w-9 h-9 rounded-full hover:bg-[var(--page-bg)] flex items-center justify-center text-[var(--text-muted)] transition-colors">
            <HelpIcon />
          </button>
          {/* Role badge + avatar */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full hidden sm:block"
              style={{ background: roleCfg?.bg ?? '#ECFDF5', color: roleCfg?.color ?? '#065F46' }}>
              {roleCfg?.label ?? role}
            </span>
            <button onClick={async () => { await signOut(); navigate('/login') }}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              style={{ background: 'var(--clinical-blue)' }}
              title={`${nurseName} — Sign out`}>
              {initials}
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} flex-shrink-0 flex flex-col bg-[var(--surface)] border-r border-[var(--border)] transition-all duration-200 overflow-hidden`}>

          {/* Logo + collapse */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
            {sidebarOpen && (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--clinical-blue)] flex items-center justify-center flex-shrink-0">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                    Care<span style={{ color: 'var(--clinical-blue)' }}> Concierge</span>
                  </p>
                  <p className="text-[10px] font-mono tracking-wide truncate max-w-[120px]"
                    style={{ color: 'var(--text-muted)' }}>
                    {unitName ?? 'Nurse Station'}
                  </p>
                </div>
              </div>
            )}
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg transition-colors ml-auto"
              style={{ color: 'var(--text-muted)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {sidebarOpen
                  ? <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>
                  : <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>}
              </svg>
            </button>
          </div>

          {/* Stat cards — only for managers and above */}
          {sidebarOpen && canAny(role, 'page.reports') && (
            <div className="px-3 py-3 border-b border-[var(--border)] space-y-1.5">
              {sidebarOpen && <p className="text-[10px] font-medium uppercase tracking-wider px-1 mb-2" style={{ color: 'var(--text-muted)' }}>Today</p>}
              <StatCard label="Pending"      value={String(stats.pendingCount)}       color="danger"  />
              <StatCard label="In Progress"  value={String(stats.inProgressCount)}    color="warning" />
              <StatCard label="Resolved"     value={String(stats.resolvedTodayCount)} color="success" />
              <StatCard label="Avg Response" value={fmtAck(stats.avgAckSeconds)}      color="neutral" />
            </div>
          )}

          {/* Main nav */}
          <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
            {mainNav.map(item => {
              const active = location.pathname === item.path
              return (
                <button key={item.path} onClick={() => navigate(item.path)}
                  title={!sidebarOpen ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--page-bg)] hover:text-[var(--text-primary)]'
                  }`}>
                  <span className="flex-shrink-0">
                    <NavIcon path={item.path} active={active} />
                  </span>
                  {sidebarOpen && item.label}
                </button>
              )
            })}

            {/* Admin — managers and above */}
            {showPlatform && (
              <button onClick={() => navigate('/platform')}
                title={!sidebarOpen ? 'Platform' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  location.pathname.startsWith('/platform')
                    ? 'bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--page-bg)] hover:text-[var(--text-primary)]'
                }`}>
                <span className="flex-shrink-0"><PlatformIcon active={location.pathname.startsWith('/platform')} /></span>
                {sidebarOpen && 'Platform'}
              </button>
            )}

            {/* Admin — managers and above */}
            {showAdmin && (
              <button onClick={() => navigate('/admin')}
                title={!sidebarOpen ? 'Admin' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--page-bg)] hover:text-[var(--text-primary)]'
                }`}>
                <span className="flex-shrink-0"><AdminIcon active={location.pathname.startsWith('/admin')} /></span>
                {sidebarOpen && 'Admin'}
              </button>
            )}

            {/* QR Sheets */}
            {showQR && sidebarOpen && (
              <button onClick={() => navigate('/qr-sheet')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  location.pathname === '/qr-sheet'
                    ? 'bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--page-bg)] hover:text-[var(--text-primary)]'
                }`}>
                <span className="flex-shrink-0"><QRNavIcon active={location.pathname === '/qr-sheet'} /></span>
                QR Sheets
              </button>
            )}
          </nav>

          {/* Bottom: unit performance + nurse info */}
          <div className="border-t border-[var(--border)] px-3 py-3 space-y-3">

            {/* Clock */}
            {sidebarOpen && (
              <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--page-bg)' }}>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                    {fmtTime(now)}
                  </span>
                  <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{shiftLabel}</span>
                </div>
              </div>
            )}

            {/* Nurse profile */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                style={{ background: 'var(--clinical-blue)' }}>
                {initials}
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{nurseName}</p>
                  <p className="text-xs capitalize truncate" style={{ color: 'var(--text-muted)' }}>
                    {roleCfg?.label ?? role}
                  </p>
                </div>
              )}
            </div>

            {/* Controls */}
            {sidebarOpen && (
              <div className="flex gap-2">
                <button onClick={onSoundToggle}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    soundEnabled
                      ? 'border-[var(--clinical-blue)]/30 bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)]'
                      : 'border-[var(--border)] text-[var(--text-muted)]'
                  }`}>
                  {soundEnabled ? <><BellSmIcon /> Sound</> : <><MuteSmIcon /> Muted</>}
                </button>
                <button onClick={() => navigate('/settings')}
                  className="flex-1 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium transition-all hover:bg-[var(--page-bg)]"
                  style={{ color: 'var(--text-muted)' }}>
                  Settings
                </button>
              </div>
            )}

            {/* Bottom nav items (settings, support) */}
            <div className="space-y-0.5">
              {bottomNav.map(item => (
                <button key={item.path} onClick={() => navigate(item.path)}
                  title={!sidebarOpen ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                    location.pathname === item.path
                      ? 'bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--page-bg)] hover:text-[var(--text-secondary)]'
                  }`}>
                  <NavIcon path={item.path} active={location.pathname === item.path} />
                  {sidebarOpen && item.label}
                </button>
              ))}
              <button
                onClick={() => navigate('/support')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[var(--text-muted)] hover:bg-[var(--page-bg)] hover:text-[var(--text-secondary)] transition-colors">
                <SupportIcon />
                {sidebarOpen && 'Support'}
              </button>
            </div>

            {/* Connection dot */}
            <div className="flex items-center gap-1.5 px-1">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
              {sidebarOpen && (
                <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {connected ? 'Live — real-time' : 'Reconnecting…'}
                </span>
              )}
            </div>
          </div>
        </aside>

        {/* ── Main content ──────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const cfg: Record<string, { bg: string; text: string }> = {
    danger:  { bg: '#DC2626', text: '#FFFFFF' },
    warning: { bg: '#FACC15', text: '#713F12' },
    success: { bg: '#16A34A', text: '#FFFFFF' },
    neutral: { bg: '#6B7280', text: '#FFFFFF' },
  }
  const c = cfg[color] ?? cfg.neutral
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg shadow-sm"
      style={{ background: c.bg }}>
      <span className="text-xs" style={{ color: c.text }}>{label}</span>
      <span className="font-mono text-sm font-semibold" style={{ color: c.text }}>{value}</span>
    </div>
  )
}

// ── Nav icons ─────────────────────────────────────────────────────────────────
function NavIcon({ path, active }: { path: string; active: boolean }) {
  const color = active ? 'var(--clinical-blue)' : 'var(--text-muted)'
  const s = (d: React.ReactNode) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
  )
  if (path === '/dashboard') return s(<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>)
  if (path === '/feed')      return s(<><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>)
  if (path === '/bay-map')   return s(<><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></>)
  if (path === '/staffing')  return s(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>)
  if (path === '/reports')   return s(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>)
  if (path === '/settings')  return s(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>)
  return s(<><circle cx="12" cy="12" r="10"/></>)
}
function AdminIcon({ active }: { active: boolean }) {
  const color = active ? 'var(--clinical-blue)' : 'var(--text-muted)'
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}
function PlatformIcon({ active }: { active: boolean }) {
  const color = active ? 'var(--clinical-blue)' : 'var(--text-muted)'
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l7 4v6c0 5-3 8-7 10-4-2-7-5-7-10V6l7-4z"/>
      <path d="M9 12h6"/>
      <path d="M12 9v6"/>
    </svg>
  )
}
function QRNavIcon({ active }: { active: boolean }) {
  const color = active ? 'var(--clinical-blue)' : 'var(--text-muted)'
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
      <line x1="14" y1="14" x2="14" y2="14.01"/><line x1="18" y1="14" x2="18" y2="14.01"/>
    </svg>
  )
}
const ico = (d: React.ReactNode) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
const BellIcon    = () => ico(<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>)
const HelpIcon    = () => ico(<><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>)
const SupportIcon = () => ico(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>)
const BellSmIcon  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
const MuteSmIcon  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M17.73 17.73A9.94 9.94 0 0 1 12 20H6s3-2 3-9a6 6 0 0 1 .08-1M9.9 4.24A6 6 0 0 1 18 8c0 2.5-.5 4.5-1.27 6.27"/></svg>
