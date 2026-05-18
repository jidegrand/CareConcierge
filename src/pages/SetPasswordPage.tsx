import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { EmailOtpType, Session } from '@supabase/supabase-js'
import { consumeInitialInviteCallback, supabase } from '@/lib/supabase'
import { PRODUCT_NAME } from '@/lib/brand'

const INVITE_SESSION_TIMEOUT_MS = 4000

function hasInviteParams() {
  if (typeof window === 'undefined') return false
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const search = new URLSearchParams(window.location.search)
  const type = hash.get('type') ?? search.get('type')
  return type === 'invite' || hash.has('access_token') || search.has('code') || search.has('token_hash')
}

function getAuthCode() {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('code')
}

function getInviteTokenHash() {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('token_hash')
}

function getInviteErrorMessage(errorCode: string | null, errorDescription: string | null): string | null {
  if (!errorCode && !errorDescription) return null
  if (errorCode === 'otp_expired') return 'This invite link has expired. Ask an administrator to send a new invite.'
  if (errorCode === 'access_denied') return 'This invite link is invalid. Ask an administrator to send a new invite.'
  return errorDescription || 'This invite link is invalid or has expired. Ask an administrator to send a new invite.'
}

export default function SetPasswordPage() {
  const navigate = useNavigate()
  const [initialInviteCallback] = useState(() => consumeInitialInviteCallback())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [invalidInvite, setInvalidInvite] = useState(false)
  const [pendingTokenHash, setPendingTokenHash] = useState<string | null>(null)
  const [acceptingInvite, setAcceptingInvite] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timeoutId: number | undefined

    const clearInviteUrl = () => {
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    const acceptSession = (session: Session | null) => {
      if (cancelled) return false
      if (session?.user) {
        if (timeoutId !== undefined) window.clearTimeout(timeoutId)
        setEmail(session.user.email ?? '')
        setInvalidInvite(false)
        setPendingTokenHash(null)
        setError(null)
        setReady(true)
        clearInviteUrl()
        return true
      }
      return false
    }

    const showInvalidInvite = (message = 'This invite link is invalid or has expired. Ask an administrator to send a new invite.') => {
      if (cancelled) return
      setError(message)
      setInvalidInvite(true)
      setReady(true)
      clearInviteUrl()
    }

    async function initialize() {
      const linkError = getInviteErrorMessage(initialInviteCallback.errorCode, initialInviteCallback.errorDescription)
      if (linkError) {
        showInvalidInvite(linkError)
        return
      }

      const isInviteLink = hasInviteParams() || initialInviteCallback.isInvite
      const code = getAuthCode()
      const tokenHash = getInviteTokenHash()

      if (isInviteLink && code) {
        const { data } = await supabase.auth.exchangeCodeForSession(code)
        if (cancelled || acceptSession(data.session)) return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled || acceptSession(session)) return

      if (isInviteLink && tokenHash) {
        setPendingTokenHash(tokenHash)
        setReady(true)
        return
      }

      if (!isInviteLink) {
        navigate('/login', { replace: true })
        return
      }

      timeoutId = window.setTimeout(async () => {
        const { data: { session: lateSession } } = await supabase.auth.getSession()
        if (cancelled || acceptSession(lateSession)) return
        showInvalidInvite()
      }, INVITE_SESSION_TIMEOUT_MS)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      acceptSession(session)
    })

    void initialize()

    return () => {
      cancelled = true
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [initialInviteCallback.errorCode, initialInviteCallback.errorDescription, initialInviteCallback.isInvite, navigate])

  const handleAcceptInvite = async () => {
    if (!pendingTokenHash) return

    setAcceptingInvite(true)
    setError(null)

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: pendingTokenHash,
      type: 'invite' as EmailOtpType,
    })

    setAcceptingInvite(false)

    if (verifyError || !data.session?.user) {
      setError(verifyError?.message || 'This invite link is invalid or has expired. Ask an administrator to send a new invite.')
      setInvalidInvite(true)
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

    setPendingTokenHash(null)
    setEmail(data.session.user.email ?? '')
    setInvalidInvite(false)
    setReady(true)
    window.history.replaceState({}, document.title, window.location.pathname)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess(true)
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
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
          <p className="text-sm text-[var(--text-muted)] font-mono tracking-wider uppercase">Account Setup</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-lift border border-[var(--border)] p-6">
          {invalidInvite ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-[var(--danger-lt)] flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Invite link unavailable</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-5">
                {error}
              </p>
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="w-full py-2.5 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium hover:bg-[var(--clinical-blue-dk)] transition-all shadow-sm"
              >
                Back to sign in
              </button>
            </div>
          ) : pendingTokenHash ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Accept your invite</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-5">
                Confirm this invite to continue setting up your staff account.
              </p>
              {error && (
                <div className="mb-4 flex items-start gap-2 text-sm text-red-700 bg-[var(--danger-lt)] border border-red-200 rounded-xl px-3.5 py-2.5 text-left">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}
              <button
                onClick={handleAcceptInvite}
                disabled={acceptingInvite}
                className="w-full py-2.5 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium hover:bg-[var(--clinical-blue-dk)] transition-all disabled:opacity-50 shadow-sm"
              >
                {acceptingInvite ? 'Accepting invite...' : 'Accept invite'}
              </button>
            </div>
          ) : success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Password set</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-5">
                Your account is ready. You can now sign in with your email and password going forward.
              </p>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="w-full py-2.5 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium hover:bg-[var(--clinical-blue-dk)] transition-all shadow-sm"
              >
                Continue
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-1">Welcome — set your password</h1>
              <p className="text-sm text-[var(--text-secondary)] mb-5 leading-relaxed">
                Your invite was accepted. Create a password so you can sign in anytime.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="Min. 8 characters"
                    className="w-full border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] bg-surface placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--clinical-blue)] focus:ring-2 focus:ring-[var(--clinical-blue)]/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                    Confirm password
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

                {error && (
                  <div className="flex items-start gap-2 text-sm text-red-700 bg-[var(--danger-lt)] border border-red-200 rounded-xl px-3.5 py-2.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-[var(--clinical-blue)] text-white text-sm font-medium hover:bg-[var(--clinical-blue-dk)] active:scale-[0.99] transition-all disabled:opacity-50 shadow-sm"
                >
                  {loading ? 'Setting password…' : 'Set password & continue'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
