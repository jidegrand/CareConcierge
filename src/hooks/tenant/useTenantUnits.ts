import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Unit } from '@/types'

export interface UnitWithSiteName extends Unit {
  site_name?: string
  room_count?: number
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export function useTenantUnits(tenantId: string | undefined) {
  const [units, setUnits] = useState<UnitWithSiteName[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!tenantId) {
      setUnits([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)

      // Fetch units with their site information and room counts
      const { data: unitsData, error: unitsErr } = await supabase
        .from('units')
        .select(`
          *,
          site:site_id(id, name)
        `)
        .in('site_id', (await getSiteIds(tenantId)) || [])
        .order('name')

      if (unitsErr) throw new Error(unitsErr.message)

      // Get room counts for each unit
      const unitsWithCounts = await Promise.all(
        (unitsData ?? []).map(async (unit: any) => {
          const { count, error: countErr } = await supabase
            .from('rooms')
            .select('id', { count: 'exact', head: true })
            .eq('unit_id', unit.id)

          if (countErr) return {
            ...unit,
            site_name: unit.site?.name || 'Unknown',
            room_count: 0,
          }
          return {
            ...unit,
            site_name: unit.site?.name || 'Unknown',
            room_count: count ?? 0,
          }
        })
      )

      setUnits(unitsWithCounts as UnitWithSiteName[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load units')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  const getSiteIds = async (tid: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from('sites')
      .select('id')
      .eq('tenant_id', tid)
    if (error) return []
    return (data ?? []).map((s: any) => s.id)
  }

  useEffect(() => { fetch() }, [fetch])

  const createUnit = async (siteId: string, name: string, capacity?: number) => {
    try {
      const slug = slugify(name)
      const { error: err } = await supabase.from('units').insert({
        site_id: siteId,
        name,
        slug,
        capacity: capacity || 0,
      })
      if (err) throw new Error(err.message)
      await fetch()
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create unit')
    }
  }

  const updateUnit = async (id: string, name: string, capacity?: number) => {
    try {
      const slug = slugify(name)
      const { error: err } = await supabase.from('units').update({
        name,
        slug,
        capacity: capacity || 0,
      }).eq('id', id)
      if (err) throw new Error(err.message)
      await fetch()
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update unit')
    }
  }

  const deleteUnit = async (id: string) => {
    try {
      const { error: err } = await supabase.from('units').delete().eq('id', id)
      if (err) throw new Error(err.message)
      await fetch()
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete unit')
    }
  }

  return {
    units, loading, error, refresh: fetch,
    createUnit, updateUnit, deleteUnit,
  }
}
