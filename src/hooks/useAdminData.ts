// ── Barrel re-export ──────────────────────────────────────────────────────────
// All hooks and types have been split into domain-specific files under
// hooks/admin/. This file re-exports everything so existing imports remain
// unchanged.

export type { OrganizationWithStats, TenantWithStats } from '@/hooks/admin/useTenants'
export { useTenants } from '@/hooks/admin/useTenants'

export type { TenantLicenseRecord } from '@/hooks/admin/useLicenses'
export { useTenantLicenses } from '@/hooks/admin/useLicenses'

export type { PlatformAccessUser } from '@/hooks/admin/usePlatformAccess'
export { usePlatformAccess } from '@/hooks/admin/usePlatformAccess'

export type { RoomWithQR, UnitWithRooms, SiteWithUnits } from '@/hooks/admin/useSites'
export { useSites } from '@/hooks/admin/useSites'

export type { UserWithMeta, PendingInvite } from '@/hooks/admin/useUsers'
export { useUsers } from '@/hooks/admin/useUsers'

export type { AdminStats } from '@/hooks/admin/useAdminStats'
export { useAdminStats } from '@/hooks/admin/useAdminStats'
