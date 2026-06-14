// ─── Database row types (mirror Supabase schema) ─────────────────────────────

export type RequestStatus = 'pending' | 'acknowledged' | 'resolved'

export type RequestType = string

export interface Tenant {
  id: string
  name: string
  slug: string
  organization_url: string | null
  created_at: string
}

export interface TenantLicense {
  id: string
  tenant_id: string
  status: 'trial' | 'active' | 'suspended' | 'archived'
  plan: 'pilot' | 'standard' | 'enterprise' | 'custom'
  site_limit: number | null
  unit_limit: number | null
  room_limit: number | null
  user_limit: number | null
  starts_at: string | null
  expires_at: string | null
  features: Record<string, boolean>
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TenantSetting {
  tenant_id: string
  patient_feedback_enabled: boolean
  patient_idle_redirect_url: string | null
  logo_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  default_language?: string | null
  enable_patient_feedback?: boolean | null
  enable_qr_codes?: boolean | null
  resident_profiles_enabled?: boolean
  onboarding_completed?: boolean | null
  onboarding_step?: string | null
  settings?: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface Site {
  id: string
  tenant_id: string
  name: string
  slug: string
  hospital_url: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  phone?: string | null
  created_at: string
}

export interface Unit {
  id: string
  site_id: string
  name: string
  slug: string
  room_naming_template: string
  capacity?: number | null
  created_at: string
}

export interface Room {
  id: string
  unit_id: string
  name: string
  label: string | null
  active: boolean
  created_at: string
  // Joined fields (from view or select with relations)
  unit?: Unit & { site?: Site & { tenant?: Tenant } }
  resident?: { id: string; display_name: string } | null
}

export type RequestSource = 'patient' | 'staff' | 'family'

export interface Request {
  id: string
  room_id: string
  type: RequestType
  status: RequestStatus
  is_urgent: boolean
  created_at: string
  acknowledged_at: string | null
  acknowledged_by: string | null
  resolved_at: string | null
  resolved_by: string | null
  resident_id?: string | null
  source?: RequestSource
  // Joined
  room?: Room
  resident?: { id: string; display_name: string } | null
  acknowledger?: { id: string; full_name: string | null }
  resolver?: { id: string; full_name: string | null }
  staffNote?: { body: string } | null
}

export interface Resident {
  id: string
  tenant_id: string
  room_id: string | null
  display_name: string
  active: boolean
  created_at: string
  updated_at: string
}

export type FamilyAccessLevel = 'full' | 'digest'
export type FamilyMemberStatus = 'invited' | 'active' | 'revoked'

export interface FamilyMember {
  id: string
  resident_id: string
  auth_user_id: string | null
  full_name: string
  relationship: string | null
  email: string | null
  phone: string | null
  access_level: FamilyAccessLevel
  status: FamilyMemberStatus
  created_at: string
}

export interface StaffNote {
  id: string
  resident_id: string
  request_id: string | null
  author_id: string
  body: string
  visible_to_family: boolean
  created_at: string
}

export type FamilyChatSenderRole = 'family' | 'staff'

export interface FamilyChatMessage {
  id: string
  resident_id: string
  sender_role: FamilyChatSenderRole
  sender_id: string
  sender_name: string
  sender_role_title: string | null
  body: string
  created_at: string
}

export interface FamilyChatResidentSummary {
  resident_id: string
  resident_name: string
  room_label: string | null
  last_message_at: string | null
  last_message_body: string | null
  last_message_role: FamilyChatSenderRole | null
  unread_count: number
}

export interface RequestFeedback {
  id: string
  request_id: string
  rating: number
  created_at: string
}

// ─── UI config types ──────────────────────────────────────────────────────────

export interface RequestTypeConfig {
  id: string
  label: string
  icon: string
  color: string
  urgent: boolean
  audience?: 'patient' | 'family'
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export type UserRole =
  | 'tenant_admin'
  | 'site_manager'
  | 'charge_nurse'
  | 'nurse'
  | 'viewer'
  | 'super_admin'
  | 'nurse_manager'
  | 'volunteer'
  | 'family'

export interface UserProfile {
  id: string
  tenant_id: string
  site_id: string | null
  unit_id: string | null
  role: UserRole
  full_name: string | null
  active: boolean
  email: string
}
