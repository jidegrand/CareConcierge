import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/hooks/useSession'
import { useTenantContext } from '@/hooks/useTenantContext'
import { PRODUCT_NAME } from '@/lib/brand'

type Mode = 'signin' | 'signup'

export default function AuthPage() {
  const navigate = useNavigate()
  const { session, loading: sessionLoading } = useSession()
  const { tenantId, tenantName, unitId } = useTenantContext()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'nurse' | 'charge_nurse' | 'site_manager' | 'tenant_admin'>('nurse')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionLoading && session) navigate('/dashboard', { replace: true })
  }, [session, sessionLoading, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)

    try {
      if (mode === 'signup') {
        if (!tenantId) throw new Error('Open the tenant subdomain first so the new account can be attached to the correct organisation.')
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              tenant_id: tenantId,
              role,
              full_name: fullName || undefined,
              unit_id: unitId,
            },
          },
        })
        if (err) throw err
        if (!data.session) {
          setInfo('Check your email to confirm the account, then sign in.')
          setMode('signin')
          return
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
      }
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="font-mono text-xs tracking-widest text-[#1d8cf8] uppercase mb-1">
            {PRODUCT_NAME}
          </p>
          <h1 className="text-xl font-semibold text-white">
            {mode === 'signin' ? 'Sign in' : 'Create staff account'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {mode === 'signin'
              ? `Access the ${PRODUCT_NAME} dashboard.`
              : `Register for ${tenantName ?? PRODUCT_NAME}.`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <Field label="Full name">
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="auth-input"
                  placeholder="Jane Doe"
                />
              </Field>
              <Field label="Role">
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="auth-input"
                >
                  <option value="nurse">Nurse</option>
                  <option value="charge_nurse">Charge nurse</option>
                  <option value="site_manager">Site manager</option>
                  <option value="tenant_admin">Tenant admin (first user only)</option>
                </select>
              </Field>
            </>
          )}

          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="auth-input"
              placeholder={tenantName ? `you@${tenantName.toLowerCase().replace(/\s+/g, '')}.org` : 'you@hospital.org'}
              autoComplete="email"
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="auth-input"
              placeholder="••••••••"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </Field>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded px-3 py-2">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm text-teal bg-teal/10 border border-teal/20 rounded px-3 py-2">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-[#1d8cf8] hover:bg-[#1a7fe0] disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded transition-colors"
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
              setInfo(null)
            }}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            {mode === 'signin'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </div>

        {mode === 'signup' && role === 'tenant_admin' && (
          <p className="mt-6 text-xs text-gray-600 leading-relaxed">
            Note: new signups default to the <code>nurse</code> role in the DB. To become
            tenant_admin, sign up first, then call the <code>claim_tenant_admin</code> RPC
            once — only the first caller per tenant succeeds.
          </p>
        )}
      </div>

      <style>{`
        .auth-input {
          width: 100%;
          background: #181b25;
          border: 1px solid #2a2d3a;
          color: white;
          font-size: 14px;
          padding: 10px 12px;
          border-radius: 6px;
          outline: none;
        }
        .auth-input:focus {
          border-color: #1d8cf8;
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-widest text-gray-500 block mb-1.5">
        {label}
      </span>
      {children}
    </label>
  )
}
