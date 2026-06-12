import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useTenantContext } from '@/hooks/useTenantContext'
import { useLicenseUsage } from '@/hooks/tenant/useLicenseUsage'
import { useAuditLogs } from '@/hooks/tenant/useAuditLogs'

interface OnboardingStatus {
  step_organization: boolean
  step_create_site: boolean
  step_create_units: boolean
  step_invite_users: boolean
  step_configure_requests: boolean
  step_print_qr: boolean
  step_send_test_request: boolean
}

const ONBOARDING_STEPS = [
  { key: 'step_organization', label: 'Set Up Organization', description: 'Configure name and branding' },
  { key: 'step_create_site', label: 'Create First Site', description: 'Add a physical location' },
  { key: 'step_create_units', label: 'Create Units', description: 'Add departments or wards' },
  { key: 'step_invite_users', label: 'Invite Staff', description: 'Add team members' },
  { key: 'step_configure_requests', label: 'Configure Requests', description: 'Set up request types' },
  { key: 'step_print_qr', label: 'Generate QR Codes', description: 'Print patient-facing codes' },
  { key: 'step_send_test_request', label: 'Send Test Request', description: 'Try the system end-to-end' },
]

export default function TenantDashboardPage() {
  const navigate = useNavigate()
  const { tenant } = useTenantContext()
  const { usage } = useLicenseUsage(tenant?.id || '')
  const { logs } = useAuditLogs(tenant?.id || '')
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch onboarding status
  useEffect(() => {
    if (!tenant?.id) return

    const fetchOnboarding = async () => {
      try {
        const { data, error } = await supabase
          .from('onboarding_checklist')
          .select('*')
          .eq('tenant_id', tenant.id)
          .single()

        if (error && error.code !== 'PGRST116') throw error
        setOnboarding(data as OnboardingStatus)
      } catch (err) {
        console.error('Error loading onboarding:', err)
      } finally {
        setLoading(false)
      }
    }

    void fetchOnboarding()
  }, [tenant?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Calculate onboarding progress
  const completedSteps = onboarding
    ? Object.entries(onboarding)
        .filter(([key]) => key.startsWith('step_'))
        .filter(([, value]) => value === true).length
    : 0
  const totalSteps = ONBOARDING_STEPS.length
  const progressPercent = Math.round((completedSteps / totalSteps) * 100)

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* Welcome & Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Welcome Card */}
        <div className="lg:col-span-2 bg-gradient-to-br from-[var(--clinical-blue)] to-[var(--primary-color)] text-white rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
          <p className="text-sm opacity-90">Manage your organization and track care operations.</p>
          <div className="mt-4 pt-4 border-t border-white border-opacity-20">
            <p className="text-sm opacity-75">Onboarding Progress</p>
            <div className="mt-2 bg-white bg-opacity-20 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-sm mt-2 font-semibold">{completedSteps} of {totalSteps} steps complete</p>
          </div>
        </div>

        {/* Stats Cards */}
        <StatCard
          label="Active Users"
          value={usage?.users.current || 0}
          limit={usage?.users.limit}
          icon="👥"
          onClick={() => navigate('/tenant-admin/users')}
        />
        <StatCard
          label="Sites"
          value={usage?.sites.current || 0}
          limit={usage?.sites.limit}
          icon="🏥"
          onClick={() => navigate('/tenant-admin/sites')}
        />
      </div>

      {/* More Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Units"
          value={usage?.units.current || 0}
          limit={usage?.units.limit}
          icon="🔨"
        />
        <StatCard
          label="Rooms"
          value={usage?.rooms.current || 0}
          limit={usage?.rooms.limit}
          icon="🛏️"
        />
        <StatCard
          label="Plan"
          value={usage?.plan || 'N/A'}
          icon="📋"
          onClick={() => navigate('/tenant-admin/licensing')}
        />
        <StatCard
          label="Status"
          value={usage?.status === 'active' ? '✓ Active' : usage?.status || 'Unknown'}
          icon={usage?.status === 'active' ? '✅' : '⚠️'}
          onClick={() => navigate('/tenant-admin/licensing')}
        />
      </div>

      {/* Onboarding Checklist */}
      <div className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)]">
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Setup Checklist</h3>
        <div className="space-y-2">
          {ONBOARDING_STEPS.map(step => {
            const isCompleted = onboarding?.[step.key as keyof OnboardingStatus] || false
            return (
              <div
                key={step.key}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--hover-bg)] cursor-pointer transition"
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isCompleted
                    ? 'bg-[var(--clinical-blue)] border-[var(--clinical-blue)]'
                    : 'border-[var(--border)]'
                }`}>
                  {isCompleted && <span className="text-white text-xs">✓</span>}
                </div>
                <div>
                  <p className={`font-medium ${isCompleted ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-primary)]'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">{step.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      {logs && logs.length > 0 && (
        <div className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Recent Activity</h3>
            <button
              onClick={() => navigate('/tenant-admin/audit-logs')}
              className="text-sm text-[var(--clinical-blue)] hover:underline"
            >
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {logs.slice(0, 5).map(log => (
              <div key={log.id} className="flex items-start gap-3 pb-3 border-b border-[var(--border)] last:border-b-0 last:pb-0">
                <span className="text-lg mt-1">
                  {log.action === 'acknowledged' ? '👋' : log.action === 'resolved' ? '✅' : '📝'}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {log.action === 'acknowledged' ? 'Request Acknowledged' : log.action === 'resolved' ? 'Request Resolved' : 'Request Updated'}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {log.room_name && <span>{log.room_name} · </span>}
                    {log.actor_name || 'System'} · {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard
          icon="⚙️"
          label="Organization Settings"
          description="Customize branding and preferences"
          onClick={() => navigate('/tenant-admin/settings')}
        />
        <QuickActionCard
          icon="👥"
          label="Manage Users"
          description="Invite staff and assign roles"
          onClick={() => navigate('/tenant-admin/users')}
        />
        <QuickActionCard
          icon="📋"
          label="View License"
          description="Check usage and plan details"
          onClick={() => navigate('/tenant-admin/licensing')}
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  limit,
  icon,
  onClick,
}: {
  label: string
  value: string | number
  limit?: number | null
  icon: string
  onClick?: () => void
}) {
  const isNearLimit = limit && typeof value === 'number' && value >= limit * 0.8
  const isAtLimit = limit && typeof value === 'number' && value >= limit

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`p-4 rounded-lg border text-left transition ${
        onClick ? 'hover:shadow-md cursor-pointer' : ''
      } ${
        isAtLimit
          ? 'bg-red-50 border-red-200'
          : isNearLimit
            ? 'bg-amber-50 border-amber-200'
            : 'bg-[var(--surface)] border-[var(--border)]'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[var(--text-secondary)] font-medium">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${
            isAtLimit
              ? 'text-red-600'
              : isNearLimit
                ? 'text-amber-600'
                : 'text-[var(--text-primary)]'
          }`}>
            {value}
          </p>
          {limit && (
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              of {limit} allowed
            </p>
          )}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </button>
  )
}

function QuickActionCard({
  icon,
  label,
  description,
  onClick,
}: {
  icon: string
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:shadow-md transition text-left"
    >
      <span className="text-2xl block mb-2">{icon}</span>
      <p className="font-semibold text-[var(--text-primary)]">{label}</p>
      <p className="text-xs text-[var(--text-secondary)] mt-1">{description}</p>
    </button>
  )
}
