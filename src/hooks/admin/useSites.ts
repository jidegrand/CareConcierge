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

const DEFAULT_ROOM_NAMING_TEMPLATE = 'Room {n}'

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const normalizeRoomNamingTemplate = (value: string | undefined) => {
  const template = value?.trim() || DEFAULT_ROOM_NAMING_TEMPLATE
  if (!template.includes('{n}')) throw new Error('Room naming template must include {n}.')
  return template
}

const buildRoomNameFromTemplate = (template: string, index: number) =>
  template.replace(/\{n\}/g, String(index))

const ACTIVE_REQUEST_STATUSES = ['pending', 'acknowledged'] as const

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
    const slug = slugify(name)
    const { error: err } = await supabase.from('sites').insert({ tenant_id: tenantId, name, slug })
    if (err) throw new Error(err.message)
    await fetch()
  }

  const updateSite = async (id: string, name: string) => {
    const slug = slugify(name)
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
  const createUnit = async (siteId: string, name: string, roomNamingTemplate?: string) => {
    const slug = slugify(name)
    const { error: err } = await supabase.from('units').insert({
      site_id: siteId,
      name,
      slug,
      room_naming_template: normalizeRoomNamingTemplate(roomNamingTemplate),
    })
    if (err) throw new Error(err.message)
    await fetch()
  }

  const updateUnit = async (id: string, name: string, roomNamingTemplate?: string) => {
    const slug = slugify(name)
    const { error: err } = await supabase.from('units').update({
      name,
      slug,
      room_naming_template: normalizeRoomNamingTemplate(roomNamingTemplate),
    }).eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const deleteUnit = async (id: string) => {
    const { error: err } = await supabase.from('units').delete().eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  // ── Room CRUD ──────────────────────────────────────────────────────────────
  const createRoomsFromTemplate = async (input: {
    unitId: string
    template: string
    startNumber: number
    roomCount: number
    labelTemplate?: string
  }) => {
    const template = normalizeRoomNamingTemplate(input.template)
    const roomCount = Math.max(1, Math.floor(input.roomCount))
    const startNumber = Math.max(1, Math.floor(input.startNumber))
    const labelTemplate = input.labelTemplate?.trim() || ''

    const rows = Array.from({ length: roomCount }, (_, offset) => {
      const roomNumber = startNumber + offset
      const name = buildRoomNameFromTemplate(template, roomNumber)
      const label = labelTemplate
        ? buildRoomNameFromTemplate(labelTemplate, roomNumber)
        : name

      return {
        unit_id: input.unitId,
        name,
        label,
        active: true,
      }
    })

    const { error: err } = await supabase.from('rooms').insert(rows)
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
    const { count: activeRequestCount, error: activeErr } = await supabase
      .from('requests')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', id)
      .in('status', [...ACTIVE_REQUEST_STATUSES])

    if (activeErr) throw new Error(activeErr.message)

    if ((activeRequestCount ?? 0) > 0) {
      throw new Error('This room still has active requests. Resolve or cancel them first, or deactivate the room instead.')
    }

    const { count: requestHistoryCount, error: historyErr } = await supabase
      .from('requests')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', id)

    if (historyErr) throw new Error(historyErr.message)

    if ((requestHistoryCount ?? 0) > 0) {
      const { error: archiveErr } = await supabase.from('rooms').update({ active: false }).eq('id', id)
      if (archiveErr) throw new Error(archiveErr.message)
      await fetch()
      return 'This room has request history, so it was deactivated instead of deleted to preserve reports.'
    }

    const { error: err } = await supabase.from('rooms').delete().eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
    return null
  }

  return {
    sites, loading, error, refresh: fetch,
    createSite, updateSite, deleteSite,
    createUnit, updateUnit, deleteUnit,
    createRoomsFromTemplate, updateRoom, toggleRoom, deleteRoom,
  }
}
