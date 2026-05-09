import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface AuditLogEntry {
  id: string
  request_id: string
  action: 'created' | 'acknowledged' | 'resolved' | 'reassigned' | 'status_changed' | 'updated'
  actor_name: string | null
  actor_role: string | null
  room_id: string | null
  room_name: string | null
  changes: Record<string, any> | null
  notes: string | null
  timestamp: string
}

interface AuditLogsFilters {
  action?: string
  actorId?: string
  roomId?: string
  startDate?: string
  endDate?: string
}

export function useAuditLogs(tenantId: string, filters?: AuditLogsFilters) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 50

  const fetchLogs = useCallback(
    async (pageNum: number = 1) => {
      try {
        setLoading(true)
        setError(null)

        let query = supabase
          .from('request_audit_log')
          .select('*', { count: 'exact' })
          .eq('tenant_id', tenantId)
          .order('timestamp', { ascending: false })

        // Apply filters
        if (filters?.action) {
          query = query.eq('action', filters.action)
        }
        if (filters?.actorId) {
          query = query.eq('actor_id', filters.actorId)
        }
        if (filters?.roomId) {
          query = query.eq('room_id', filters.roomId)
        }
        if (filters?.startDate) {
          query = query.gte('timestamp', filters.startDate)
        }
        if (filters?.endDate) {
          query = query.lte('timestamp', filters.endDate)
        }

        // Pagination
        const from = (pageNum - 1) * pageSize
        const to = from + pageSize - 1
        query = query.range(from, to)

        const { data, error: err, count } = await query

        if (err) throw err
        setLogs((data || []) as AuditLogEntry[])
        setTotalCount(count || 0)
        setPage(pageNum)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load audit logs'
        setError(message)
        console.error('Error loading audit logs:', message)
      } finally {
        setLoading(false)
      }
    },
    [tenantId, filters]
  )

  const exportAsCSV = useCallback(async () => {
    try {
      // Fetch all logs (without pagination)
      const { data, error: err } = await supabase
        .from('request_audit_log')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('timestamp', { ascending: false })

      if (err) throw err

      // Convert to CSV
      const headers = ['Timestamp', 'Action', 'Room', 'Actor', 'Role', 'Changes']
      const rows = (data || []).map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.action,
        log.room_name || '-',
        log.actor_name || '-',
        log.actor_role || '-',
        log.notes || JSON.stringify(log.changes || {}),
      ])

      const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')

      // Download
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export logs'
      return { success: false, error: message }
    }
  }, [tenantId])

  useEffect(() => {
    void fetchLogs(1)
  }, [tenantId, filters, fetchLogs])

  return {
    logs,
    loading,
    error,
    page,
    pageSize,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    fetch: (pageNum?: number) => fetchLogs(pageNum || 1),
    nextPage: () => fetchLogs(page + 1),
    prevPage: () => page > 1 && fetchLogs(page - 1),
    exportAsCSV,
  }
}
