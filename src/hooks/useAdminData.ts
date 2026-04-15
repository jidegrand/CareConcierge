import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { buildAppUrl } from '@/lib/tenant'
import type { Site, Unit, Room, UserProfile, Tenant, TenantLicense } from '@/types'

type MaybeArray<T> = T | T[] | null | undefined

function getSingle<T>(value: MaybeArray<T>): T | undefined {
  if (Array.isArray(value)) return value[0]
  return value ?? undefined
}

// ── Extended types ────────────────────────────────────────────────────────────
export interface RoomWithQR extends Room {
  qrUrl: string
}

export interface UnitWithRooms extends Unit {
  rooms: Room[]
}

export interface SiteWithUnits extends Site {
  units: UnitWithRooms[]
}

export interface UserWithMeta extends UserProfile {
  email: string
  last_sign_in?: string
  unit_name?: string
}

export interface AdminStats {
  siteCount:   number
  unitCount:   number
  roomCount:   number
  userCount:   number
  requestsToday: number
}

export interface OrganizationWithStats extends Tenant {
  siteCount: number
  unitCount: number
  roomCount: number
  userCount: number
  requestTypeCount: number
}

export type TenantWithStats = OrganizationWithStats

export interface TenantLicenseRecord extends TenantLicense {
  organizationName: string
  organizationSlug: string
  exists: boolean
}

