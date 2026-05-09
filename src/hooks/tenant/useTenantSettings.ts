import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { TenantSetting } from '@/types'

export function useTenantSettings(tenantId: string) {
  const [settings, setSettings] = useState<TenantSetting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()

      if (err && err.code !== 'PGRST116') throw err
      setSettings(data || null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load settings'
      setError(message)
      console.error('Error loading tenant settings:', message)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  const updateSettings = useCallback(
    async (updates: Partial<TenantSetting>) => {
      setSaving(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('tenant_settings')
          .upsert({
            tenant_id: tenantId,
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (err) throw err
        setSettings(data)
        return { success: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save settings'
        setError(message)
        return { success: false, error: message }
      } finally {
        setSaving(false)
      }
    },
    [tenantId]
  )

  useEffect(() => {
    void fetchSettings()
  }, [tenantId, fetchSettings])

  return {
    settings,
    loading,
    error,
    saving,
    fetch: fetchSettings,
    update: updateSettings,
  }
}
