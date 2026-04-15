import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { buildAppUrl } from '@/lib/tenant'
import { PRODUCT_NAME } from '@/lib/brand'

type ResetMode = 'request' | 'update'

function hasRecoveryParams() {
  if (typeof window === 'undefined') return false
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const search = new URLSearchParams(window.location.search)
  const type = hash.get('type') ?? search.get('type')
  return type === 'recovery' || hash.has('access_token') || search.has('code')
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<ResetMode>('request')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const cardTitle = useMemo(() => (
    mode === 'update' ? 'Set your new password' : 'Reset your password'
  ), [mode])

  useEffect(() => {
    let cancelled = false

    async function initialize() {
      const isRecovery = hasRecoveryParams()
      if (isRecovery && !cancelled) {
        setMode('update')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return

      if (session?.user && isRecovery) {
        setMode('update')
        setEmail(session.user.email ?? '')
        window.history.replaceState({}, document.title, window.location.pathname)
      }

      setReady(true)
    }

    initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update')
        setEmail(session?.user?.email ?? '')
        setError(null)
        setSuccess(null)
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const handleRequestReset = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const { error: requestError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: buildAppUrl('/reset-password'),
    })

    if (requestError) {
      setError(requestError.message)
    } else {
      setSent(true)
      setSuccess(`Password reset instructions were sent to ${email.trim()}.`)
    }

    setLoading(false)
  }

  const handleUpdatePassword = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess('Password updated successfully. You can continue into the app or sign in again later.')
    setPassword('')
    setConfirmPassword('')
    setLoading(false)
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center px-6">
        <div className="w-6 h-6 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-[var(--clinical-blue)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
              {PRODUCT_NAME.split(' ')[0]}<span className="text-[var(--clinical-blue)]"> {PRODUCT_NAME.split(' ').slice(1).join(' ')}</span>
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] font-mono tracking-wider uppercase">Staff Access Recovery</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-lift border border-[var(--border)] p-6">
          <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{cardTitle}</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-5 leading-relaxed">
            {mode === 'update'
              ? 'Choose a new password for your staff account. Passwords must be at least 8 characters.'
              : 'Enter your staff email and we will send you a secure password reset link.'}
          </p>

          {mode === 'request' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="staff@hospital.org"
                  className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] bg-surface placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--clinical-blue)] focus:ring-2 focus:ring-[var(--clinical-blue)]/10 transition-all"
                />
              </div>

              {error && <Message tone="error" message={error} />}
              {success && <Message tone="success" message={success} />}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium hover:bg-[var(--clinical-blue-dk)] active:scale-[0.99] transition-all disabled:opacity-50 shadow-sm"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Account email
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-muted)] bg-[var(--page-bg)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  New password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] bg-surface placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--clinical-blue)] focus:ring-2 focus:ring-[var(--clinical-blue)]/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Confirm new password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] bg-surface placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--clinical-blue)] focus:ring-2 focus:ring-[var(--clinical-blue)]/10 transition-all"
                />
              </div>

              {error && <Message tone="error" message={error} />}
              {success && <Message tone="success" message={success} />}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium hover:bg-[var(--clinical-blue-dk)] active:scale-[0.99] transition-all disabled:opacity-50 shadow-sm"
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {mode === 'update' && success && (
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--page-bg)] transition-colors"
              >
                Continue to dashboard
              </button>
            )}
            <button
              onClick={() => navigate(sent ? '/login?reset=requested' : '/login')}
              className="w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--clinical-blue)] transition-colors"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Message({ tone, message }: { tone: 'error' | 'success'; message: string }) {
  const styles = tone === 'error'
    ? 'text-red-700 bg-[var(--danger-lt)] border-red-200'
    : 'text-emerald-700 bg-emerald-50 border-emerald-200'

  return (
    <div className={`flex items-start gap-2 text-sm border rounded-xl px-3.5 py-2.5 ${styles}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
        <circle cx="12" cy="12" r="10" />
        {tone === 'error'
          ? <><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>
          : <polyline points="20 6 9 17 4 12" />}
      </svg>
      {message}
    </div>
  )
}
