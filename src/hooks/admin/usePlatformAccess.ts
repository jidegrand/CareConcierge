import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { buildAppUrl } from '@/lib/tenant'
import { formatInviteEmailError, getInviteAuthorizationHeaders, getInviteFunctionError } from '@/lib/invites'
import { getSingle, type MaybeArray } from '@/lib/utils'
export interface PlatformAccessUser {
  id: string
  email: string | null
  full_name: string | null
  role: string
  tenant_id: string
  site_id: string | null
  unit_id: string | null
  created_at: string
  active: boolean
  organizationName: string
  organizationSlug: string
  siteName: string | null
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
      .select(`id, tenant_id, site_id, unit_id, role, full_name, created_at, active, tenant:tenants (name, slug), site:sites (name), unit:units (name)`)
      .order('created_at', { ascending: false })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    const mapped = ((data ?? []) as Array<{
      id: string
      full_name: string | null
      role: string
      tenant_id: string
      site_id: string | null
      unit_id: string | null
      created_at: string
      active: boolean
      tenant?: MaybeArray<{ name: string; slug: string }>
      site?: MaybeArray<{ name: string }>
      unit?: MaybeArray<{ name: string }>
    }>).map((entry) => ({
      id: entry.id,
      email: null as string | null,
      full_name: entry.full_name,
      role: entry.role,
      tenant_id: entry.tenant_id,
      site_id: entry.site_id,
      unit_id: entry.unit_id,
      created_at: entry.created_at,
      active: entry.active,
      organizationName: getSingle(entry.tenant)?.name ?? 'Unknown organization',
      organizationSlug: getSingle(entry.tenant)?.slug ?? 'unknown',
      siteName: getSingle(entry.site)?.name ?? null,
      unitName: getSingle(entry.unit)?.name ?? null,
    }))

    setUsers(mapped)
    setLoading(false)

    try {
      // Best-effort enrichment: use the existing session token directly. Do NOT
      // call getInviteAuthorizationHeaders here — its forced refreshSession()
      // rotates the refresh token, and running that on every fetch (including
      // after every mutation) races with Supabase's own auto-refresh and tears
      // down the session, logging the admin out.
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) return

      const { data: emailData, error: emailError } = await supabase.functions.invoke('platform-user-admin', {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { action: 'emails', userIds: mapped.map(u => u.id) },
      })
      if (!emailError) {
        const emails = (emailData as { emails?: Record<string, string> } | null)?.emails ?? {}
        setUsers(current => current.map(u => ({ ...u, email: emails[u.id] ?? u.email })))
      }
    } catch {
      // Email lookup is a best-effort enrichment; ignore failures.
    }
  }, [enabled])

  useEffect(() => { fetch() }, [fetch])

  const updateAccess = async (userId: string, values: { role: string; site_id: string | null; unit_id: string | null }) => {
    const { error: err } = await supabase.from('user_profiles').update(values).eq('id', userId)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const setUserActive = async (userId: string, active: boolean) => {
    const { error: err } = await supabase.from('user_profiles').update({ active }).eq('id', userId)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const deleteUser = async (userId: string) => {
    const headers = await getInviteAuthorizationHeaders()
    const { data, error: err } = await supabase.functions.invoke('platform-user-admin', {
      headers,
      body: { action: 'delete', userId },
    })
    const errorMessage = await getInviteFunctionError(data, err)
    if (errorMessage) throw new Error(errorMessage)
    await fetch()
  }

  const inviteSuperAdmin = async (email: string, tenantId: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    const headers = await getInviteAuthorizationHeaders()

    // First, check if this email is already invited
    const { data: existingInvites } = await supabase
      .from('pending_invites')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('tenant_id', tenantId)
      .single()

    if (existingInvites) {
      throw new Error(`An invite has already been sent to ${normalizedEmail}`)
    }

    const { data, error: inviteError } = await supabase.functions.invoke('invite-user', {
      headers,
      body: {
        email: normalizedEmail,
        role: 'super_admin',
        tenantId,
        siteId: null,
        unitId: null,
        redirectTo: buildAppUrl('/set-password'),
      },
    })
    const errorMessage = await getInviteFunctionError(data, inviteError)
    if (errorMessage) throw new Error(formatInviteEmailError(errorMessage))

    // Confirm the invite landed in the database; the upsert can lag slightly behind the function response
    let inviteCreated = false
    for (let attempt = 0; attempt < 3 && !inviteCreated; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 500))
      const { data: newInvite } = await supabase
        .from('pending_invites')
        .select('id')
        .eq('email', normalizedEmail)
        .eq('tenant_id', tenantId)
        .single()

      if (newInvite) inviteCreated = true
    }

    if (!inviteCreated) {
      console.warn(`Invite to ${normalizedEmail} was accepted but not yet visible in pending_invites; it may still be processing`)
    }

    await fetch()
  }

  return { users, loading, error, refresh: fetch, updateAccess, setUserActive, deleteUser, inviteSuperAdmin }
}
