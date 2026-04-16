import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface AdminStats {
  siteCount: number
  unitCount: number
  roomCount: number
  userCount: number
  requestsToday: number
}

export function useAdminStats(tenantId: string | undefined) {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) {
      setStats(null)
      setLoading(false)
      return
    }

    const run = async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [sitesRes, usersRes, requestsRes] = await Promise.all([
        supabase.from('sites').select('id, units(id, rooms(id))', { count: 'exact' }).eq('tenant_id', tenantId),
        supabase.from('user_profiles').select('id', { count: 'exact' }).eq('tenant_id', tenantId).eq('active', true),
        supabase
          .from('requests')
          .select(`id, room:rooms (unit:units (site:sites (tenant_id)))`)
          .gte('created_at', today.toISOString()),
      ])

      const sites = (sitesRes.data ?? []) as { units: { rooms: { id: string }[] }[] }[]
      const requestRows = (requestsRes.data ?? []) as {
        room?: { unit?: { site?: { tenant_id?: string } } }
      }[]

      const unitCount = sites.reduce((a, s) => a + (s.units?.length ?? 0), 0)
      const roomCount = sites.reduce((a, s) => a + s.units.reduce((b, u) => b + (u.rooms?.length ?? 0), 0), 0)
      const requestsToday = requestRows.filter(r => r.room?.unit?.site?.tenant_id === tenantId).length

      setStats({
        siteCount: sitesRes.count ?? 0,
        unitCount,
        roomCount,
        userCount: usersRes.count ?? 0,
        requestsToday,
      })
      setLoading(false)
    }

    run()
  }, [tenantId])

  return { stats, loading }
}
