import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useStaffChat } from '@/hooks/useStaffChat'

interface Props {
  open: boolean
  onClose: () => void
}

function formatMessageTime(iso: string | null) {
  if (!iso) return 'No messages yet'
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function initialsOf(value: string | null | undefined, fallback: string) {
  const source = value?.trim() || fallback
  return source
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatRole(role: string) {
  return role.replace(/_/g, ' ')
}

function scopeLabel(siteName: string | null, unitName: string | null) {
  if (siteName && unitName) return `${siteName} · ${unitName}`
  if (siteName) return `${siteName} · All units`
  return 'All sites'
}

export default function StaffChatPanel({ open, onClose }: Props) {
  const { user } = useAuth()
  const {
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
  } = useStaffChat(open)
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      setDraft('')
      setSearch('')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const filteredThreads = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return threads
    return threads.filter(thread =>
      (thread.counterpartFullName ?? '').toLowerCase().includes(query) ||
      formatRole(thread.counterpartRole).toLowerCase().includes(query) ||
      (thread.counterpartSiteName ?? '').toLowerCase().includes(query)
    )
  }, [search, threads])

  const existingThreadUserIds = useMemo(
    () => new Set(threads.map(thread => thread.counterpartUserId)),
    [threads]
  )

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return contacts
      .filter(contact => !existingThreadUserIds.has(contact.userId))
      .filter(contact => {
        if (!query) return true
        return (
          (contact.fullName ?? '').toLowerCase().includes(query) ||
          formatRole(contact.role).toLowerCase().includes(query) ||
          (contact.siteName ?? '').toLowerCase().includes(query)
        )
      })
  }, [contacts, existingThreadUserIds, search])

  const handleSend = async () => {
    if (!draft.trim()) return
    try {
      await sendMessage(draft)
      setDraft('')
    } catch {}
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm">
      <div className="flex h-[min(88vh,760px)] w-full max-w-6xl overflow-hidden rounded-[28px] border border-slate-200 bg-[var(--surface)] shadow-2xl">
        <div className="flex w-full flex-col lg:flex-row">
          <aside className="flex w-full flex-col border-b border-[var(--border)] bg-[var(--page-bg)] lg:w-[360px] lg:border-b-0 lg:border-r">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[var(--text-primary)]">Staff Chat</h3>
                    <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Direct messages stay limited to coworkers who share your site access.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-white hover:text-[var(--text-primary)]"
                >
                  ✕
                </button>
              </div>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search staff..."
                className="mt-4 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--clinical-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]/10"
              />
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-[var(--clinical-blue)] border-t-transparent" />
                  <span className="text-sm">Loading chat...</span>
                </div>
              ) : (
                <div className="space-y-5">
                  <section>
                    <div className="mb-2 flex items-center justify-between px-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Recent Threads</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{filteredThreads.length}</p>
                    </div>
                    <div className="space-y-2">
                      {filteredThreads.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white px-4 py-5 text-sm text-[var(--text-muted)]">
                          No conversations yet. Start one from the available staff list below.
                        </div>
                      )}
                      {filteredThreads.map(thread => (
                        <button
                          key={thread.threadId}
                          onClick={() => setSelectedThreadId(thread.threadId)}
                          className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                            selectedThreadId === thread.threadId
                              ? 'border-[var(--clinical-blue)] bg-white shadow-sm'
                              : 'border-transparent bg-white/80 hover:border-[var(--border)] hover:bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--clinical-blue-lt)] text-sm font-bold text-[var(--clinical-blue)]">
                              {initialsOf(thread.counterpartFullName, thread.counterpartUserId)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                                  {thread.counterpartFullName ?? `User ${thread.counterpartUserId.slice(0, 6)}`}
                                </p>
                                {thread.unreadCount > 0 && (
                                  <span className="rounded-full bg-[var(--clinical-blue)] px-2 py-0.5 text-[10px] font-bold text-white">
                                    {thread.unreadCount}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 truncate text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                                {formatRole(thread.counterpartRole)}
                              </p>
                              <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                                {thread.lastMessageBody ?? 'No messages yet'}
                              </p>
                              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                                {scopeLabel(thread.counterpartSiteName, thread.counterpartUnitName)} · {formatMessageTime(thread.lastMessageAt)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className="mb-2 flex items-center justify-between px-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Available Staff</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{filteredContacts.length}</p>
                    </div>
                    <div className="space-y-2">
                      {filteredContacts.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white px-4 py-5 text-sm text-[var(--text-muted)]">
                          Everyone in your scope already has a thread, or your search returned no matches.
                        </div>
                      )}
                      {filteredContacts.map(contact => (
                        <button
                          key={contact.userId}
                          onClick={() => void startChat(contact.userId)}
                          className="w-full rounded-2xl border border-transparent bg-white px-4 py-3 text-left transition-all hover:border-[var(--border)] hover:bg-white"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-bold text-emerald-700">
                              {initialsOf(contact.fullName, contact.userId)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                                {contact.fullName ?? `User ${contact.userId.slice(0, 6)}`}
                              </p>
                              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                                {formatRole(contact.role)}
                              </p>
                              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                {scopeLabel(contact.siteName, contact.unitName)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </div>
          </aside>

          <section className="flex min-h-0 flex-1 flex-col bg-white">
            <div className="border-b border-[var(--border)] px-5 py-4">
              {selectedThread ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--clinical-blue-lt)] text-sm font-bold text-[var(--clinical-blue)]">
                    {initialsOf(selectedThread.counterpartFullName, selectedThread.counterpartUserId)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {selectedThread.counterpartFullName ?? `User ${selectedThread.counterpartUserId.slice(0, 6)}`}
                    </p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {formatRole(selectedThread.counterpartRole)} · {scopeLabel(selectedThread.counterpartSiteName, selectedThread.counterpartUnitName)}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Select a conversation</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Choose an existing thread or start a new one with someone in your site scope.
                  </p>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {!selectedThread && (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-sm text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)]">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">No thread selected</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Staff chat is intended for quick handoffs and follow-ups inside the same site scope.
                    </p>
                  </div>
                </div>
              )}

              {selectedThread && messages.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-sm text-center">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Start the conversation</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      This thread is ready. Send the first message to coordinate care or hand off a request.
                    </p>
                  </div>
                </div>
              )}

              {selectedThread && messages.length > 0 && (
                <div className="space-y-3">
                  {messages.map(message => {
                    const mine = message.senderId === user?.id
                    return (
                      <div key={message.messageId} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] rounded-3xl px-4 py-3 shadow-sm ${
                          mine
                            ? 'bg-[var(--clinical-blue)] text-white'
                            : 'border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)]'
                        }`}>
                          <p className="text-sm leading-relaxed">{message.body}</p>
                          <p className={`mt-2 text-[11px] ${mine ? 'text-white/75' : 'text-[var(--text-muted)]'}`}>
                            {mine ? 'You' : (message.senderName ?? 'Staff')} · {formatMessageTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="border-t border-[var(--border)] px-5 py-4">
              {error && (
                <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="flex items-end gap-3">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={selectedThread ? 'Type a message...' : 'Select a thread to start chatting'}
                  disabled={!selectedThread || sending}
                  rows={2}
                  className="min-h-[56px] flex-1 resize-none rounded-3xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--clinical-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]/10 disabled:bg-[var(--page-bg)]"
                />
                <button
                  onClick={() => void handleSend()}
                  disabled={!selectedThread || !draft.trim() || sending}
                  className="rounded-3xl bg-[var(--clinical-blue)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--clinical-blue-dk)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
