import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface PlatformAuditLog {
  id: string
  actor_id: string | null
  actor_name: string
  actor_role: string | null
  organization_id: string | null
  organization_name: string | null
  action: string
  target_type: string
  target_id: string
  summary: string
  details: Record<string, unknown>
  created_at: string
}

export function usePlatformAuditLogs(
  options: {
    enabled?: boolean
    organizationId?: string
    limit?: number
  } = {},
) {
  const {
    enabled = true,
    organizationId,
    limit = 200,
  } = options

  const [logs, setLogs] = useState<PlatformAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setLogs([])
      setLoading(false)
      return
    }

    const fetch = async () => {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('platform_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (organizationId) query = query.eq('organization_id', organizationId)

      const { data, error: err } = await query
      if (err) {
        setError(err.message)
        setLogs([])
        setLoading(false)
        return
      }

      setLogs((data ?? []) as PlatformAuditLog[])
      setLoading(false)
    }

    fetch()
  }, [enabled, organizationId, limit])

  const stats = useMemo(() => {
    const now = Date.now()
    const dayAgo = now - 24 * 60 * 60 * 1000
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000

    return {
      total: logs.length,
      last24Hours: logs.filter(entry => new Date(entry.created_at).getTime() >= dayAgo).length,
      last7Days: logs.filter(entry => new Date(entry.created_at).getTime() >= weekAgo).length,
      organizationsImpacted: new Set(logs.map(entry => entry.organization_id).filter(Boolean)).size,
      activeAdmins: new Set(logs.map(entry => entry.actor_id).filter(Boolean)).size,
    }
  }, [logs])

  return {
    logs,
    loading,
    error,
    stats,
  }
}
