// Single source of truth for license feature flags (LICENSING_ACTION_PLAN #5).
//
// - 'included': always available to every tenant today, not stored in
//   tenant_licenses.features and not toggleable by super admins.
// - 'entitlement': stored in tenant_licenses.features, toggleable from the
//   Platform Licensing editor, and checked via useLicenseUsage().hasFeature().
// - 'coming_soon': not yet implemented anywhere — shown for roadmap
//   visibility but never toggleable or "Included".
export type LicenseFeatureCategory = 'included' | 'entitlement' | 'coming_soon'

export interface LicenseFeature {
  key: string
  label: string
  icon: string
  description: string
  category: LicenseFeatureCategory
}

export const LICENSE_FEATURES: LicenseFeature[] = [
  { key: 'patient_feedback', label: 'Patient Feedback', icon: '💬', description: 'Patients can rate and leave feedback after a request is resolved.', category: 'included' },
  { key: 'custom_branding', label: 'Custom Branding', icon: '🎨', description: "Upload your organization's logo and set a primary color.", category: 'included' },
  { key: 'qr_codes', label: 'QR Code Management', icon: '📱', description: 'Generate and print QR code sheets for rooms.', category: 'entitlement' },
  { key: 'custom_requests', label: 'Custom Request Types', icon: '🧩', description: "Configure request types specific to your organization.", category: 'entitlement' },
  { key: 'reports', label: 'Reports & Analytics', icon: '📊', description: 'Charts, exports, and performance reporting.', category: 'entitlement' },
  { key: 'audit_logs', label: 'Audit Logs & Compliance', icon: '📋', description: 'Searchable history of requests and admin actions.', category: 'entitlement' },
  { key: 'api_access', label: 'API Access', icon: '🔌', description: 'Programmatic access to your organization\'s data.', category: 'coming_soon' },
  { key: 'sso', label: 'Single Sign-On (SSO)', icon: '🔐', description: "Sign in with your organization's identity provider.", category: 'coming_soon' },
]

export const ENTITLEMENT_FEATURES = LICENSE_FEATURES.filter(f => f.category === 'entitlement')
