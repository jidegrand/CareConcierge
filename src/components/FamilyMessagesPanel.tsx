import { useEffect, useMemo, useRef, useState } from 'react'
import { useFamilyChatStaff } from '@/hooks/useFamilyChatStaff'

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

function initialsOf(value: string, fallback: string) {
  const source = value.trim() || fallback
  return source
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function FamilyMessagesPanel({ open, onClose }: Props) {
  const {
    residents,
    selectedResidentId,
    setSelectedResidentId,
    messages,
    loading,
    sending,
    error,
    sendMessage,
  } = useFamilyChatStaff(open)
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

  const filteredResidents = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return residents
    return residents.filter(r =>
      r.resident_name.toLowerCase().includes(query) ||
      (r.room_label ?? '').toLowerCase().includes(query)
    )
  }, [search, residents])

  const selectedResident = residents.find(r => r.resident_id === selectedResidentId) ?? null

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
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Family Messages</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Direct messages from family members about their resident.
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
                placeholder="Search residents..."
                className="mt-4 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--clinical-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]/10"
              />
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-[var(--clinical-blue)] border-t-transparent" />
                  <span className="text-sm">Loading...</span>
                </div>
              ) : filteredResidents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white px-4 py-5 text-sm text-[var(--text-muted)]">
                  No residents with a linked family member yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredResidents.map(r => (
                    <button
                      key={r.resident_id}
                      onClick={() => setSelectedResidentId(r.resident_id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                        selectedResidentId === r.resident_id
                          ? 'border-[var(--clinical-blue)] bg-white shadow-sm'
                          : 'border-transparent bg-white/80 hover:border-[var(--border)] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#EDE9FE] text-sm font-bold text-[#6D28D9]">
                          {initialsOf(r.resident_name, r.resident_id)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                              {r.resident_name}
                            </p>
                            {r.unread_count > 0 && (
                              <span className="rounded-full bg-[var(--clinical-blue)] px-2 py-0.5 text-[10px] font-bold text-white">
                                {r.unread_count}
                              </span>
                            )}
                          </div>
                          {r.room_label && (
                            <p className="mt-0.5 truncate text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                              {r.room_label}
                            </p>
                          )}
                          <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                            {r.last_message_body ?? 'No messages yet'}
                          </p>
                          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                            {formatMessageTime(r.last_message_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <section className="flex min-h-0 flex-1 flex-col bg-white">
            <div className="border-b border-[var(--border)] px-5 py-4">
              {selectedResident ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EDE9FE] text-sm font-bold text-[#6D28D9]">
                    {initialsOf(selectedResident.resident_name, selectedResident.resident_id)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {selectedResident.resident_name}
                    </p>
                    {selectedResident.room_label && (
                      <p className="truncate text-xs text-[var(--text-muted)]">{selectedResident.room_label}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Select a resident</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Choose a resident on the left to view and reply to their family's messages.
                  </p>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {!selectedResident && (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-sm text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#EDE9FE] text-[#6D28D9]">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">No thread selected</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Messages from family members appear here, organized by resident.
                    </p>
                  </div>
                </div>
              )}

              {selectedResident && messages.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-sm text-center">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">No messages yet</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Send a message to {selectedResident.resident_name}'s family.
                    </p>
                  </div>
                </div>
              )}

              {selectedResident && messages.length > 0 && (
                <div className="space-y-3">
                  {messages.map(message => {
                    const mine = message.sender_role === 'staff'
                    return (
                      <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] rounded-3xl px-4 py-3 shadow-sm ${
                          mine
                            ? 'bg-[var(--clinical-blue)] text-white'
                            : 'border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)]'
                        }`}>
                          <p className="text-sm leading-relaxed">{message.body}</p>
                          <p className={`mt-2 text-[11px] ${mine ? 'text-white/75' : 'text-[var(--text-muted)]'}`}>
                            {mine ? 'You' : message.sender_name} · {formatMessageTime(message.created_at)}
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
                  placeholder={selectedResident ? 'Type a message...' : 'Select a resident to start chatting'}
                  disabled={!selectedResident || sending}
                  rows={2}
                  className="min-h-[56px] flex-1 resize-none rounded-3xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--clinical-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]/10 disabled:bg-[var(--page-bg)]"
                />
                <button
                  onClick={() => void handleSend()}
                  disabled={!selectedResident || !draft.trim() || sending}
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
