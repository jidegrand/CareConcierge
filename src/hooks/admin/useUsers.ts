import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { buildAppUrl } from '@/lib/tenant'
import type { UserProfile } from '@/types'

export interface UserWithMeta extends UserProfile {
  email: string
  last_sign_in?: string
  unit_name?: string
}

export interface PendingInvite {
  id: string
  email: string
  tenant_id: string
  role: string
  unit_id: string | null
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
        .select(`*, unit:units(name)`)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
      supabase
        .from('pending_invites')
        .select(`*, unit:units(name)`)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
    ])

    const mapped = (profilesRes.data ?? []).map((u: UserProfile & { unit?: { name: string } }) => ({
      ...u,
      email: u.id,
      unit_name: u.unit?.name ?? null,
    })) as UserWithMeta[]

    const invites = (invitesRes.data ?? []).map((inv: PendingInvite & { unit?: { name: string } }) => ({
      ...inv,
      unit_name: inv.unit?.name ?? undefined,
      pending: true as const,
    }))

    setUsers(mapped)
    setPendingInvites(invites)
    setLoading(false)
  }, [tenantId])

  useEffect(() => { fetch() }, [fetch])

  const inviteUser = async (email: string, role: string, unitId: string | null) => {
    if (!tenantId) throw new Error('No tenant')
    const { error: inviteErr } = await supabase
      .from('pending_invites')
      .insert({ email: email.trim().toLowerCase(), tenant_id: tenantId, role, unit_id: unitId || null })
    if (inviteErr) throw new Error(inviteErr.message)

    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email,
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

  const updateRole = async (userId: string, role: string, unitId: string | null) => {
    const { error: err } = await supabase.from('user_profiles').update({ role, unit_id: unitId }).eq('id', userId)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const removeUser = async (userId: string) => {
    const { error: err } = await supabase.from('user_profiles').delete().eq('id', userId)
    if (err) throw new Error(err.message)
    await fetch()
  }

  return { users, pendingInvites, loading, refresh: fetch, inviteUser, cancelInvite, updateRole, removeUser }
}
