import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { buildAppUrl } from '@/lib/tenant'
import { getSingle, type MaybeArray } from '@/lib/utils'
import type { UserProfile } from '@/types'

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
      .select(`id, tenant_id, unit_id, role, full_name, created_at, tenant:tenants (name, slug), unit:units (name)`)
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

  const updateAccess = async (userId: string, values: { role: string; unit_id: string | null }) => {
    const { error: err } = await supabase.from('user_profiles').update(values).eq('id', userId)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const inviteSuperAdmin = async (email: string, tenantId: string) => {
    const { error: inviteErr } = await supabase
      .from('pending_invites')
      .insert({ email: email.trim().toLowerCase(), tenant_id: tenantId, role: 'super_admin', unit_id: null })
    if (inviteErr) throw new Error(inviteErr.message)

    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: buildAppUrl('/set-password') },
    })
    if (otpErr) throw new Error(otpErr.message)

    await fetch()
  }

  return { users, loading, error, refresh: fetch, updateAccess, inviteSuperAdmin }
}
