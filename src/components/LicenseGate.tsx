import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLicense } from '@/hooks/useLicense'

interface Props {
  children: React.ReactNode
}

// Roles that retain access even when the license has expired so they can manage renewal
const BYPASS_ROLES = new Set(['super_admin', 'tenant_admin'])

export default function LicenseGate({ children }: Props) {
  const { profile } = useAuth()
  const { isExpired, license, loading } = useLicense()
  const navigate = useNavigate()

  const isBypassed = !profile || BYPASS_ROLES.has(profile.role)

  if (loading || !isExpired || isBypassed) return <>{children}</>

  const expiryDisplay = license?.expires_at
    ? new Date(license.expires_at).toLocaleDateString(undefined, { dateStyle: 'long' })
    : null

  const isSuspended = license?.status === 'suspended' || license?.status === 'archived'

  return (
    <div
      className="flex-1 flex items-center justify-center p-8 min-h-full"
      style={{ background: 'var(--page-bg)' }}
      role="main"
      aria-label="Service suspended"
    >
      <div className="max-w-sm w-full text-center space-y-5">

        {/* Icon */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
          style={{ background: '#FEE2E2' }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>

        {/* Heading */}
        <div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {isSuspended ? 'Account Suspended' : 'License Expired'}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {isSuspended
              ? 'Your organization\'s account has been suspended. Please contact your administrator.'
              : <>
                  Your organization's license expired
                  {expiryDisplay ? <> on <strong>{expiryDisplay}</strong></> : ''}.
                </>
            }
          </p>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Contact your organization administrator to restore access.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-1">
          <button
            onClick={() => navigate('/support')}
            className="w-full px-6 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--clinical-blue)' }}
          >
            Contact Support
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="w-full px-6 py-3 rounded-xl font-medium border transition-colors text-sm"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--page-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Account Settings
          </button>
        </div>

        {/* License ID for support reference */}
        {license?.id && (
          <p className="text-xs pt-2" style={{ color: 'var(--text-muted)' }}>
            License ref: <span className="font-mono">{license.id.slice(0, 8).toUpperCase()}</span>
          </p>
        )}
      </div>
    </div>
  )
}
