import { useEffect, useRef, useState } from 'react'
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
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const role = profile?.role as UserRole | undefined
  const roleCfg = ROLE_CFG[role ?? 'super_admin']
  const displayName = profile?.full_name ?? user?.email?.split('@')[0] ?? 'User'
  const initials = displayName.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(open => !open)}
              className="flex items-center gap-3 rounded-full pl-1 pr-2 py-1 hover:bg-[var(--page-bg)] transition-colors"
              title="Open profile menu"
            >
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-[var(--text-primary)]">{displayName}</p>
                <p className="text-xs text-[var(--text-muted)]">{user?.email ?? 'Signed in'}</p>
              </div>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                style={{ background: 'var(--clinical-blue)' }}
              >
                {initials}
              </div>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`hidden sm:block text-[var(--text-muted)] transition-transform ${profileOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg z-50">
                <div className="border-b border-[var(--border)] px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                      style={{ background: 'var(--clinical-blue)' }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate text-[var(--text-primary)]">{displayName}</p>
                      <p className="text-xs truncate text-[var(--text-muted)]">{user?.email ?? 'Signed in'}</p>
                      <span
                        className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: roleCfg?.bg ?? '#EDE9FE', color: roleCfg?.color ?? '#5B21B6' }}
                      >
                        {roleCfg?.label ?? role ?? 'Platform User'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/dashboard') }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9.5 12 3l9 6.5" />
                      <path d="M5 10v10h14V10" />
                    </svg>
                    Return to operations dashboard
                  </button>
                </div>

                <div className="border-t border-[var(--border)] py-1">
                  <button
                    onClick={async () => {
                      setProfileOpen(false)
                      await signOut()
                      navigate('/login')
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
