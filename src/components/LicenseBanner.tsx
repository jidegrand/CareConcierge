import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLicense } from '@/hooks/useLicense'

// Per-session dismiss keys — escalates at ≤7 days so it re-shows on critical threshold
function dismissKey(tier: 'critical' | 'warning') {
  return `bayrequest_license_banner_dismissed:${tier}`
}

export default function LicenseBanner() {
  const { profile } = useAuth()
  const { isExpired, isExpiringSoon, daysUntilExpiry, license, loading } = useLicense()
  const navigate = useNavigate()

  const tier: 'critical' | 'warning' | null =
    isExpired ? 'critical' :
    isExpiringSoon ? 'warning' :
    null

  const [dismissed, setDismissed] = useState(false)

  // Reset dismiss state when tier escalates (e.g. user returns when days ≤ 7)
  useEffect(() => {
    if (!tier) { setDismissed(false); return }
    try {
      setDismissed(!!sessionStorage.getItem(dismissKey(tier)))
    } catch {
      setDismissed(false)
    }
  }, [tier])

  // super_admin is exempt — they manage tenant licenses from the platform console
  if (loading || !tier || profile?.role === 'super_admin') return null
  // expired banners are never dismissible; warning banners respect the session flag
  if (tier === 'warning' && dismissed) return null

  const isTenantAdmin = profile?.role === 'tenant_admin'

  const handleDismiss = () => {
    try { sessionStorage.setItem(dismissKey('warning'), '1') } catch {}
    setDismissed(true)
  }

  const expiryDisplay = license?.expires_at
    ? new Date(license.expires_at).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : null

  /* ── Expired banner ──────────────────────────────────────────────────────── */
  if (tier === 'critical') {
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
          {' '}Service is suspended. Contact your administrator to renew.
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
