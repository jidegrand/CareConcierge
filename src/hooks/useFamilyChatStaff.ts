import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useNotifications } from '@/hooks/useNotifications'
import type { FamilyChatMessage, FamilyChatResidentSummary } from '@/types'

interface UseFamilyChatStaffResult {
  residents: FamilyChatResidentSummary[]
  selectedResidentId: string | null
  setSelectedResidentId: (residentId: string | null) => void
  messages: FamilyChatMessage[]
  loading: boolean
  sending: boolean
  error: string | null
  sendMessage: (body: string) => Promise<void>
}

export function useFamilyChatStaff(enabled: boolean): UseFamilyChatStaffResult {
  const [residents, setResidents] = useState<FamilyChatResidentSummary[]>([])
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null)
  const [messages, setMessages] = useState<FamilyChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { pushNotification } = useNotifications()

  // Ref mirror so loadResidents doesn't need pushNotification as a dependency
  // (pushNotification is recreated on every notification list change).
  const pushNotificationRef = useRef(pushNotification)
  pushNotificationRef.current = pushNotification

  // Tracks the last-seen message timestamp per resident so the background
  // poll can detect newly-arrived family messages and notify staff, without
  // depending on the realtime channel (which has proven unreliable for
  // instant delivery in this app).
  const lastMessageSnapshotRef = useRef<Map<string, string | null>>(new Map())
  const residentsLoadedOnceRef = useRef(false)

  const loadResidents = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('list_family_chat_residents')
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    const next = (data ?? []) as FamilyChatResidentSummary[]
    setResidents(next)

    if (residentsLoadedOnceRef.current) {
      for (const resident of next) {
        if (resident.last_message_role !== 'family' || !resident.last_message_at) continue
        const previousTimestamp = lastMessageSnapshotRef.current.get(resident.resident_id)
        if (previousTimestamp === resident.last_message_at) continue
        pushNotificationRef.current({
          title: 'New family message',
          body: `${resident.resident_name}'s family: ${resident.last_message_body ?? 'sent a new message.'}`,
          tone: 'info',
          dedupeKey: `family-chat:${resident.resident_id}:${resident.last_message_at}`,
        })
      }
    }
    residentsLoadedOnceRef.current = true
    lastMessageSnapshotRef.current = new Map(next.map(r => [r.resident_id, r.last_message_at]))
  }, [])

  const loadMessages = useCallback(async (residentId: string | null) => {
    if (!residentId) {
      setMessages([])
      return
    }
    const { data, error: rpcError } = await supabase.rpc('list_family_chat_messages', {
      target_resident_id: residentId,
    })
    if (rpcError) {
      setError(rpcError.message)
    } else {
      setMessages((data ?? []) as FamilyChatMessage[])
    }
  }, [])

  const markRead = useCallback(async (residentId: string) => {
    await supabase.rpc('mark_family_chat_read', { target_resident_id: residentId })
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    void loadResidents().finally(() => setLoading(false))
  }, [loadResidents])

  useEffect(() => {
    if (!selectedResidentId) {
      setMessages([])
      return
    }
    void loadMessages(selectedResidentId)
    void markRead(selectedResidentId).then(loadResidents)
  }, [selectedResidentId, loadMessages, markRead, loadResidents])

  // Runs even when the panel is closed: keeps the resident list (and unread
  // counts/names used for notifications) fresh, and is a polling fallback
  // alongside the realtime subscription below if it doesn't deliver.
  useEffect(() => {
    const interval = window.setInterval(() => { void loadResidents() }, 10_000)
    return () => window.clearInterval(interval)
  }, [loadResidents])

  useEffect(() => {
    if (!enabled || !selectedResidentId) return
    const interval = window.setInterval(() => {
      void loadMessages(selectedResidentId)
      void markRead(selectedResidentId)
    }, 4_000)
    return () => window.clearInterval(interval)
  }, [enabled, selectedResidentId, loadMessages, markRead])

  const selectedResidentIdRef = useRef(selectedResidentId)
  selectedResidentIdRef.current = selectedResidentId

  useEffect(() => {
    const channel = supabase
      .channel('family-chat-staff')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'family_chat_messages' }, (payload) => {
        const incoming = payload.new as FamilyChatMessage
        void loadResidents()
        if (selectedResidentIdRef.current === incoming.resident_id) {
          void loadMessages(incoming.resident_id)
          void markRead(incoming.resident_id)
        }
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [loadResidents, loadMessages, markRead])

  const sendMessage = useCallback(async (body: string) => {
    const trimmed = body.trim()
    if (!trimmed || !selectedResidentId) return

    setSending(true)
    setError(null)
    try {
      const { error: rpcError } = await supabase.rpc('send_family_chat_message', {
        target_resident_id: selectedResidentId,
        message_body: trimmed,
      })
      if (rpcError) throw rpcError
      await Promise.all([loadMessages(selectedResidentId), loadResidents()])
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send your message.')
      throw sendError
    } finally {
      setSending(false)
    }
  }, [selectedResidentId, loadMessages, loadResidents])

  return {
    residents,
    selectedResidentId,
    setSelectedResidentId,
    messages,
    loading,
    sending,
    error,
    sendMessage,
  }
}
