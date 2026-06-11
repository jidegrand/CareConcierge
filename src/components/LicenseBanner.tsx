import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLicense, EXPIRY_GRACE_PERIOD_DAYS } from '@/hooks/useLicense'

// Session dismiss key for the "expiring soon" warning banner only —
// suspended/expired (grace period) banners are never dismissible.
const WARNING_DISMISS_KEY = 'bayrequest_license_banner_dismissed:warning'

export default function LicenseBanner() {
  const { profile } = useAuth()
  const { isExpired, isSuspended, isExpiringSoon, daysUntilExpiry, license, loading } = useLicense()
  const navigate = useNavigate()

  // 'suspended': RLS already blocks patient access (status suspended/archived,
  // or expires_at past the grace period).
  // 'expired': expires_at has passed but RLS still allows access (in grace period).
  // 'warning': approaching expiry, access unaffected.
  const tier: 'suspended' | 'expired' | 'warning' | null =
    isSuspended ? 'suspended' :
    isExpired ? 'expired' :
    isExpiringSoon ? 'warning' :
    null

  const [dismissed, setDismissed] = useState(false)

  // Reset dismiss state when tier escalates (e.g. user returns when days ≤ 7)
  useEffect(() => {
    if (tier !== 'warning') { setDismissed(false); return }
    try {
      setDismissed(!!sessionStorage.getItem(WARNING_DISMISS_KEY))
    } catch {
      setDismissed(false)
    }
  }, [tier])

  // super_admin is exempt — they manage tenant licenses from the platform console
  if (loading || !tier || profile?.role === 'super_admin') return null
  // suspended/expired banners are never dismissible; warning banners respect the session flag
  if (tier === 'warning' && dismissed) return null

  const isTenantAdmin = profile?.role === 'tenant_admin'

  const handleDismiss = () => {
    try { sessionStorage.setItem(WARNING_DISMISS_KEY, '1') } catch {}
    setDismissed(true)
  }

  const expiryDisplay = license?.expires_at
    ? new Date(license.expires_at).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : null

  const isSuspendedByStatus = license?.status === 'suspended' || license?.status === 'archived'

  const remainingGraceDays = daysUntilExpiry !== null
    ? Math.max(0, EXPIRY_GRACE_PERIOD_DAYS + daysUntilExpiry)
    : null
  const graceDaysDisplay =
    remainingGraceDays === 0 ? 'today' :
    remainingGraceDays === 1 ? '1 day' :
    `${remainingGraceDays} days`

  /* ── Suspended banner — RLS is already blocking patient access ──────────── */
  if (tier === 'suspended') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 text-sm font-medium"
        style={{ background: '#DC2626', color: '#fff' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-shrink-0">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span className="flex-1 min-w-0">
          <strong>Service suspended</strong>
          {' — '}
          {isSuspendedByStatus
            ? "Your organization's license has been suspended."
            : <>Your organization's license expired{expiryDisplay && <> on {expiryDisplay}</>} and the grace period has ended.</>}
          {' '}Patient requests are blocked. Contact your administrator to renew.
        </span>
        {isTenantAdmin && (
          <button
            onClick={() => navigate('/tenant-admin/licensing')}
            className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: 'rgba(255,255,255,0.2)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
          >
            Renew License
          </button>
        )}
      </div>
    )
  }

  /* ── Expired banner — past due, but still within the grace period ───────── */
  if (tier === 'expired') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 text-sm font-medium"
        style={{ background: '#DC2626', color: '#fff' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-shrink-0">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span className="flex-1 min-w-0">
          <strong>License expired</strong>
          {expiryDisplay && <> — expired {expiryDisplay}.</>}
          {' '}Patient requests will be suspended in {graceDaysDisplay} unless renewed.
        </span>
        {isTenantAdmin && (
          <button
            onClick={() => navigate('/tenant-admin/licensing')}
            className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: 'rgba(255,255,255,0.2)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
          >
            Renew License
          </button>
        )}
      </div>
    )
  }

  /* ── Expiring soon banner ─────────────────────────────────────────────────── */
  const urgentSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7
  const bg = urgentSoon ? '#92400e' : '#78350f'
  const fg = '#FEF3C7'

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 text-sm font-medium"
      style={{ background: bg, color: fg }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-shrink-0">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      <span className="flex-1 min-w-0">
        <strong>
          {daysUntilExpiry === 0
            ? 'License expires today'
            : `License expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`}
        </strong>
        {expiryDisplay && <> ({expiryDisplay}).</>}
        {' '}Renew to avoid service interruption.
      </span>
      {isTenantAdmin && (
        <button
          onClick={() => navigate('/tenant-admin/licensing')}
          className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
          style={{ background: 'rgba(254,243,199,0.15)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(254,243,199,0.25)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(254,243,199,0.15)')}
        >
          Renew
        </button>
      )}
      <button
        onClick={handleDismiss}
        title="Dismiss for this session"
        className="flex-shrink-0 p-1 rounded transition-colors"
        style={{ color: fg }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        aria-label="Dismiss license warning"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}
