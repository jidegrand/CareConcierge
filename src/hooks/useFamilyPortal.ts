import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { buildRequestTypeMap } from '@/lib/constants'
import type { FamilyMember, Request, Resident, RequestTypeConfig, StaffNote } from '@/types'

export interface FamilyActivityItem {
  id: string
  text: string
  detail: string | null
  timestamp: string
  statusColor: 'green' | 'amber' | 'gray'
}

interface MutationResult {
  success: boolean
  error?: string
}

const formatMinutes = (seconds: number): string => {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  return remMinutes ? `${hours} hr ${remMinutes} min` : `${hours} hr`
}

function buildActivity(requests: Request[], notes: StaffNote[], requestTypeMap: Record<string, RequestTypeConfig>): FamilyActivityItem[] {
  const fromRequests: FamilyActivityItem[] = requests.map(r => {
    const config = requestTypeMap[r.type]
    const label = config?.label ?? r.type.replace(/_/g, ' ')
    const isFamily = r.source === 'family'
    const text = isFamily ? `Your request: ${label}` : `${label} requested`

    let detail: string | null = null
    let statusColor: FamilyActivityItem['statusColor'] = 'gray'
    if (r.status === 'resolved' && r.resolved_at) {
      const seconds = (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()) / 1000
      detail = `resolved in ${formatMinutes(seconds)}`
      statusColor = 'green'
    } else if (r.status === 'acknowledged') {
      detail = 'in progress'
      statusColor = 'amber'
    } else {
      detail = 'pending'
      statusColor = 'amber'
    }

    return { id: `request-${r.id}`, text, detail, timestamp: r.created_at, statusColor }
  })

  const fromNotes: FamilyActivityItem[] = notes.map(n => ({
    id: `note-${n.id}`,
    text: n.body,
    detail: null,
    timestamp: n.created_at,
    statusColor: 'green',
  }))

  return [...fromRequests, ...fromNotes]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 15)
}

export function useFamilyPortal(tenantId: string | undefined) {
  const [familyMember, setFamilyMember] = useState<FamilyMember | null>(null)
  const [resident, setResident] = useState<Resident | null>(null)
  const [requestTypes, setRequestTypes] = useState<RequestTypeConfig[]>([])
  const [activity, setActivity] = useState<FamilyActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const requestTypeMap = useMemo(() => buildRequestTypeMap(requestTypes), [requestTypes])
  const familyRequestTypes = useMemo(
    () => requestTypes.filter(rt => rt.audience === 'family'),
    [requestTypes]
  )

  const fetchActivity = useCallback(async (residentId: string) => {
    const [requestsRes, notesRes] = await Promise.all([
      supabase
        .from('requests')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('staff_notes')
        .select('*')
        .eq('resident_id', residentId)
        .eq('visible_to_family', true)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    const requests = (requestsRes.data ?? []) as Request[]
    const notes = (notesRes.data ?? []) as StaffNote[]
    setActivity(buildActivity(requests, notes, requestTypeMap))
  }, [requestTypeMap])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not signed in.')
      setLoading(false)
      return
    }

    const { data: memberData, error: memberErr } = await supabase
      .from('family_members')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (memberErr || !memberData) {
      setError('No linked resident found for this account.')
      setLoading(false)
      return
    }

    const member = memberData as FamilyMember
    setFamilyMember(member)

    const { data: residentData, error: residentErr } = await supabase
      .from('residents')
      .select('*')
      .eq('id', member.resident_id)
      .maybeSingle()

    if (residentErr || !residentData) {
      setError('Resident details are unavailable.')
      setLoading(false)
      return
    }

    const resolvedResident = residentData as Resident
    setResident(resolvedResident)

    if (tenantId) {
      const { data: typesData } = await supabase
        .from('request_types')
        .select('id, tenant_id, label, icon, color, urgent, active, sort_order, audience')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .order('sort_order', { ascending: true })

      setRequestTypes((typesData ?? []) as RequestTypeConfig[])
    }

    await fetchActivity(resolvedResident.id)
    setLoading(false)
  }, [tenantId, fetchActivity])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Re-derive activity labels once request types load (avoids a second resident fetch)
  useEffect(() => {
    if (resident && requestTypes.length > 0) void fetchActivity(resident.id)
  }, [resident, requestTypes, fetchActivity])

  useEffect(() => {
    if (!resident) return
    const interval = window.setInterval(() => { fetchActivity(resident.id) }, 20_000)
    const onFocus = () => { fetchActivity(resident.id) }
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [resident, fetchActivity])

  const submitRequest = useCallback(async (typeId: string): Promise<MutationResult> => {
    if (!resident) return { success: false, error: 'No resident found.' }
    if (!resident.room_id) return { success: false, error: 'Resident is not currently assigned to a room.' }

    const typeConfig = requestTypeMap[typeId]

    const { error: err } = await supabase.from('requests').insert({
      room_id: resident.room_id,
      resident_id: resident.id,
      type: typeId,
      is_urgent: typeConfig?.urgent ?? false,
      status: 'pending',
      source: 'family',
    })

    if (err) return { success: false, error: err.message }
    await fetchActivity(resident.id)
    return { success: true }
  }, [resident, requestTypeMap, fetchActivity])

  return {
    loading,
    error,
    familyMember,
    resident,
    requestTypes: familyRequestTypes,
    activity,
    submitRequest,
    refresh: fetchAll,
  }
}
