import { useAuth } from '@/hooks/useAuth'
import { useLicense } from '@/hooks/useLicense'

export interface FeatureGateState {
  enabled: boolean
  loading: boolean
}

// Checks whether an entitlement feature (see src/lib/licenseFeatures.ts) is
// enabled for the current user's tenant license (LICENSING_ACTION_PLAN #6).
export function useFeatureGate(featureKey: string): FeatureGateState {
  const { profile } = useAuth()
  const { license, loading } = useLicense()

  // super_admin manages the platform, not a single tenant's entitlements
  if (profile?.role === 'super_admin') {
    return { enabled: true, loading: false }
  }

  return { enabled: license?.features?.[featureKey] === true, loading }
}
