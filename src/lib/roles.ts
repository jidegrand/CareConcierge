import type { ReactNode } from 'react'

export type UserRole =
  | 'super_admin'
  | 'nurse_manager'
  | 'nurse'
  | 'volunteer'
  | 'tenant_admin'
  | 'site_manager'
  | 'charge_nurse'
  | 'viewer'

export const ROLE_CFG: Record<UserRole, {
  label: string
  description: string
  color: string
  bg: string
  rank: number
}> = {
  super_admin:   { label: 'Super Admin',   description: 'Full platform access',              color: '#5B21B6', bg: '#EDE9FE', rank: 0 },
  tenant_admin:  { label: 'Tenant Admin',  description: 'Tenant-wide admin access',          color: '#5B21B6', bg: '#EDE9FE', rank: 0 },
  nurse_manager: { label: 'Nurse Manager', description: 'Management and reporting access',   color: '#1D4ED8', bg: '#DBEAFE', rank: 1 },
  site_manager:  { label: 'Site Manager',  description: 'Site and unit administration',      color: '#1D4ED8', bg: '#DBEAFE', rank: 1 },
  charge_nurse:  { label: 'Charge Nurse',  description: 'Unit operations and room admin',    color: '#1D4ED8', bg: '#DBEAFE', rank: 1 },
  nurse:         { label: 'Nurse',         description: 'Full request management',           color: '#065F46', bg: '#ECFDF5', rank: 2 },
  volunteer:     { label: 'Volunteer',     description: 'Limited request handling',          color: '#92400E', bg: '#FEF3C7', rank: 3 },
  viewer:        { label: 'Viewer',        description: 'Read-only unit visibility',         color: '#92400E', bg: '#FEF3C7', rank: 3 },
}

export type Permission =
  | 'requests.view'
  | 'requests.acknowledge'
  | 'requests.resolve'
  | 'requests.create'
  | 'page.platform'
  | 'page.dashboard'
  | 'page.feed'
  | 'page.baymap'
  | 'page.staffing'
  | 'page.reports'
  | 'page.admin'
  | 'page.qrsheet'
  | 'page.settings'
  | 'admin.sites'
  | 'admin.rooms'
  | 'admin.users'
  | 'admin.users.own_unit'
  | 'admin.tenants'
  | 'admin.qr'
  | 'admin.request_types'
  | 'reports.view'
  | 'reports.export'
  | 'staffing.view'
  | 'staffing.manage'
  | 'settings.profile'
  | 'settings.notifications'
  | 'settings.security'
  | 'settings.preferences'

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'requests.view', 'requests.acknowledge', 'requests.resolve', 'requests.create',
    'page.platform',
    'page.dashboard', 'page.feed', 'page.baymap', 'page.staffing',
    'page.reports', 'page.admin', 'page.qrsheet', 'page.settings',
    'admin.sites', 'admin.rooms', 'admin.users', 'admin.users.own_unit',
    'admin.tenants', 'admin.qr', 'admin.request_types',
    'reports.view', 'reports.export',
    'staffing.view', 'staffing.manage',
    'settings.profile', 'settings.notifications', 'settings.security', 'settings.preferences',
  ],
  tenant_admin: [
    'requests.view', 'requests.acknowledge', 'requests.resolve', 'requests.create',
    'page.dashboard', 'page.feed', 'page.baymap', 'page.staffing',
    'page.reports', 'page.admin', 'page.qrsheet', 'page.settings',
    'admin.sites', 'admin.rooms', 'admin.users', 'admin.users.own_unit',
    'admin.qr', 'admin.request_types',
    'reports.view', 'reports.export',
    'staffing.view', 'staffing.manage',
    'settings.profile', 'settings.notifications', 'settings.security', 'settings.preferences',
  ],
  nurse_manager: [
    'requests.view', 'requests.acknowledge', 'requests.resolve', 'requests.create',
    'page.dashboard', 'page.feed', 'page.baymap', 'page.staffing',
    'page.reports', 'page.admin', 'page.qrsheet', 'page.settings',
    'admin.rooms', 'admin.users.own_unit', 'admin.qr', 'admin.request_types',
    'reports.view', 'reports.export',
    'staffing.view', 'staffing.manage',
    'settings.profile', 'settings.notifications', 'settings.security', 'settings.preferences',
  ],
  site_manager: [
    'requests.view', 'requests.acknowledge', 'requests.resolve', 'requests.create',
    'page.dashboard', 'page.feed', 'page.baymap', 'page.staffing',
    'page.reports', 'page.admin', 'page.qrsheet', 'page.settings',
    'admin.rooms', 'admin.users.own_unit', 'admin.qr', 'admin.request_types',
    'reports.view', 'reports.export',
    'staffing.view', 'staffing.manage',
    'settings.profile', 'settings.notifications', 'settings.security', 'settings.preferences',
  ],
  charge_nurse: [
    'requests.view', 'requests.acknowledge', 'requests.resolve', 'requests.create',
    'page.dashboard', 'page.feed', 'page.baymap', 'page.staffing',
    'page.reports', 'page.admin', 'page.qrsheet', 'page.settings',
    'admin.rooms', 'admin.request_types',
    'reports.view', 'reports.export',
    'staffing.view',
    'settings.profile', 'settings.notifications', 'settings.security', 'settings.preferences',
  ],
  nurse: [
    'requests.view', 'requests.acknowledge', 'requests.resolve',
    'page.dashboard', 'page.feed', 'page.baymap', 'page.staffing', 'page.settings',
    'staffing.view',
    'settings.profile', 'settings.notifications', 'settings.security', 'settings.preferences',
  ],
  volunteer: [
    'requests.view', 'requests.acknowledge',
    'page.dashboard', 'page.feed', 'page.baymap', 'page.settings',
    'settings.profile', 'settings.notifications',
  ],
  viewer: [
    'requests.view',
    'page.dashboard', 'page.feed', 'page.baymap', 'page.settings',
    'settings.profile',
  ],
}

