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

const buildRoomNameFromTemplate = (template: string, index: number, bedLetter = '') =>
  template.replace(/\{n\}/g, String(index)).replace(/\{bed\}/g, bedLetter)

const ACTIVE_REQUEST_STATUSES = ['pending', 'acknowledged'] as const

const normalizeOptionalUrl = (value: string | undefined) => {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(candidate)
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Hospital website must start with http:// or https://.')
    }
    return url.toString()
  } catch {
    throw new Error('Enter a valid hospital website URL.')
  }
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
  const createSite = async (name: string, hospitalUrl?: string) => {
    if (!tenantId) return
    const slug = slugify(name)
    const { error: err } = await supabase.from('sites').insert({
      tenant_id: tenantId,
      name,
      slug,
      hospital_url: normalizeOptionalUrl(hospitalUrl),
    })
    if (err) throw new Error(err.message)
    await fetch()
  }

  const updateSite = async (id: string, name: string, hospitalUrl?: string) => {
    const slug = slugify(name)
    const { error: err } = await supabase.from('sites').update({
      name,
      slug,
      hospital_url: normalizeOptionalUrl(hospitalUrl),
    }).eq('id', id)
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
    bedsPerRoom?: number
  }) => {
    const template = normalizeRoomNamingTemplate(input.template)
    const roomCount = Math.max(1, Math.floor(input.roomCount))
    const startNumber = Math.max(1, Math.floor(input.startNumber))
    const labelTemplate = input.labelTemplate?.trim() || ''
    const bedsPerRoom = Math.max(1, Math.floor(input.bedsPerRoom ?? 1))

    if (bedsPerRoom > 1 && !template.includes('{bed}')) {
      throw new Error('Room naming template must include {bed} when beds per room is more than 1 (e.g. Room {n}-{bed}).')
    }

    const bedLetters = bedsPerRoom > 1
      ? Array.from({ length: bedsPerRoom }, (_, i) => String.fromCharCode(65 + i))
      : ['']

    const rows = Array.from({ length: roomCount }, (_, offset) => {
      const roomNumber = startNumber + offset
      return bedLetters.map(bedLetter => {
        const name = buildRoomNameFromTemplate(template, roomNumber, bedLetter)
        const label = labelTemplate
          ? buildRoomNameFromTemplate(labelTemplate, roomNumber, bedLetter)
          : name

        return {
          unit_id: input.unitId,
          name,
          label,
          active: true,
        }
      })
    }).flat()

    const { error: err } = await supabase.from('rooms').insert(rows)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const updateRoom = async (id: string, name: string, label?: string) => {
    const { error: err } = await supabase.from('rooms').update({ name, label: label || name }).eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  // Add a second (or third+) bed to an existing room. If the room has no
  // bed suffix yet, it's renamed "<name>-A" and the new bed becomes
  // "<name>-B"; otherwise the new bed gets the next free letter after
  // the existing siblings sharing the same base name.
  const addBed = async (room: Room, siblingRooms: Room[]) => {
    const suffixMatch = room.name.match(/^(.*)-([A-Za-z])$/)
    const base = suffixMatch ? suffixMatch[1] : room.name

    const usedLetters = new Set<string>()
    for (const r of siblingRooms) {
      const m = r.name.match(/^(.*)-([A-Za-z])$/)
      if (m && m[1] === base) usedLetters.add(m[2].toUpperCase())
    }

    if (usedLetters.size === 0) {
      const renamedName = `${base}-A`
      const { error: renameErr } = await supabase
        .from('rooms')
        .update({ name: renamedName, label: room.label === room.name ? renamedName : room.label })
        .eq('id', room.id)
      if (renameErr) throw new Error(renameErr.message)
      usedLetters.add('A')
    }

    let code = 65 // 'A'
    while (usedLetters.has(String.fromCharCode(code))) code++
    const newName = `${base}-${String.fromCharCode(code)}`

    const { error: err } = await supabase.from('rooms').insert({
      unit_id: room.unit_id,
      name: newName,
      label: newName,
      active: true,
    })
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
    createRoomsFromTemplate, updateRoom, addBed, toggleRoom, deleteRoom,
  }
}
