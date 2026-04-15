import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { COMPANY_NAME, PRODUCT_NAME } from '@/lib/brand'
import { ROLE_CFG, type UserRole } from '@/lib/roles'

interface Props {
  children: React.ReactNode
}

export default function PlatformShell({ children }: Props) {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()

  const role = profile?.role as UserRole | undefined
  const roleCfg = ROLE_CFG[role ?? 'super_admin']
  const displayName = profile?.full_name ?? user?.email?.split('@')[0] ?? 'User'
  const initials = displayName.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen flex flex-col bg-[var(--page-bg)]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <header className="flex-shrink-0 h-16 px-6 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 rounded-xl bg-[var(--clinical-blue)] text-white flex items-center justify-center shadow-sm"
            title="Return to app"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </button>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">{COMPANY_NAME}</p>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-[var(--text-primary)]">Platform Console</h1>
              <span className="text-xs text-[var(--text-muted)]">{PRODUCT_NAME}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="hidden sm:inline-flex text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: roleCfg?.bg ?? '#EDE9FE', color: roleCfg?.color ?? '#5B21B6' }}
          >
            {roleCfg?.label ?? role ?? 'Platform User'}
          </span>
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-[var(--text-primary)]">{displayName}</p>
            <p className="text-xs text-[var(--text-muted)]">{user?.email ?? 'Signed in'}</p>
          </div>
          <button
            onClick={async () => { await signOut(); navigate('/login') }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
            style={{ background: 'var(--clinical-blue)' }}
            title="Sign out"
          >
            {initials}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
