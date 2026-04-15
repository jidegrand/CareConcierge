import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_REQUEST_TYPES, buildRequestTypeMap, slugifyRequestTypeId } from '@/lib/constants'
import type { RequestTypeConfig } from '@/types'

export interface ManagedRequestType extends RequestTypeConfig {
  tenant_id?: string
  active: boolean
  sort_order: number
  system: boolean
}

const REQUEST_TYPES_TABLE_MISSING =
  'Request-type storage is not set up yet. Run supabase/migrations/004_request_types.sql in your Supabase SQL Editor.'

interface RequestTypeRow {
  id: string
  tenant_id: string
  label: string
  icon: string
  color: string
  urgent: boolean
  active: boolean
  sort_order: number
  system: boolean
}

const DEFAULT_MANAGED_TYPES: ManagedRequestType[] = DEFAULT_REQUEST_TYPES.map((item, index) => ({
  ...item,
  active: true,
  sort_order: index,
  system: item.id === 'nurse',
}))

export function useRequestTypes(tenantId: string | undefined) {
  const [requestTypes, setRequestTypes] = useState<ManagedRequestType[]>(DEFAULT_MANAGED_TYPES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [setupRequired, setSetupRequired] = useState(false)

  const fetch = useCallback(async () => {
    if (!tenantId) {
      setRequestTypes(DEFAULT_MANAGED_TYPES)
      setError(null)
      setSetupRequired(false)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error: err } = await supabase
      .from('request_types')
      .select('id, tenant_id, label, icon, color, urgent, active, sort_order, system')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true })

    if (err) {
      const missingTable = /request_types/i.test(err.message) && /schema cache|Could not find the table/i.test(err.message)
      setSetupRequired(missingTable)
      setError(missingTable ? REQUEST_TYPES_TABLE_MISSING : err.message)
      setRequestTypes(DEFAULT_MANAGED_TYPES)
      setLoading(false)
      return
    }

    const rows = (data ?? []) as RequestTypeRow[]
    setRequestTypes(rows.length > 0 ? rows : DEFAULT_MANAGED_TYPES)
    setSetupRequired(false)
    setError(null)
    setLoading(false)
  }, [tenantId])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    if (!tenantId || setupRequired) return

    const channel = supabase
      .channel(`request-types:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'request_types',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => { fetch() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetch, setupRequired, tenantId])

  useEffect(() => {
    if (!tenantId || setupRequired) return

    const refreshOnFocus = () => { fetch() }
    const interval = window.setInterval(() => { fetch() }, 30_000)

    window.addEventListener('focus', refreshOnFocus)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshOnFocus)
    }
  }, [fetch, setupRequired, tenantId])

  const requestTypeMap = useMemo(
    () => buildRequestTypeMap(requestTypes),
    [requestTypes]
  )

  const createRequestType = useCallback(async (input: {
    label: string
    icon: string
    color?: string
    urgent?: boolean
  }) => {
    if (!tenantId) throw new Error('No tenant available.')
    if (setupRequired) throw new Error(REQUEST_TYPES_TABLE_MISSING)

    const label = input.label.trim()
    const icon = input.icon.trim()
    if (!label) throw new Error('Label is required.')
    if (!icon) throw new Error('Icon is required.')

    const id = slugifyRequestTypeId(label)
    if (!id) throw new Error('Could not generate an ID from that label.')
    if (requestTypes.some(item => item.id === id)) throw new Error('A request with that name already exists.')

    const { error: err } = await supabase
      .from('request_types')
      .insert({
        id,
        tenant_id: tenantId,
        label,
        icon,
        color: input.color?.trim() || '#1D6FA8',
        urgent: Boolean(input.urgent),
        active: true,
        sort_order: requestTypes.length,
        system: false,
      })

    if (err) throw new Error(err.message)
    await fetch()
  }, [fetch, requestTypes, setupRequired, tenantId])

  const updateRequestType = useCallback(async (id: string, patch: {
    label: string
    icon: string
    color?: string
    urgent?: boolean
  }) => {
    if (setupRequired) throw new Error(REQUEST_TYPES_TABLE_MISSING)

    const { error: err } = await supabase
      .from('request_types')
      .update({
        label: patch.label.trim(),
        icon: patch.icon.trim(),
        color: patch.color?.trim() || '#1D6FA8',
        urgent: Boolean(patch.urgent),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId ?? '')

    if (err) throw new Error(err.message)
    await fetch()
  }, [fetch, setupRequired, tenantId])

  const toggleRequestType = useCallback(async (id: string, active: boolean) => {
    if (setupRequired) throw new Error(REQUEST_TYPES_TABLE_MISSING)

    const { error: err } = await supabase
      .from('request_types')
      .update({ active })
      .eq('id', id)
      .eq('tenant_id', tenantId ?? '')

    if (err) throw new Error(err.message)
    await fetch()
  }, [fetch, setupRequired, tenantId])

  const deleteRequestType = useCallback(async (id: string) => {
    if (setupRequired) throw new Error(REQUEST_TYPES_TABLE_MISSING)

    const target = requestTypes.find(item => item.id === id)
    if (target?.system) throw new Error('System request types cannot be deleted.')

    const { error: err } = await supabase
      .from('request_types')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId ?? '')

    if (err) throw new Error(err.message)
    await fetch()
  }, [fetch, requestTypes, setupRequired, tenantId])

  return {
    requestTypes,
    requestTypeMap,
    loading,
    error,
    setupRequired,
    refresh: fetch,
    createRequestType,
    updateRequestType,
    toggleRequestType,
    deleteRequestType,
  }
}
