import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { buildAppUrl } from '@/lib/tenant'
import { formatInviteEmailError } from '@/lib/invites'
import type { UserProfile } from '@/types'

export interface TenantUser extends UserProfile {
  siteName?: string | null
  unitName?: string | null
}

export function useTenantUsers(tenantId: string) {
  const [users, setUsers] = useState<TenantUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('user_profiles')
        .select(
          `
          *,
          site:sites(name),
          unit:units(name)
        `
        )
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (err) throw err

      const usersWithNames = (data || []).map(user => ({
        ...user,
        siteName: user.site?.name,
        unitName: user.unit?.name,
      }))

      setUsers(usersWithNames)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load users'
      setError(message)
      console.error('Error loading tenant users:', message)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  const inviteUser = useCallback(
    async (email: string, role: string, siteId?: string, unitId?: string) => {
      setInviting(true)
      setError(null)
      try {
        // Call edge function to send invite email and create pending invite
        const { data, error: err } = await supabase.functions.invoke('invite-user', {
          body: {
            email: email.trim().toLowerCase(),
            role,
            tenantId,
            siteId: siteId || null,
            unitId: unitId || null,
            redirectTo: buildAppUrl('/set-password'),
          },
        })

        if (err) throw err
        if (data?.error) throw new Error(data.error)

        await fetchUsers()
        return { success: true }
      } catch (err) {
        const rawMessage = err instanceof Error ? err.message : 'Failed to send invite'
        const message = formatInviteEmailError(rawMessage)
        setError(message)
        return { success: false, error: message }
      } finally {
        setInviting(false)
      }
    },
    [tenantId, fetchUsers]
  )

  const updateUserRole = useCallback(
    async (userId: string, role: string) => {
      setSaving(true)
      setError(null)
      try {
        const { error: err } = await supabase
          .from('user_profiles')
          .update({
            role,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (err) throw err
        await fetchUsers()
        return { success: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update role'
        setError(message)
        return { success: false, error: message }
      } finally {
        setSaving(false)
      }
    },
    [fetchUsers]
  )

  const updateUserAssignment = useCallback(
    async (userId: string, siteId?: string, unitId?: string) => {
      setSaving(true)
      setError(null)
      try {
        const { error: err } = await supabase
          .from('user_profiles')
          .update({
            site_id: siteId || null,
            unit_id: unitId || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (err) throw err
        await fetchUsers()
        return { success: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update assignment'
        setError(message)
        return { success: false, error: message }
      } finally {
        setSaving(false)
      }
    },
    [fetchUsers]
  )

  const deactivateUser = useCallback(
    async (userId: string) => {
      setSaving(true)
      setError(null)
      try {
        const { error: err } = await supabase
          .from('user_profiles')
          .update({
            active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (err) throw err
        await fetchUsers()
        return { success: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to deactivate user'
        setError(message)
        return { success: false, error: message }
      } finally {
        setSaving(false)
      }
    },
    [fetchUsers]
  )

  useEffect(() => {
    void fetchUsers()
  }, [tenantId, fetchUsers])

  return {
    users,
    loading,
    error,
    inviting,
    saving,
    fetch: fetchUsers,
    inviteUser,
    updateUserRole,
    updateUserAssignment,
    deactivateUser,
  }
}
