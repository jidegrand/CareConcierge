import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { FamilyChatMessage } from '@/types'

interface UseFamilyChatResult {
  messages: FamilyChatMessage[]
  loading: boolean
  sending: boolean
  error: string | null
  unreadCount: number
  sendMessage: (body: string) => Promise<void>
  markRead: () => Promise<void>
}

export function useFamilyChat(residentId: string | undefined, open: boolean): UseFamilyChatResult {
  const [messages, setMessages] = useState<FamilyChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const loadMessages = useCallback(async () => {
    if (!residentId) {
      setMessages([])
      setLoading(false)
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
    setLoading(false)
  }, [residentId])

  const refreshUnread = useCallback(async () => {
    if (!residentId) {
      setUnreadCount(0)
      return
    }
    const { data } = await supabase.rpc('family_chat_unread_count', {
      target_resident_id: residentId,
    })
    setUnreadCount(typeof data === 'number' ? data : Number(data ?? 0))
  }, [residentId])

  const markRead = useCallback(async () => {
    if (!residentId) return
    await supabase.rpc('mark_family_chat_read', { target_resident_id: residentId })
    setUnreadCount(0)
  }, [residentId])

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  useEffect(() => {
    void refreshUnread()
    if (residentId) {
      const interval = window.setInterval(refreshUnread, 30_000)
      return () => window.clearInterval(interval)
    }
  }, [refreshUnread, residentId])

  useEffect(() => {
    if (open && residentId) {
      void loadMessages()
      void markRead()
    }
  }, [open, residentId, loadMessages, markRead])

  // Ref mirror so the realtime handler doesn't need loadMessages/markRead as deps
  const openRef = useRef(open)
  openRef.current = open

  useEffect(() => {
    if (!residentId) return

    const channel = supabase
      .channel(`family-chat:${residentId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'family_chat_messages',
        filter: `resident_id=eq.${residentId}`,
      }, () => {
        void loadMessages()
        if (openRef.current) {
          void markRead()
        } else {
          void refreshUnread()
        }
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [residentId, loadMessages, markRead, refreshUnread])

  const sendMessage = useCallback(async (body: string) => {
    const trimmed = body.trim()
    if (!trimmed || !residentId) return

    setSending(true)
    setError(null)
    try {
      const { error: rpcError } = await supabase.rpc('send_family_chat_message', {
        target_resident_id: residentId,
        message_body: trimmed,
      })
      if (rpcError) throw rpcError
      await loadMessages()
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send your message.')
      throw sendError
    } finally {
      setSending(false)
    }
  }, [residentId, loadMessages])

  return { messages, loading, sending, error, unreadCount, sendMessage, markRead }
}
