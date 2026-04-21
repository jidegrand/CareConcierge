import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { buildAppUrl } from '@/lib/tenant'
import type { UserProfile } from '@/types'

export interface UserWithMeta extends UserProfile {
  email: string
  last_sign_in?: string
  site_name?: string | null
  unit_name?: string
}

export interface PendingInvite {
  id: string
  email: string
  tenant_id: string
  site_id: string | null
  role: string
  unit_id: string | null
  site_name?: string
  unit_name?: string
  created_at: string
  pending: true
}

export function useUsers(tenantId: string | undefined) {
  const [users, setUsers] = useState<UserWithMeta[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!tenantId) {
      setUsers([])
      setPendingInvites([])
      setLoading(false)
      return
    }
    setLoading(true)

    const [profilesRes, invitesRes] = await Promise.all([
      supabase
        .from('user_profiles')
        .select(`*, site:sites(name), unit:units(name)`)
        .eq('tenant_id', tenantId)
        .order('active', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('pending_invites')
        .select(`*, site:sites(name), unit:units(name)`)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
    ])

    const mapped = (profilesRes.data ?? []).map((u: UserProfile & {
      site?: { name: string }
      unit?: { name: string }
    }) => ({
      ...u,
      email: u.id,
      site_name: u.site?.name ?? null,
      unit_name: u.unit?.name ?? null,
    })) as UserWithMeta[]

    const invites = (invitesRes.data ?? []).map((inv: PendingInvite & {
      site?: { name: string }
      unit?: { name: string }
    }) => ({
      ...inv,
      site_name: inv.site?.name ?? undefined,
      unit_name: inv.unit?.name ?? undefined,
      pending: true as const,
    }))

    setUsers(mapped)
    setPendingInvites(invites)
    setLoading(false)
  }, [tenantId])

  useEffect(() => { fetch() }, [fetch])

  const inviteUser = async (email: string, role: string, siteId: string | null, unitId: string | null) => {
    if (!tenantId) throw new Error('No tenant')
    const normalizedEmail = email.trim().toLowerCase()

    const { error: inviteErr } = await supabase
      .from('pending_invites')
      .insert({
        email: normalizedEmail,
        tenant_id: tenantId,
        role,
        site_id: siteId || null,
        unit_id: unitId || null,
      })
    if (inviteErr) throw new Error(inviteErr.message)

    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: true, emailRedirectTo: buildAppUrl('/set-password') },
    })
    if (otpErr) throw new Error(otpErr.message)

    await fetch()
  }

  const cancelInvite = async (inviteId: string) => {
    const { error: err } = await supabase.from('pending_invites').delete().eq('id', inviteId)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const updateRole = async (userId: string, role: string, siteId: string | null, unitId: string | null) => {
    const { error: err } = await supabase
      .from('user_profiles')
      .update({ role, site_id: siteId, unit_id: unitId })
      .eq('id', userId)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const setUserActive = async (userId: string, active: boolean) => {
    const { error: err } = await supabase.from('user_profiles').update({ active }).eq('id', userId)
    if (err) throw new Error(err.message)
    await fetch()
  }

  return { users, pendingInvites, loading, refresh: fetch, inviteUser, cancelInvite, updateRole, setUserActive }
}
