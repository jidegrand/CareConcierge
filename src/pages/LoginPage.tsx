import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useTenantContext } from '@/hooks/useTenantContext'
import { PRODUCT_NAME } from '@/lib/brand'

const INACTIVE_ACCOUNT_NOTICE_KEY = 'bayrequest_inactive_account_notice'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { tenantName, tenantSlug } = useTenantContext()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [inactiveNotice, setInactiveNotice] = useState(false)
  const resetRequested = searchParams.get('reset') === 'requested'

  useEffect(() => {
    try {
      const nextNotice = localStorage.getItem(INACTIVE_ACCOUNT_NOTICE_KEY) === '1'
      if (nextNotice) {
        setInactiveNotice(true)
        localStorage.removeItem(INACTIVE_ACCOUNT_NOTICE_KEY)
      }
    } catch {}
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError(err.message)
    else navigate('/', { replace: true })
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-[var(--clinical-blue)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <span className="text-2xl font-semibold tracking-tight">
              <span className="text-[var(--clinical-blue-dk)]">{PRODUCT_NAME.split(' ')[0]} </span><span className="text-[var(--clinical-blue)]">{PRODUCT_NAME.split(' ').slice(1).join(' ')}</span>
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] font-mono tracking-wider uppercase">
            {tenantName ? `${tenantName} Staff Access` : 'Nurse Station Access'}
          </p>
          {tenantSlug && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Tenant: <span className="font-mono">{tenantSlug}</span>
            </p>
          )}
        </div>

        {/* Card */}
        <div className="bg-surface rounded-2xl shadow-lift border border-[var(--border)] p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {resetRequested && (
              <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                If your email is registered, password reset instructions have been sent. Open the link in that email to set a new password.
              </div>
            )}

            {inactiveNotice && (
              <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                This account has been deactivated. Contact your administrator if you need access restored.
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Email address
              </label>
              <input type="email" required autoComplete="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={tenantSlug ? `staff@${tenantSlug}.org` : 'staff@hospital.org'}
                className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] bg-surface placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--clinical-blue)] focus:ring-2 focus:ring-[var(--clinical-blue)]/10 transition-all" />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input type="password" required autoComplete="current-password" value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] bg-surface placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--clinical-blue)] focus:ring-2 focus:ring-[var(--clinical-blue)]/10 transition-all" />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-[var(--danger-lt)] border border-red-200 rounded-xl px-3.5 py-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium hover:bg-[var(--clinical-blue-dk)] active:scale-[0.99] transition-all disabled:opacity-50 shadow-sm">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-3 flex items-center justify-between gap-3">
            <button onClick={() => { navigate('/reset-password') }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--clinical-blue)] transition-colors">
              Forgot password?
            </button>
            <span className="text-xs text-[var(--text-muted)]">
              Invite-only access
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-5">
          Patient access via QR code — no login required.
        </p>
      </div>
    </div>
  )
}
