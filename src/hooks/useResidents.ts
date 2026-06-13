import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Resident } from '@/types'

interface MutationResult {
  success: boolean
  error?: string
}

interface UseResidentsResult {
  residents: Resident[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  createResident: (displayName: string, roomId: string) => Promise<MutationResult>
  assignToRoom: (residentId: string, roomId: string) => Promise<MutationResult>
  deactivateResident: (residentId: string) => Promise<MutationResult>
}

// Fetches all residents (active + inactive) for a tenant, with realtime
// updates, plus CRUD helpers for assigning/moving/deactivating residents.
export function useResidents(tenantId: string | undefined): UseResidentsResult {
  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchResidents = useCallback(async () => {
    if (!tenantId) { setResidents([]); setLoading(false); return }

    setLoading(true)
    const { data, error: err } = await supabase
      .from('residents')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('display_name')

    if (err) {
      setError(err.message)
    } else {
      setError(null)
      setResidents((data ?? []) as Resident[])
    }
    setLoading(false)
  }, [tenantId])

  useEffect(() => { fetchResidents() }, [fetchResidents])

  useEffect(() => {
    if (!tenantId) return
    const channel = supabase
      .channel(`residents:tenant:${tenantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'residents' }, () => fetchResidents())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tenantId, fetchResidents])

  const createResident = useCallback(async (displayName: string, roomId: string): Promise<MutationResult> => {
    if (!tenantId) return { success: false, error: 'Missing tenant context.' }

    const existing = residents.find(r => r.room_id === roomId && r.active)
    if (existing) return { success: false, error: 'This room already has an assigned resident. Move or deactivate them first.' }

    const { error: err } = await supabase
      .from('residents')
      .insert({ tenant_id: tenantId, room_id: roomId, display_name: displayName.trim(), active: true })

    if (err) return { success: false, error: err.message }
    await fetchResidents()
    return { success: true }
  }, [tenantId, residents, fetchResidents])

  const assignToRoom = useCallback(async (residentId: string, roomId: string): Promise<MutationResult> => {
    const occupant = residents.find(r => r.room_id === roomId && r.active && r.id !== residentId)
    if (occupant) return { success: false, error: 'This room already has an assigned resident. Move or deactivate them first.' }

    const { error: err } = await supabase
      .from('residents')
      .update({ room_id: roomId, active: true, updated_at: new Date().toISOString() })
      .eq('id', residentId)

    if (err) return { success: false, error: err.message }
    await fetchResidents()
    return { success: true }
  }, [residents, fetchResidents])

  const deactivateResident = useCallback(async (residentId: string): Promise<MutationResult> => {
    const { error: err } = await supabase
      .from('residents')
      .update({ active: false, room_id: null, updated_at: new Date().toISOString() })
      .eq('id', residentId)

    if (err) return { success: false, error: err.message }
    await fetchResidents()
    return { success: true }
  }, [fetchResidents])

  return { residents, loading, error, refresh: fetchResidents, createResident, assignToRoom, deactivateResident }
}
