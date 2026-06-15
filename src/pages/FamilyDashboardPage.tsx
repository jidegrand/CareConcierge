import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTenantContext } from '@/hooks/useTenantContext'
import { useFamilyPortal, type FamilyActivityItem } from '@/hooks/useFamilyPortal'
import { useFamilyChat } from '@/hooks/useFamilyChat'
import { useDarkMode } from '@/hooks/useDarkMode'
import RequestTypeIcon from '@/components/RequestTypeIcon'
import FamilyChatModal from '@/components/FamilyChatModal'
import { formatResidentShortName } from '@/lib/constants'

interface InviteSiblingResult {
  success: boolean
  error?: string
  warning?: string
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatActivityTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  if (date.toDateString() === now.toDateString()) return `Today at ${time}`

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`

  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`
}

function formatActivityClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function activityDateLabel(iso: string): string {
  const date = new Date(iso)
  const now = new Date()

  if (date.toDateString() === now.toDateString()) return 'Today'

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

function groupActivityByDate(activity: FamilyActivityItem[]): { label: string; items: FamilyActivityItem[] }[] {
  const groups: { label: string; items: FamilyActivityItem[] }[] = []

  for (const item of activity) {
    const label = activityDateLabel(item.timestamp)
    const current = groups[groups.length - 1]
    if (current && current.label === label) {
      current.items.push(item)
    } else {
      groups.push({ label, items: [item] })
    }
  }

  return groups
}

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      className={`flex-shrink-0 text-[var(--text-muted)] transition-transform ${collapsed ? '-rotate-90' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function FamilyDashboardPage() {
  const { profile, signOut } = useAuth()
  const { tenantId, tenantName } = useTenantContext()
  const { loading, error, familyMember, resident, requestTypes, activity, activeFamilyRequestTypes, activeFamilyRequestIds, submitRequest, cancelRequest, inviteSibling } = useFamilyPortal(tenantId)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [activeRequestModal, setActiveRequestModal] = useState<{ requestId: string; label: string } | null>(null)
  const [canceling, setCanceling] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteSentMessage, setInviteSentMessage] = useState<string | null>(null)
  const { unreadCount } = useFamilyChat(resident?.id, showChat)
  const { dark, toggle: toggleDark } = useDarkMode()
  const [activitySeenAt, setActivitySeenAt] = useState<string | null>(null)
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set())
  const activitySectionRef = useRef<HTMLDivElement>(null)
  const initializedSeenRef = useRef(false)
  const collapseInitializedRef = useRef(false)

  // First time activity loads for this resident: adopt any previously stored
  // "seen" timestamp, or (on a brand-new device) treat current activity as
  // already seen so the bell doesn't light up on first visit.
  useEffect(() => {
    if (!resident || activity.length === 0 || initializedSeenRef.current) return
    initializedSeenRef.current = true
    const key = `bayrequest_family_activity_seen_${resident.id}`
    const stored = localStorage.getItem(key)
    if (stored) {
      setActivitySeenAt(stored)
    } else {
      localStorage.setItem(key, activity[0].timestamp)
      setActivitySeenAt(activity[0].timestamp)
    }
  }, [resident, activity])

  const hasNewActivity = activity.length > 0 && !!activitySeenAt && new Date(activity[0].timestamp) > new Date(activitySeenAt)

  // Collapse everything except "Today" by default, once activity first loads.
  useEffect(() => {
    if (collapseInitializedRef.current || activity.length === 0) return
    collapseInitializedRef.current = true
    const groups = groupActivityByDate(activity)
    setCollapsedDates(new Set(groups.filter(g => g.label !== 'Today').map(g => g.label)))
  }, [activity])

  const toggleDateGroup = (label: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const handleBellClick = () => {
    if (resident && activity.length > 0) {
      localStorage.setItem(`bayrequest_family_activity_seen_${resident.id}`, activity[0].timestamp)
      setActivitySeenAt(activity[0].timestamp)
    }
    activitySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleRequest = async (typeId: string, label: string) => {
    setSubmittingId(typeId)
    setFeedback(null)
    const result = await submitRequest(typeId)
    setSubmittingId(null)
    if (result.success && result.requestId) {
      setActiveRequestModal({ requestId: result.requestId, label })
    } else {
      setFeedback(result.error ?? 'Failed to send request.')
    }
  }

  const handleCancelRequest = async () => {
    if (!activeRequestModal) return
    setCanceling(true)
    const result = await cancelRequest(activeRequestModal.requestId)
    setCanceling(false)
    if (result.success) {
      setActiveRequestModal(null)
    } else {
      setFeedback(result.error ?? 'Failed to cancel request.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !resident) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 text-center">
          <p className="text-[var(--text-primary)] font-semibold mb-1">Unable to load your portal</p>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {error ?? 'No resident is linked to this account yet.'}
          </p>
          <button onClick={() => signOut()} className="text-sm font-semibold text-[var(--clinical-blue)]">
            Sign out
          </button>
        </div>
      </div>
    )
  }

  const displayName = profile?.full_name ?? familyMember?.full_name ?? 'there'
  const firstName = displayName.split(' ')[0]
  const lastActivityTimestamp = activity[0]?.timestamp

  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      <div className="mx-auto max-w-[480px] min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-6 pb-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {tenantName ?? 'Family Portal'}
            </p>
            <h1 className="text-[22px] font-extrabold text-[var(--text-primary)] leading-tight">
              Hi, {firstName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInvite(true)}
              aria-label="Invite a family member"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--page-bg)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </button>
            <button
              onClick={handleBellClick}
              aria-label={hasNewActivity ? 'New updates available' : 'Activity'}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--page-bg)]"
            >
              <BellIcon />
              {hasNewActivity && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
            <button
              onClick={toggleDark}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--page-bg)]"
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button onClick={() => signOut()} className="text-[13px] font-semibold text-[var(--clinical-blue)]">
              Sign out
            </button>
          </div>
        </div>

        <div className="flex-1 px-5 pb-24 pt-3 space-y-5">
          {/* Resident card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)] flex items-center justify-center font-bold text-[15px] flex-shrink-0">
              {getInitials(resident.display_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[var(--text-primary)] truncate">
                {formatResidentShortName(resident.display_name)}
              </p>
              <p className="text-[12px] text-[var(--text-muted)] truncate">
                {lastActivityTimestamp
                  ? `Last activity ${formatActivityTime(lastActivityTimestamp)}`
                  : 'No recent activity'}
              </p>
            </div>
          </div>

          {/* Feedback toast */}
          {feedback && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-secondary)]">
              {feedback}
            </div>
          )}

          {/* Quick requests */}
          {requestTypes.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] mb-3">
                Quick Requests
              </p>
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {requestTypes.map(rt => {
                  const alreadyActive = activeFamilyRequestTypes.has(rt.id)
                  return (
                    <button
                      key={rt.id}
                      onClick={() => {
                        if (alreadyActive) {
                          const requestId = activeFamilyRequestIds[rt.id]
                          if (requestId) setActiveRequestModal({ requestId, label: rt.label })
                          return
                        }
                        handleRequest(rt.id, rt.label)
                      }}
                      disabled={submittingId !== null}
                      className="relative flex flex-col items-center gap-2 rounded-2xl p-2.5 text-center border border-[var(--border)] bg-[var(--surface)] active:scale-[0.97] transition-transform disabled:opacity-60"
                    >
                      {alreadyActive && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                          <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                      )}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[16px] flex-shrink-0"
                        style={{ backgroundColor: `${rt.color}1A` }}
                      >
                        <RequestTypeIcon icon={rt.icon} label={rt.label} imageClassName="h-5 w-5 object-contain" />
                      </div>
                      <span className="text-[11px] font-semibold text-[var(--text-primary)] leading-tight line-clamp-2 break-words">
                        {submittingId === rt.id ? 'Sending…' : alreadyActive ? 'In progress' : rt.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Activity, grouped by date */}
          <div ref={activitySectionRef}>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] mb-3">
              Activity
            </p>
            {activity.length === 0 ? (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
                <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">No activity yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {groupActivityByDate(activity).map(group => {
                  const collapsed = collapsedDates.has(group.label)
                  return (
                    <div key={group.label} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleDateGroup(group.label)}
                        className="w-full flex items-center justify-between gap-2 px-4 py-2.5"
                      >
                        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                          {group.label}
                          <span className="ml-1.5 font-normal text-[var(--text-muted)]">({group.items.length})</span>
                        </span>
                        <ChevronIcon collapsed={collapsed} />
                      </button>
                      {!collapsed && (
                        <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
                          {group.items.map(item => (
                            <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                              <span
                                className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                                  item.statusColor === 'green' ? 'bg-emerald-500'
                                    : item.statusColor === 'amber' ? 'bg-amber-500'
                                    : 'bg-gray-300'
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] text-[var(--text-primary)] leading-snug">
                                  {item.text}
                                  {item.detail && <span className="text-[var(--text-muted)]"> — {item.detail}</span>}
                                </p>
                                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                                  {item.staffAttribution && `— ${item.staffAttribution}, `}
                                  {formatActivityClock(item.timestamp)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-6 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--clinical-blue)] text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label={`Message ${tenantName ?? 'the facility'}`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <FamilyChatModal
        open={showChat}
        onClose={() => setShowChat(false)}
        residentId={resident.id}
        residentName={formatResidentShortName(resident.display_name)}
        facilityName={tenantName ?? 'the facility'}
      />

      {activeRequestModal && (
        <FamilyRequestStatusModal
          label={activeRequestModal.label}
          canceling={canceling}
          onCancel={handleCancelRequest}
          onDismiss={() => setActiveRequestModal(null)}
        />
      )}

      {showInvite && (
        <InviteFamilyMemberModal
          residentName={formatResidentShortName(resident.display_name)}
          onClose={() => setShowInvite(false)}
          onInvite={inviteSibling}
          onSent={message => {
            setShowInvite(false)
            setInviteSentMessage(message)
          }}
        />
      )}

      {inviteSentMessage && (
        <InviteSentModal
          message={inviteSentMessage}
          onClose={() => setInviteSentMessage(null)}
        />
      )}
    </div>
  )
}

// ── Request received modal ────────────────────────────────────────────────────
// Shows a confirmation after a family member sends a quick request, mirroring
// the patient-facing "request received" acknowledgement.
function FamilyRequestStatusModal({ label, canceling, onCancel, onDismiss }: {
  label: string
  canceling: boolean
  onCancel: () => void
  onDismiss: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center bg-[var(--success-lt)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>

          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2 flex-wrap">
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)]">
                Received
              </span>
              <span className="text-xs text-[var(--text-muted)]">{label}</span>
            </div>
            <p className="text-base font-bold leading-tight text-[var(--text-primary)] md:text-lg">
              Your request has been received
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
              The care team has been notified and will follow up shortly.
            </p>
            <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">
              You can cancel this request if it's no longer needed.
            </p>
          </div>

          <button onClick={onDismiss} className="mt-0.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-lt)] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[var(--success)] flex items-center justify-center flex-shrink-0">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </span>
            <p className="text-sm font-medium text-[var(--success)]">
              We have received your request and alerted the care team.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={canceling}
            className="w-full rounded-2xl px-4 py-3 text-sm font-bold transition-transform active:scale-[0.98] disabled:opacity-70 bg-[var(--danger-lt)] text-[var(--danger)]"
          >
            {canceling ? 'Cancelling…' : 'Cancel request'}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="w-full rounded-2xl px-4 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] bg-[var(--clinical-blue)]"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Invite family member modal ────────────────────────────────────────────────
// Lets a signed-in family member invite a sibling/relative to also follow the
// resident, without involving staff. Reuses the same staff invite pipeline
// (token + pending_family_invites + auth invite email) via an edge function
// scoped to the caller's own resident.
function InviteFamilyMemberModal({ residentName, onClose, onInvite, onSent }: {
  residentName: string
  onClose: () => void
  onInvite: (input: { fullName: string; email: string; relationship?: string }) => Promise<InviteSiblingResult>
  onSent: (message: string) => void
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [relationship, setRelationship] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!fullName.trim() || !email.trim()) return
    setBusy(true)
    setError(null)
    const result = await onInvite({ fullName, email, relationship: relationship.trim() || undefined })
    setBusy(false)
    if (result.success) {
      onSent(result.warning ?? `Invite sent to ${email.trim()}.`)
    } else {
      setError(result.error ?? 'Failed to send invite.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-bold text-[var(--text-primary)] md:text-lg">Invite a family member</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
              Let another relative follow {residentName}'s updates and message the care team.
            </p>
          </div>
          <button onClick={onClose} className="mt-0.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)]">Full name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="e.g. James Carter"
              autoFocus
              className="w-full mt-1 text-sm px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]/20 focus:border-[var(--clinical-blue)]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)]">Email address</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email"
              placeholder="name@example.com"
              className="w-full mt-1 text-sm px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]/20 focus:border-[var(--clinical-blue)]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)]">Relationship (optional)</label>
            <input value={relationship} onChange={e => setRelationship(e.target.value)}
              placeholder="e.g. Brother"
              className="w-full mt-1 text-sm px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]/20 focus:border-[var(--clinical-blue)]" />
          </div>

          {error && <p className="text-xs font-medium text-[var(--danger)]">{error}</p>}

          <div className="flex flex-col gap-3 pt-1">
            <button
              type="button"
              onClick={submit}
              disabled={busy || !fullName.trim() || !email.trim()}
              className="w-full rounded-2xl px-4 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60 bg-[var(--clinical-blue)]"
            >
              {busy ? 'Sending…' : 'Send invite'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl px-4 py-3 text-sm font-bold transition-transform active:scale-[0.98] bg-[var(--page-bg)] text-[var(--text-secondary)]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Invite sent modal ─────────────────────────────────────────────────────────
// Confirms that a family invite was sent successfully, mirroring the
// "request received" acknowledgement shown for quick requests.
function InviteSentModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center bg-[var(--success-lt)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>

          <div className="flex-1">
            <span className="mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[var(--success-lt)] text-[var(--success)]">
              Sent
            </span>
            <p className="text-base font-bold leading-tight text-[var(--text-primary)] md:text-lg">
              Invite sent
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
              {message}
            </p>
          </div>

          <button onClick={onClose} className="mt-0.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl px-4 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] bg-[var(--clinical-blue)]"
        >
          Done
        </button>
      </div>
    </div>
  )
}
