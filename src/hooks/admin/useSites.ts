import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Site, Unit, Room } from '@/types'

export interface UnitWithRooms extends Unit {
  rooms: Room[]
}

export interface SiteWithUnits extends Site {
  units: UnitWithRooms[]
}

export interface RoomWithQR extends Room {
  qrUrl: string
}

export function useSites(tenantId: string | undefined) {
  const [sites, setSites] = useState<SiteWithUnits[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!tenantId) {
      setSites([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: err } = await supabase
      .from('sites')
      .select(`*, units(*, rooms(*))`)
      .eq('tenant_id', tenantId)
      .order('name')
    if (err) { setError(err.message); setLoading(false); return }
    setSites((data ?? []) as SiteWithUnits[])
    setLoading(false)
  }, [tenantId])

  useEffect(() => { fetch() }, [fetch])

  // ── Site CRUD ──────────────────────────────────────────────────────────────
  const createSite = async (name: string) => {
    if (!tenantId) return
    const slug = name.toLowerCase().replace(/\s+/g, '-')
    const { error: err } = await supabase.from('sites').insert({ tenant_id: tenantId, name, slug })
    if (err) throw new Error(err.message)
    await fetch()
  }

  const updateSite = async (id: string, name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-')
    const { error: err } = await supabase.from('sites').update({ name, slug }).eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const deleteSite = async (id: string) => {
    const { error: err } = await supabase.from('sites').delete().eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  // ── Unit CRUD ──────────────────────────────────────────────────────────────
  const createUnit = async (siteId: string, name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-')
    const { error: err } = await supabase.from('units').insert({ site_id: siteId, name, slug })
    if (err) throw new Error(err.message)
    await fetch()
  }

  const updateUnit = async (id: string, name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-')
    const { error: err } = await supabase.from('units').update({ name, slug }).eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const deleteUnit = async (id: string) => {
    const { error: err } = await supabase.from('units').delete().eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  // ── Room CRUD ──────────────────────────────────────────────────────────────
  const createRoom = async (unitId: string, name: string, label?: string) => {
    const { error: err } = await supabase.from('rooms').insert({ unit_id: unitId, name, label: label || name, active: true })
    if (err) throw new Error(err.message)
    await fetch()
  }

  const updateRoom = async (id: string, name: string, label?: string) => {
    const { error: err } = await supabase.from('rooms').update({ name, label: label || name }).eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const toggleRoom = async (id: string, active: boolean) => {
    const { error: err } = await supabase.from('rooms').update({ active }).eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const deleteRoom = async (id: string) => {
    const { error: err } = await supabase.from('rooms').delete().eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  return {
    sites, loading, error, refresh: fetch,
    createSite, updateSite, deleteSite,
    createUnit, updateUnit, deleteUnit,
    createRoom, updateRoom, toggleRoom, deleteRoom,
  }
}
