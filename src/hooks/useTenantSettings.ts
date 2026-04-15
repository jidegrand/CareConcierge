import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { TenantSetting } from '@/types'

const DEFAULT_SETTINGS: TenantSetting = {
  tenant_id: '',
  patient_feedback_enabled: false,
  created_at: '',
  updated_at: '',
}

export function useTenantSettings(tenantId: string | undefined) {
  const [settings, setSettings] = useState<TenantSetting>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!tenantId) {
      setSettings(DEFAULT_SETTINGS)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('tenant_settings')
      .select('tenant_id, patient_feedback_enabled, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setSettings(
      (data as TenantSetting | null) ?? {
        ...DEFAULT_SETTINGS,
        tenant_id: tenantId,
      }
    )
    setLoading(false)
  }, [tenantId])

  useEffect(() => { refresh() }, [refresh])

  const saveSettings = useCallback(async (patch: Pick<TenantSetting, 'patient_feedback_enabled'>) => {
    if (!tenantId) throw new Error('Tenant settings require a tenant context.')

    const payload = {
      tenant_id: tenantId,
      patient_feedback_enabled: patch.patient_feedback_enabled,
      updated_at: new Date().toISOString(),
    }

    const { data, error: err } = await supabase
      .from('tenant_settings')
      .upsert(payload, { onConflict: 'tenant_id' })
      .select('tenant_id, patient_feedback_enabled, created_at, updated_at')
      .single()

    if (err) throw new Error(err.message)

    setSettings(data as TenantSetting)
    return data as TenantSetting
  }, [tenantId])

  return { settings, loading, error, refresh, saveSettings }
}
