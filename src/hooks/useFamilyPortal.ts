import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { buildRequestTypeMap, requestDisplayLabel, CUSTOM_REQUEST_TYPE_ID } from '@/lib/constants'
import { buildAppUrl } from '@/lib/tenant'
import { getInviteAuthorizationHeaders, getInviteFunctionError, formatInviteEmailError } from '@/lib/invites'
import type { FamilyMember, Resident, RequestTypeConfig } from '@/types'

export interface FamilyActivityItem {
  id: string
  text: string
  detail: string | null
  timestamp: string
  statusColor: 'green' | 'amber' | 'gray'
  staffAttribution: string | null
  attachmentUrl?: string | null
  attachmentType?: string | null
  attachmentName?: string | null
}

interface FamilyActivityRequest {
  id: string
  type: string
  custom_text: string | null
  status: 'pending' | 'acknowledged' | 'resolved'
  is_urgent: boolean
  source: 'patient' | 'staff' | 'family' | null
  created_at: string
  acknowledged_at: string | null
  resolved_at: string | null
  resolved_by_name: string | null
  resolved_by_role_title: string | null
}

interface FamilyActivityNote {
  id: string
  request_id: string | null
  body: string
  created_at: string
  author_name: string | null
  author_role_title: string | null
  attachment_path: string | null
  attachment_type: string | null
  attachment_name: string | null
}

function formatStaffAttribution(name: string | null, roleTitle: string | null): string | null {
  if (!name) return null
  return roleTitle ? `${name} ${roleTitle}` : name
}

interface MutationResult {
  success: boolean
  error?: string
  warning?: string
}

interface SubmitRequestResult extends MutationResult {
  requestId?: string
}

const formatMinutes = (seconds: number): string => {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  return remMinutes ? `${hours} hr ${remMinutes} min` : `${hours} hr`
}

