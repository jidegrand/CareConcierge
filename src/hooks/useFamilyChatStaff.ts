import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
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

  const loadResidents = useCallback(async () => {
    if (!enabled) {
      setResidents([])
      return
    }
    const { data, error: rpcError } = await supabase.rpc('list_family_chat_residents')
    if (rpcError) {
      setError(rpcError.message)
    } else {
      setResidents((data ?? []) as FamilyChatResidentSummary[])
    }
  }, [enabled])

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
    if (!enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    void loadResidents().finally(() => setLoading(false))
  }, [enabled, loadResidents])

  useEffect(() => {
    if (!selectedResidentId) {
      setMessages([])
      return
    }
    void loadMessages(selectedResidentId)
    void markRead(selectedResidentId).then(loadResidents)
  }, [selectedResidentId, loadMessages, markRead, loadResidents])

  // Polling fallback alongside the realtime subscription below: guarantees
  // new messages and inbox previews show up within a few seconds even if
  // the realtime channel doesn't deliver (e.g. token refresh dropped the socket).
  useEffect(() => {
    if (!enabled) return
    const interval = window.setInterval(() => { void loadResidents() }, 10_000)
    return () => window.clearInterval(interval)
  }, [enabled, loadResidents])

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
    if (!enabled) return

    const channel = supabase
      .channel('family-chat-staff')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'family_chat_messages' }, (payload) => {
        const incoming = payload.new as { resident_id: string }
        void loadResidents()
        if (selectedResidentIdRef.current === incoming.resident_id) {
          void loadMessages(incoming.resident_id)
          void markRead(incoming.resident_id)
        }
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [enabled, loadResidents, loadMessages, markRead])

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
