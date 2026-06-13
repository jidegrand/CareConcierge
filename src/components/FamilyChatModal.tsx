import { useEffect, useRef, useState } from 'react'
import { useFamilyChat } from '@/hooks/useFamilyChat'

interface Props {
  open: boolean
  onClose: () => void
  residentId: string | undefined
  residentName: string
  facilityName: string
}

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function FamilyChatModal({ open, onClose, residentId, residentName, facilityName }: Props) {
  const { messages, loading, sending, error, sendMessage } = useFamilyChat(residentId, open)
  const [draft, setDraft] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) setDraft('')
  }, [open])

  useEffect(() => {
    if (!open) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

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
      <div className="flex h-[min(88vh,680px)] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-[var(--surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Message {facilityName}</h3>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              About {residentName} · staff will reply here
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--page-bg)] hover:text-[var(--text-primary)]"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
              <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-[var(--clinical-blue)] border-t-transparent" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center px-4">
              <div className="text-center">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Start the conversation</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Send a message to the care team about {residentName}.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map(message => {
                const mine = message.sender_role === 'family'
                return (
                  <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-3xl px-4 py-2.5 shadow-sm ${
                      mine
                        ? 'bg-[var(--clinical-blue)] text-white'
                        : 'border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)]'
                    }`}>
                      <p className="text-sm leading-relaxed">{message.body}</p>
                      <p className={`mt-1.5 text-[11px] ${mine ? 'text-white/75' : 'text-[var(--text-muted)]'}`}>
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

        <div className="border-t border-[var(--border)] px-4 py-3">
          {error && (
            <div className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void handleSend()
                }
              }}
              placeholder="Type a message…"
              disabled={sending}
              rows={2}
              className="min-h-[48px] flex-1 resize-none rounded-3xl border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--clinical-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]/10"
            />
            <button
              onClick={() => void handleSend()}
              disabled={!draft.trim() || sending}
              className="rounded-3xl bg-[var(--clinical-blue)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--clinical-blue-dk)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? '…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