export function can(role: UserRole | string | undefined, permission: Permission): boolean {
  if (!role) return false
  const perms = ROLE_PERMISSIONS[role as UserRole]
  if (!perms) return false
  return perms.includes(permission)
}

export function canAll(role: UserRole | string | undefined, ...permissions: Permission[]): boolean {
  return permissions.every(permission => can(role, permission))
}

export function canAny(role: UserRole | string | undefined, ...permissions: Permission[]): boolean {
  return permissions.some(permission => can(role, permission))
}

export interface NavItem {
  path: string
  label: string
  perm: Permission
  section: 'main' | 'bottom'
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard',   perm: 'page.dashboard', section: 'main' },
  { path: '/feed',      label: 'Patient Feed', perm: 'page.feed',     section: 'main' },
  { path: '/bay-map',   label: 'Bay Map',      perm: 'page.baymap',   section: 'main' },
  { path: '/staffing',  label: 'Staffing',     perm: 'page.staffing', section: 'main' },
  { path: '/reports',   label: 'Reports',      perm: 'page.reports',  section: 'main' },
  { path: '/settings',  label: 'Settings',     perm: 'page.settings', section: 'bottom' },
]

export function isAtLeast(role: UserRole | string | undefined, minRole: UserRole): boolean {
  const current = ROLE_CFG[role as UserRole]
  const minimum = ROLE_CFG[minRole]
  if (!current || !minimum) return false
  return current.rank <= minimum.rank
}

export function getRoleLabel(role: string | undefined): string {
  return ROLE_CFG[role as UserRole]?.label ?? role ?? 'Unknown'
}

export function feedIsReadOnly(role: string | undefined): boolean {
  return role === 'volunteer' || role === 'viewer'
}

export function canResolve(role: string | undefined): boolean {
  return can(role, 'requests.resolve')
}

export function RequirePermission({
  perm,
  role,
  fallback = null,
  children,
}: {
  perm: Permission
  role: string | undefined
  fallback?: ReactNode
  children: ReactNode
}): JSX.Element {
  return (can(role, perm) ? children : fallback) as JSX.Element
}
