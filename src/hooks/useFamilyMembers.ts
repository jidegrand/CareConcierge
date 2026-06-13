import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { buildAppUrl } from '@/lib/tenant'
import { getInviteAuthorizationHeaders, getInviteFunctionError, formatInviteEmailError } from '@/lib/invites'
import type { FamilyAccessLevel, FamilyMember } from '@/types'

interface MutationResult {
  success: boolean
  error?: string
  warning?: string
}

export function useFamilyMembers(residentId: string | null) {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFamilyMembers = useCallback(async () => {
    if (!residentId) { setFamilyMembers([]); setLoading(false); return }

    setLoading(true)
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('resident_id', residentId)
      .neq('status', 'revoked')
      .order('created_at')

    if (!error) setFamilyMembers((data ?? []) as FamilyMember[])
    setLoading(false)
  }, [residentId])

  useEffect(() => { fetchFamilyMembers() }, [fetchFamilyMembers])

  const inviteFamilyMember = useCallback(async (input: {
    fullName: string
    email: string
    relationship?: string
    accessLevel?: FamilyAccessLevel
  }): Promise<MutationResult> => {
    if (!residentId) return { success: false, error: 'Missing resident context.' }

    try {
      const headers = await getInviteAuthorizationHeaders()
      const { data, error } = await supabase.functions.invoke('send-family-invite', {
        headers,
        body: {
          residentId,
          fullName: input.fullName.trim(),
          email: input.email.trim().toLowerCase(),
          relationship: input.relationship?.trim() || null,
          accessLevel: input.accessLevel ?? 'digest',
          redirectTo: buildAppUrl('/family/accept'),
        },
      })

      const errorMessage = await getInviteFunctionError(data, error)
      if (errorMessage) throw new Error(errorMessage)

      await fetchFamilyMembers()
      return { success: true, warning: (data as { warning?: string } | null)?.warning }
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : 'Failed to send invite'
      return { success: false, error: formatInviteEmailError(rawMessage) }
    }
  }, [residentId, fetchFamilyMembers])

  const revokeFamilyMember = useCallback(async (familyMemberId: string): Promise<MutationResult> => {
    const { error } = await supabase
      .from('family_members')
      .update({ status: 'revoked' })
      .eq('id', familyMemberId)

    if (error) return { success: false, error: error.message }
    await fetchFamilyMembers()
    return { success: true }
  }, [fetchFamilyMembers])

  return { familyMembers, loading, inviteFamilyMember, revokeFamilyMember, refresh: fetchFamilyMembers }
}