export interface PlatformAccessUser {
  id: string
  full_name: string | null
  role: string
  tenant_id: string
  unit_id: string | null
  created_at: string
  organizationName: string
  organizationSlug: string
  unitName: string | null
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ── Platform tenants hook ─────────────────────────────────────────────────────
export function useTenants(enabled = true) {
  const [tenants, setTenants] = useState<OrganizationWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!enabled) {
      setTenants([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const [tenantsRes, sitesRes, usersRes, requestTypesRes] = await Promise.all([
      supabase.from('tenants').select('id, name, slug, created_at').order('created_at'),
      supabase.from('sites').select('tenant_id, units(id, rooms(id))'),
      supabase.from('user_profiles').select('id, tenant_id'),
      supabase.from('request_types').select('id, tenant_id'),
    ])

    const firstError = tenantsRes.error ?? sitesRes.error ?? usersRes.error ?? requestTypesRes.error
    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    const tenantRows = (tenantsRes.data ?? []) as Tenant[]
    const siteRows = (sitesRes.data ?? []) as {
      tenant_id: string
      units?: { id: string; rooms?: { id: string }[] }[]
    }[]
    const userRows = (usersRes.data ?? []) as { tenant_id: string }[]
    const requestTypeRows = (requestTypesRes.data ?? []) as { tenant_id: string }[]

    const tenantSummaries = tenantRows.map((tenant) => {
      const tenantSites = siteRows.filter(site => site.tenant_id === tenant.id)
      const siteCount = tenantSites.length
      const unitCount = tenantSites.reduce((sum, site) => sum + (site.units?.length ?? 0), 0)
      const roomCount = tenantSites.reduce(
        (sum, site) => sum + (site.units ?? []).reduce((unitSum, unit) => unitSum + (unit.rooms?.length ?? 0), 0),
        0,
      )

      return {
        ...tenant,
        siteCount,
        unitCount,
        roomCount,
        userCount: userRows.filter(user => user.tenant_id === tenant.id).length,
        requestTypeCount: requestTypeRows.filter(requestType => requestType.tenant_id === tenant.id).length,
      }
    })

    setTenants(tenantSummaries)
    setLoading(false)
  }, [enabled])

  useEffect(() => { fetch() }, [fetch])

  const createTenant = async (name: string, slug?: string) => {
    const nextSlug = slugify(slug || name)
    const { error: err } = await supabase
      .from('tenants')
      .insert({ name: name.trim(), slug: nextSlug })
    if (err) throw new Error(err.message)
    await fetch()
  }

  const updateTenant = async (id: string, name: string, slug: string) => {
    const nextSlug = slugify(slug || name)
    const { error: err } = await supabase
      .from('tenants')
      .update({ name: name.trim(), slug: nextSlug })
      .eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const deleteTenant = async (id: string) => {
    const { error: err } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  return {
    tenants,
    loading,
    error,
    refresh: fetch,
    createTenant,
    updateTenant,
    deleteTenant,
  }
}

// ── Platform licensing hook ───────────────────────────────────────────────────
export function useTenantLicenses(enabled = true) {
  const [licenses, setLicenses] = useState<TenantLicenseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!enabled) {
      setLicenses([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const [tenantsRes, licensesRes] = await Promise.all([
      supabase.from('tenants').select('id, name, slug, created_at').order('created_at'),
      supabase.from('tenant_licenses').select('*').order('created_at'),
    ])

    const firstError = tenantsRes.error ?? licensesRes.error
    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    const tenantRows = (tenantsRes.data ?? []) as Tenant[]
    const licenseRows = (licensesRes.data ?? []) as TenantLicense[]

    const mapped = tenantRows.map((tenant) => {
      const license = licenseRows.find(entry => entry.tenant_id === tenant.id)
      return {
        id: license?.id ?? tenant.id,
        tenant_id: tenant.id,
        status: license?.status ?? 'trial',
        plan: license?.plan ?? 'pilot',
        site_limit: license?.site_limit ?? null,
        unit_limit: license?.unit_limit ?? null,
        room_limit: license?.room_limit ?? null,
        user_limit: license?.user_limit ?? null,
        starts_at: license?.starts_at ?? null,
        expires_at: license?.expires_at ?? null,
        features: license?.features ?? {},
        notes: license?.notes ?? null,
        created_at: license?.created_at ?? tenant.created_at,
        updated_at: license?.updated_at ?? tenant.created_at,
        organizationName: tenant.name,
        organizationSlug: tenant.slug,
        exists: Boolean(license),
      } satisfies TenantLicenseRecord
    })

    setLicenses(mapped)
    setLoading(false)
  }, [enabled])

  useEffect(() => { fetch() }, [fetch])

  const saveLicense = async (
    tenantId: string,
    values: Omit<TenantLicense, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>,
  ) => {
    const { error: err } = await supabase
      .from('tenant_licenses')
      .upsert({
        tenant_id: tenantId,
        ...values,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id' })

    if (err) throw new Error(err.message)
    await fetch()
  }

  const deleteLicense = async (tenantId: string) => {
    const { error: err } = await supabase
      .from('tenant_licenses')
      .delete()
      .eq('tenant_id', tenantId)

    if (err) throw new Error(err.message)
    await fetch()
  }

  return {
    licenses,
    loading,
    error,
    refresh: fetch,
    saveLicense,
    deleteLicense,
  }
}

// ── Platform access hook ──────────────────────────────────────────────────────
export function usePlatformAccess(enabled = true) {
  const [users, setUsers] = useState<PlatformAccessUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!enabled) {
      setUsers([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('user_profiles')
      .select(`
        id,
        tenant_id,
        unit_id,
        role,
        full_name,
        created_at,
        tenant:tenants (name, slug),
        unit:units (name)
      `)
      .order('created_at', { ascending: false })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    const mapped = ((data ?? []) as Array<UserProfile & {
      created_at: string
      tenant?: MaybeArray<{ name: string; slug: string }>
      unit?: MaybeArray<{ name: string }>
    }>).map((entry) => ({
      id: entry.id,
      full_name: entry.full_name,
      role: entry.role,
      tenant_id: entry.tenant_id,
      unit_id: entry.unit_id,
      created_at: entry.created_at,
      organizationName: getSingle(entry.tenant)?.name ?? 'Unknown organization',
      organizationSlug: getSingle(entry.tenant)?.slug ?? 'unknown',
      unitName: getSingle(entry.unit)?.name ?? null,
    }))

    setUsers(mapped)
    setLoading(false)
  }, [enabled])

  useEffect(() => { fetch() }, [fetch])

  const updateAccess = async (userId: string, values: {
    role: string
    unit_id: string | null
  }) => {
    const { error: err } = await supabase
      .from('user_profiles')
      .update(values)
      .eq('id', userId)

    if (err) throw new Error(err.message)
    await fetch()
  }

  return {
    users,
    loading,
    error,
    refresh: fetch,
    updateAccess,
  }
}

// ── Sites hook ────────────────────────────────────────────────────────────────
export function useSites(tenantId: string | undefined) {
  const [sites,   setSites]   = useState<SiteWithUnits[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!tenantId) {
      setSites([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: err } = await supabase
      .from('sites')
      .select(`*, units(*, rooms(*))`)
      .eq('tenant_id', tenantId)
      .order('name')
    if (err) { setError(err.message); setLoading(false); return }
    setSites((data ?? []) as SiteWithUnits[])
    setLoading(false)
  }, [tenantId])

  useEffect(() => { fetch() }, [fetch])

  // ── Site CRUD ────────────────────────────────────────────────────────────
  const createSite = async (name: string) => {
    if (!tenantId) return
    const slug = name.toLowerCase().replace(/\s+/g, '-')
    const { error: err } = await supabase
      .from('sites')
      .insert({ tenant_id: tenantId, name, slug })
    if (err) throw new Error(err.message)
    await fetch()
  }

  const updateSite = async (id: string, name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-')
    const { error: err } = await supabase
      .from('sites').update({ name, slug }).eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const deleteSite = async (id: string) => {
    const { error: err } = await supabase.from('sites').delete().eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  // ── Unit CRUD ────────────────────────────────────────────────────────────
  const createUnit = async (siteId: string, name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-')
    const { error: err } = await supabase
      .from('units').insert({ site_id: siteId, name, slug })
    if (err) throw new Error(err.message)
    await fetch()
  }

  const updateUnit = async (id: string, name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-')
    const { error: err } = await supabase
      .from('units').update({ name, slug }).eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const deleteUnit = async (id: string) => {
    const { error: err } = await supabase.from('units').delete().eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  // ── Room CRUD ────────────────────────────────────────────────────────────
  const createRoom = async (unitId: string, name: string, label?: string) => {
    const { error: err } = await supabase
      .from('rooms').insert({ unit_id: unitId, name, label: label || name, active: true })
    if (err) throw new Error(err.message)
    await fetch()
  }

  const updateRoom = async (id: string, name: string, label?: string) => {
    const { error: err } = await supabase
      .from('rooms').update({ name, label: label || name }).eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const toggleRoom = async (id: string, active: boolean) => {
    const { error: err } = await supabase
      .from('rooms').update({ active }).eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const deleteRoom = async (id: string) => {
    const { error: err } = await supabase.from('rooms').delete().eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  return {
    sites, loading, error, refresh: fetch,
    createSite, updateSite, deleteSite,
    createUnit, updateUnit, deleteUnit,
    createRoom, updateRoom, toggleRoom, deleteRoom,
  }
}

// ── Users hook ────────────────────────────────────────────────────────────────
export function useUsers(tenantId: string | undefined) {
  const [users,   setUsers]   = useState<UserWithMeta[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!tenantId) {
      setUsers([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('user_profiles')
      .select(`*, unit:units(name)`)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    const mapped = (data ?? []).map((u: UserProfile & { unit?: { name: string } }) => ({
      ...u,
      email:     u.id,   // placeholder — real email comes from auth.users (service role only)
      unit_name: u.unit?.name ?? null,
    })) as UserWithMeta[]

    setUsers(mapped)
    setLoading(false)
  }, [tenantId])

  useEffect(() => { fetch() }, [fetch])

  const inviteUser = async (email: string, role: string, unitId: string | null) => {
    // Step 1: send magic link / OTP (creates auth.users entry on first login)
    const { data: otpData, error: otpErr } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: buildAppUrl('/dashboard') },
    })
    if (otpErr) throw new Error(otpErr.message)

    // Step 2: we can't insert user_profile until they log in (FK constraint).
    // Store a pending invite record in a separate table or just note it.
    // We return the invite details so the caller can share or audit the invite.
    return { email, role, unitId, otpData }
  }

  const updateRole = async (userId: string, role: string, unitId: string | null) => {
    const { error: err } = await supabase
      .from('user_profiles')
      .update({ role, unit_id: unitId })
      .eq('id', userId)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const removeUser = async (userId: string) => {
    const { error: err } = await supabase
      .from('user_profiles').delete().eq('id', userId)
    if (err) throw new Error(err.message)
    await fetch()
  }

  return { users, loading, refresh: fetch, inviteUser, updateRole, removeUser }
}

// ── Admin stats ───────────────────────────────────────────────────────────────
export function useAdminStats(tenantId: string | undefined) {
  const [stats,   setStats]   = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) {
      setStats(null)
      setLoading(false)
      return
    }
    const run = async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0)

      const [sitesRes, usersRes, requestsRes] = await Promise.all([
        supabase.from('sites').select('id, units(id, rooms(id))', { count: 'exact' }).eq('tenant_id', tenantId),
        supabase.from('user_profiles').select('id', { count: 'exact' }).eq('tenant_id', tenantId),
        supabase
          .from('requests')
          .select(`
            id,
            room:rooms (
              unit:units (
                site:sites (tenant_id)
              )
            )
          `)
          .gte('created_at', today.toISOString()),
      ])

      const sites = (sitesRes.data ?? []) as { units: { rooms: { id: string }[] }[] }[]
      const requestRows = (requestsRes.data ?? []) as {
        room?: { unit?: { site?: { tenant_id?: string } } }
      }[]
      const unitCount = sites.reduce((a, s) => a + (s.units?.length ?? 0), 0)
      const roomCount = sites.reduce((a, s) => a + s.units.reduce((b, u) => b + (u.rooms?.length ?? 0), 0), 0)
      const requestsToday = requestRows.filter(r => r.room?.unit?.site?.tenant_id === tenantId).length

      setStats({
        siteCount:     sitesRes.count     ?? 0,
        unitCount,
        roomCount,
        userCount:     usersRes.count     ?? 0,
        requestsToday,
      })
      setLoading(false)
    }
    run()
  }, [tenantId])

  return { stats, loading }
}
