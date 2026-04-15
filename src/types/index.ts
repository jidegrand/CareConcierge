// ─── Database row types (mirror Supabase schema) ─────────────────────────────

export type RequestStatus = 'pending' | 'acknowledged' | 'resolved'

export type RequestType = string

export interface Tenant {
  id: string
  name: string
  slug: string
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

export interface Site {
  id: string
  tenant_id: string
  name: string
  slug: string
  created_at: string
}

export interface Unit {
  id: string
  site_id: string
  name: string
  slug: string
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
}

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
  // Joined
  room?: Room
  acknowledger?: { id: string; full_name: string | null }
  resolver?: { id: string; full_name: string | null }
}

// ─── UI config types ──────────────────────────────────────────────────────────

export interface RequestTypeConfig {
  id: string
  label: string
  icon: string
  color: string
  urgent: boolean
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

export interface UserProfile {
  id: string
  tenant_id: string
  unit_id: string | null
  role: UserRole
  full_name: string | null
  email: string
}
