import { useTenantContext } from '@/hooks/useTenantContext'
import { useLicenseUsage } from '@/hooks/tenant/useLicenseUsage'
import { LICENSE_FEATURES } from '@/lib/licenseFeatures'

function UsageBar({
  label,
  current,
  limit,
  icon,
}: {
  label: string
  current: number
  limit: number | null
  icon: string
}) {
  const percentage = limit ? Math.min((current / limit) * 100, 100) : 0
  const isExceeded = limit !== null && current >= limit
  const isNearLimit = limit !== null && current >= limit * 0.8

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
        </div>
        <span
          className={`text-sm font-semibold ${
            isExceeded ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-[var(--text-secondary)]'
          }`}
        >
          {current}{limit ? `/${limit}` : ''}
        </span>
      </div>
      {limit && (
        <div className="w-full bg-[var(--surface-subtle)] rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all ${
              isExceeded ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-[var(--clinical-blue)]'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default function LicensingPage() {
  const { tenant } = useTenantContext()
  const { usage, loading, error, isExpired, isExpiringSoon, hasFeature, isLimitExceeded } = useLicenseUsage(
    tenant?.id || ''
  )

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg border border-red-300 bg-red-50 text-red-700">
        Error loading license information: {error}
      </div>
    )
  }

  if (!usage) {
    return (
      <div className="text-center py-8 text-[var(--text-secondary)]">
        No license information available.
      </div>
    )
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'enterprise':
        return { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' }
      case 'professional':
        return { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' }
      case 'starter':
        return { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' }
      default:
        return { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700' }
    }
  }

  const planColors = getPlanColor(usage.plan)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Licensing & Usage</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            View your plan, features, and usage limits
          </p>
        </div>
      </div>

      {/* Alerts */}
      {isExpired() && (
        <div className="p-4 rounded-lg border border-red-300 bg-red-50 text-red-700 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <strong className="block">License Expired</strong>
            <p className="text-sm mt-1">
              Your license expired on {new Date(usage.expiresAt || '').toLocaleDateString()}. Please renew your license to continue using the platform.
            </p>
          </div>
        </div>
      )}

      {isExpiringSoon(30) && !isExpired() && (
        <div className="p-4 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-700 flex items-start gap-3">
          <span className="text-xl">⏰</span>
          <div>
            <strong className="block">License Expiring Soon</strong>
            <p className="text-sm mt-1">
              Your license expires in {usage.daysUntilExpiry} days ({new Date(usage.expiresAt || '').toLocaleDateString()}). Plan your renewal now to avoid service interruption.
            </p>
          </div>
        </div>
      )}

      {/* License Card */}
      <div className={`rounded-2xl border p-6 ${planColors.bg} ${planColors.border}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className={`text-2xl font-bold capitalize ${planColors.text}`}>{usage.plan}</h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  usage.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {usage.status.charAt(0).toUpperCase() + usage.status.slice(1)}
              </span>
            </div>
            <p className={`text-sm ${planColors.text} opacity-75 mb-4`}>
              {usage.startsAt && `Started: ${new Date(usage.startsAt).toLocaleDateString()} • `}
              {usage.expiresAt
                ? `Expires: ${new Date(usage.expiresAt).toLocaleDateString()}`
                : 'No expiration date'}
            </p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Days Until Expiry
                </p>
                <p className={`text-2xl font-bold ${
                  usage.daysUntilExpiry === null
                    ? 'text-[var(--text-primary)]'
                    : usage.daysUntilExpiry <= 0
                    ? 'text-red-600'
                    : usage.daysUntilExpiry <= 30
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`}>
                  {usage.daysUntilExpiry === null ? '∞' : Math.max(0, usage.daysUntilExpiry)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Plan Status
                </p>
                <p className="text-2xl font-bold text-[var(--text-primary)] capitalize">
                  {usage.status}
                </p>
              </div>
            </div>
          </div>
          <button className="px-6 py-3 bg-[var(--clinical-blue)] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity whitespace-nowrap">
            Upgrade Plan
          </button>
        </div>
      </div>

      {/* Usage Limits */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">Resource Usage</h3>
        <div className="space-y-6">
          <UsageBar
            label="Sites"
            current={usage.sites.current}
            limit={usage.sites.limit}
            icon="🏥"
          />
          <UsageBar
            label="Units"
            current={usage.units.current}
            limit={usage.units.limit}
            icon="🚨"
          />
          <UsageBar
            label="Rooms"
            current={usage.rooms.current}
            limit={usage.rooms.limit}
            icon="🛏️"
          />
          <UsageBar
            label="Users"
            current={usage.users.current}
            limit={usage.users.limit}
            icon="👥"
          />
        </div>
      </div>

      {/* Features */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">Available Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LICENSE_FEATURES.map((feature) => {
            const isComingSoon = feature.category === 'coming_soon'
            const isEnabled = feature.category === 'included' || (feature.category === 'entitlement' && hasFeature(feature.key))
            return (
              <div
                key={feature.key}
                className={`p-4 rounded-lg border flex items-center gap-3 ${
                  isEnabled
                    ? 'bg-green-50 border-green-200'
                    : 'bg-[var(--surface-subtle)] border-[var(--border)] opacity-50'
                }`}
              >
                <span className="text-2xl">{feature.icon}</span>
                <div>
                  <p className={`font-medium ${isEnabled ? 'text-green-900' : 'text-[var(--text-secondary)]'}`}>
                    {feature.label}
                  </p>
                  {isEnabled && <p className="text-xs text-green-700">Included</p>}
                  {!isEnabled && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      {isComingSoon ? 'Coming soon' : 'Not available'}
                    </p>
                  )}
                </div>
                {isEnabled && (
                  <span className="ml-auto text-xl">✓</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Limit Warnings */}
      {(isLimitExceeded('sites') ||
        isLimitExceeded('units') ||
        isLimitExceeded('rooms') ||
        isLimitExceeded('users')) && (
        <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-6">
          <h3 className="text-lg font-bold text-yellow-900 mb-4">Resource Limits Reached</h3>
          <ul className="space-y-2 text-sm text-yellow-800">
            {isLimitExceeded('sites') && (
              <li>• You have reached your site limit. Upgrade your plan to add more sites.</li>
            )}
            {isLimitExceeded('units') && (
              <li>• You have reached your unit limit. Upgrade your plan to add more units.</li>
            )}
            {isLimitExceeded('rooms') && (
              <li>• You have reached your room limit. Upgrade your plan to add more rooms.</li>
            )}
            {isLimitExceeded('users') && (
              <li>• You have reached your user limit. Upgrade your plan to add more users.</li>
            )}
          </ul>
        </div>
      )}

      {/* License Details */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">License Details</h3>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Plan
            </dt>
            <dd className="text-lg font-semibold text-[var(--text-primary)] capitalize mt-1">
              {usage.plan}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Status
            </dt>
            <dd className="text-lg font-semibold text-[var(--text-primary)] capitalize mt-1">
              {usage.status}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Starts At
            </dt>
            <dd className="text-lg font-semibold text-[var(--text-primary)] mt-1">
              {usage.startsAt ? new Date(usage.startsAt).toLocaleDateString() : '-'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Expires At
            </dt>
            <dd className="text-lg font-semibold text-[var(--text-primary)] mt-1">
              {usage.expiresAt ? new Date(usage.expiresAt).toLocaleDateString() : 'Never'}
            </dd>
          </div>
        </dl>
      </div>

      {/* CTA */}
      <div className="rounded-2xl border border-[var(--clinical-blue)] bg-blue-50 p-6 text-center">
        <h3 className="text-lg font-bold text-[var(--clinical-blue)] mb-2">Need more capacity?</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Upgrade your plan to unlock more features and higher usage limits.
        </p>
        <button className="px-6 py-2 bg-[var(--clinical-blue)] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity">
          View Upgrade Options
        </button>
      </div>
    </div>
  )
}