function buildActivity(requests: FamilyActivityRequest[], notes: (FamilyActivityNote & { attachmentUrl?: string | null })[], requestTypeMap: Record<string, RequestTypeConfig>): FamilyActivityItem[] {
  const fromRequests: FamilyActivityItem[] = requests.map(r => {
    const isCustom = r.type === CUSTOM_REQUEST_TYPE_ID && !!r.custom_text
    const label = requestDisplayLabel(r, requestTypeMap)
    const isFamily = r.source === 'family'
    const text = isFamily
      ? `Your request: ${label}`
      : isCustom
        ? `Custom request: ${label}`
        : `${label} requested`

    let detail: string | null = null
    let statusColor: FamilyActivityItem['statusColor'] = 'gray'
    let staffAttribution: string | null = null
    if (r.status === 'resolved' && r.resolved_at) {
      const seconds = (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()) / 1000
      detail = `resolved in ${formatMinutes(seconds)}`
      statusColor = 'green'
      staffAttribution = formatStaffAttribution(r.resolved_by_name, r.resolved_by_role_title)
    } else if (r.status === 'acknowledged') {
      detail = 'in progress'
      statusColor = 'amber'
    } else {
      detail = 'pending'
      statusColor = 'amber'
    }

    return { id: `request-${r.id}`, text, detail, timestamp: r.created_at, statusColor, staffAttribution }
  })

  const fromNotes: FamilyActivityItem[] = notes.map(n => ({
    id: `note-${n.id}`,
    text: n.body,
    detail: null,
    timestamp: n.created_at,
    statusColor: 'green',
    staffAttribution: formatStaffAttribution(n.author_name, n.author_role_title),
    attachmentUrl: n.attachmentUrl,
    attachmentType: n.attachment_type,
    attachmentName: n.attachment_name,
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
  const [activeFamilyRequestTypes, setActiveFamilyRequestTypes] = useState<Set<string>>(new Set())
  const [activeFamilyRequestIds, setActiveFamilyRequestIds] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const requestTypeMap = useMemo(() => buildRequestTypeMap(requestTypes), [requestTypes])
  const requestTypeMapRef = useRef(requestTypeMap)
  requestTypeMapRef.current = requestTypeMap

  const familyRequestTypes = useMemo(
    () => requestTypes.filter(rt => rt.audience === 'family'),
    [requestTypes]
  )

  const fetchActivity = useCallback(async (residentId: string) => {
    const [requestsRes, notesRes] = await Promise.all([
      supabase.rpc('list_family_requests', { target_resident_id: residentId }),
      supabase.rpc('list_family_notes', { target_resident_id: residentId }),
    ])

    const requests = (requestsRes.data ?? []) as FamilyActivityRequest[]
    const notes = (notesRes.data ?? []) as FamilyActivityNote[]

    const attachmentPaths = notes
      .map(n => n.attachment_path)
      .filter((p): p is string => !!p)

    const signedUrls: Record<string, string> = {}
    if (attachmentPaths.length > 0) {
      const { data: signed } = await supabase.storage
        .from('staff-note-attachments')
        .createSignedUrls(attachmentPaths, 3600)

      for (const s of signed ?? []) {
        if (s.signedUrl && !s.error) signedUrls[s.path ?? ''] = s.signedUrl
      }
    }

    const notesWithAttachments = notes.map(n => ({
      ...n,
      attachmentUrl: n.attachment_path ? signedUrls[n.attachment_path] : undefined,
    }))

    setActivity(buildActivity(requests, notesWithAttachments, requestTypeMapRef.current))

    const activeRequests = requests
      .filter(r => r.source === 'family' && (r.status === 'pending' || r.status === 'acknowledged'))
    setActiveFamilyRequestTypes(new Set(activeRequests.map(r => r.type)))
    setActiveFamilyRequestIds(Object.fromEntries(activeRequests.map(r => [r.type, r.id])))
  }, [])

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

  const submitRequest = useCallback(async (typeId: string): Promise<SubmitRequestResult> => {
    if (!resident) return { success: false, error: 'No resident found.' }
    if (!resident.room_id) return { success: false, error: 'Resident is not currently assigned to a room.' }
    if (activeFamilyRequestTypes.has(typeId)) return { success: false, error: 'This request is already in progress.' }

    const typeConfig = requestTypeMap[typeId]

    const { data, error: err } = await supabase.from('requests').insert({
      room_id: resident.room_id,
      resident_id: resident.id,
      type: typeId,
      is_urgent: typeConfig?.urgent ?? false,
      status: 'pending',
      source: 'family',
    }).select('id').single()

    if (err) return { success: false, error: err.message }
    await fetchActivity(resident.id)
    return { success: true, requestId: (data as { id: string }).id }
  }, [resident, requestTypeMap, activeFamilyRequestTypes, fetchActivity])

  const inviteSibling = useCallback(async (input: {
    fullName: string
    email: string
    relationship?: string
  }): Promise<MutationResult> => {
    try {
      const headers = await getInviteAuthorizationHeaders()
      const { data, error: err } = await supabase.functions.invoke('send-family-sibling-invite', {
        headers,
        body: {
          fullName: input.fullName.trim(),
          email: input.email.trim().toLowerCase(),
          relationship: input.relationship?.trim() || null,
          redirectTo: buildAppUrl('/set-password'),
        },
      })

      const errorMessage = await getInviteFunctionError(data, err)
      if (errorMessage) throw new Error(errorMessage)

      return { success: true, warning: (data as { warning?: string } | null)?.warning }
    } catch (e) {
      const rawMessage = e instanceof Error ? e.message : 'Failed to send invite'
      return { success: false, error: formatInviteEmailError(rawMessage) }
    }
  }, [])

  const cancelRequest = useCallback(async (requestId: string): Promise<MutationResult> => {
    const { error: err } = await supabase
      .from('requests')
      .delete()
      .eq('id', requestId)
      .in('status', ['pending', 'acknowledged'])

    if (err) return { success: false, error: err.message }
    if (resident) await fetchActivity(resident.id)
    return { success: true }
  }, [resident, fetchActivity])

  return {
    loading,
    error,
    familyMember,
    resident,
    requestTypes: familyRequestTypes,
    activity,
    activeFamilyRequestTypes,
    activeFamilyRequestIds,
    submitRequest,
    cancelRequest,
    inviteSibling,
    refresh: fetchAll,
  }
}
