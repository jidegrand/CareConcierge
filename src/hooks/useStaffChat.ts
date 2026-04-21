import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'

export interface ChatContact {
  userId: string
  fullName: string | null
  role: string
  siteId: string | null
  siteName: string | null
  unitId: string | null
  unitName: string | null
}

export interface ChatThreadSummary {
  threadId: string
  siteId: string | null
  siteName: string | null
  counterpartUserId: string
  counterpartFullName: string | null
  counterpartRole: string
  counterpartSiteName: string | null
  counterpartUnitName: string | null
  lastMessageAt: string | null
  lastMessageBody: string | null
  lastMessageSenderId: string | null
  unreadCount: number
}

export interface ChatMessage {
  messageId: string
  threadId: string
  senderId: string
  senderName: string | null
  body: string
  createdAt: string
}

interface UseStaffChatResult {
  contacts: ChatContact[]
  threads: ChatThreadSummary[]
  selectedThreadId: string | null
  selectedThread: ChatThreadSummary | null
  messages: ChatMessage[]
  loading: boolean
  sending: boolean
  connected: boolean
  error: string | null
  setSelectedThreadId: (threadId: string | null) => void
  startChat: (targetUserId: string) => Promise<void>
  sendMessage: (body: string) => Promise<void>
  refresh: () => Promise<void>
}

export function useStaffChat(enabled = true): UseStaffChatResult {
  const { user } = useAuth()
  const { pushNotification } = useNotifications()
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [threads, setThreads] = useState<ChatThreadSummary[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mapContact = (row: {
    user_id: string
    full_name: string | null
    role: string
    site_id: string | null
    site_name: string | null
    unit_id: string | null
    unit_name: string | null
  }): ChatContact => ({
    userId: row.user_id,
    fullName: row.full_name,
    role: row.role,
    siteId: row.site_id,
    siteName: row.site_name,
    unitId: row.unit_id,
    unitName: row.unit_name,
  })

  const mapThread = (row: {
    thread_id: string
    site_id: string | null
    site_name: string | null
    counterpart_user_id: string
    counterpart_full_name: string | null
    counterpart_role: string
    counterpart_site_name: string | null
    counterpart_unit_name: string | null
    last_message_at: string | null
    last_message_body: string | null
    last_message_sender_id: string | null
    unread_count: number | null
  }): ChatThreadSummary => ({
    threadId: row.thread_id,
    siteId: row.site_id,
    siteName: row.site_name,
    counterpartUserId: row.counterpart_user_id,
    counterpartFullName: row.counterpart_full_name,
    counterpartRole: row.counterpart_role,
    counterpartSiteName: row.counterpart_site_name,
    counterpartUnitName: row.counterpart_unit_name,
    lastMessageAt: row.last_message_at,
    lastMessageBody: row.last_message_body,
    lastMessageSenderId: row.last_message_sender_id,
    unreadCount: row.unread_count ?? 0,
  })

  const mapMessage = (row: {
    message_id: string
    thread_id: string
    sender_id: string
    sender_name: string | null
    body: string
    created_at: string
  }): ChatMessage => ({
    messageId: row.message_id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    body: row.body,
    createdAt: row.created_at,
  })

  const loadContacts = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('list_chat_contacts')
    if (rpcError) throw rpcError
    setContacts(((data ?? []) as Array<Parameters<typeof mapContact>[0]>).map(mapContact))
  }, [])

  const loadThreads = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('list_chat_threads')
    if (rpcError) throw rpcError
    setThreads(((data ?? []) as Array<Parameters<typeof mapThread>[0]>).map(mapThread))
  }, [])

  const loadMessages = useCallback(async (threadId: string | null) => {
    if (!threadId) {
      setMessages([])
      return
    }

    const { data, error: rpcError } = await supabase.rpc('list_chat_messages', {
      target_thread_id: threadId,
    })

    if (rpcError) throw rpcError

    setMessages(((data ?? []) as Array<Parameters<typeof mapMessage>[0]>).map(mapMessage))
  }, [])

  const markThreadRead = useCallback(async (threadId: string) => {
    const { error: rpcError } = await supabase.rpc('mark_chat_thread_read', {
      target_thread_id: threadId,
    })
    if (rpcError) throw rpcError
  }, [])

  const refresh = useCallback(async () => {
    if (!enabled || !user?.id) {
      setContacts([])
      setThreads([])
      setMessages([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      await Promise.all([
        loadContacts(),
        loadThreads(),
      ])
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Unable to load staff chat.')
    } finally {
      setLoading(false)
    }
  }, [enabled, loadContacts, loadThreads, user?.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([])
      return
    }

    let cancelled = false

    const run = async () => {
      try {
        await loadMessages(selectedThreadId)
        await markThreadRead(selectedThreadId)
        if (!cancelled) {
          await loadThreads()
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load messages.')
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [loadMessages, loadThreads, markThreadRead, selectedThreadId])

  useEffect(() => {
    if (!enabled || !user?.id) return

    const channel = supabase
      .channel(`staff-chat:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const incoming = payload.new as { id: string; thread_id: string; sender_id: string }
        const incomingThread = threads.find(thread => thread.threadId === incoming.thread_id) ?? null
        const threadIsOpen = selectedThreadId === incoming.thread_id

        void loadThreads()

        if (threadIsOpen) {
          void loadMessages(incoming.thread_id)
          void markThreadRead(incoming.thread_id)
          return
        }

        if (incoming.sender_id !== user.id) {
          pushNotification({
            title: 'New staff message',
            body: incomingThread?.counterpartFullName
              ? `${incomingThread.counterpartFullName} sent you a message.`
              : 'A teammate sent you a message.',
            tone: 'info',
            dedupeKey: `staff-chat:${incoming.id}`,
          })
        }
      })
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'))

    return () => {
      setConnected(false)
      void supabase.removeChannel(channel)
    }
  }, [enabled, loadMessages, loadThreads, markThreadRead, pushNotification, selectedThreadId, threads, user?.id])

  const startChat = useCallback(async (targetUserId: string) => {
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('start_or_get_direct_chat', {
      target_user_id: targetUserId,
    })

    if (rpcError) {
      setError(rpcError.message)
      throw rpcError
    }

    const threadId = typeof data === 'string' ? data : null
    await loadThreads()
    if (threadId) {
      setSelectedThreadId(threadId)
    }
  }, [loadThreads])

  const sendMessage = useCallback(async (body: string) => {
    if (!user?.id || !selectedThreadId) return

    const trimmedBody = body.trim()
    if (!trimmedBody) return

    setSending(true)
    setError(null)

    try {
      const { error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: selectedThreadId,
          sender_id: user.id,
          body: trimmedBody,
        })

      if (insertError) throw insertError

      await Promise.all([
        loadMessages(selectedThreadId),
        loadThreads(),
        markThreadRead(selectedThreadId),
      ])
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send your message.')
      throw sendError
    } finally {
      setSending(false)
    }
  }, [loadMessages, loadThreads, markThreadRead, selectedThreadId, user?.id])

  const selectedThread = useMemo(
    () => threads.find(thread => thread.threadId === selectedThreadId) ?? null,
    [selectedThreadId, threads]
  )

  useEffect(() => {
    if (!selectedThreadId) return
    if (threads.some(thread => thread.threadId === selectedThreadId)) return
    setSelectedThreadId(null)
  }, [selectedThreadId, threads])

  return {
    contacts,
    threads,
    selectedThreadId,
    selectedThread,
    messages,
    loading,
    sending,
    connected,
    error,
    setSelectedThreadId,
    startChat,
    sendMessage,
    refresh,
  }
}
