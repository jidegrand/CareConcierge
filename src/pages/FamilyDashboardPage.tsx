import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTenantContext } from '@/hooks/useTenantContext'
import { useFamilyPortal } from '@/hooks/useFamilyPortal'
import { useFamilyChat } from '@/hooks/useFamilyChat'
import { useDarkMode } from '@/hooks/useDarkMode'
import RequestTypeIcon from '@/components/RequestTypeIcon'
import FamilyChatModal from '@/components/FamilyChatModal'
import { formatResidentShortName } from '@/lib/constants'

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

export default function FamilyDashboardPage() {
  const { profile, signOut } = useAuth()
  const { tenantId, tenantName } = useTenantContext()
  const { loading, error, familyMember, resident, requestTypes, activity, activeFamilyRequestType, submitRequest } = useFamilyPortal(tenantId)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)
  const { unreadCount } = useFamilyChat(resident?.id, showChat)
  const { dark, toggle: toggleDark } = useDarkMode()
  const [activitySeenAt, setActivitySeenAt] = useState<string | null>(null)
  const activitySectionRef = useRef<HTMLDivElement>(null)
  const initializedSeenRef = useRef(false)

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
    if (result.success) {
      setFeedback(`${label} — request sent.`)
      window.setTimeout(() => setFeedback(null), 3000)
    } else {
      setFeedback(result.error ?? 'Failed to send request.')
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
              {activeFamilyRequestType && (
                <p className="text-[12px] text-[var(--text-muted)] mb-3">
                  You have a request in progress. New requests are paused until it's resolved.
                </p>
              )}
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {requestTypes.map(rt => (
                  <button
                    key={rt.id}
                    onClick={() => handleRequest(rt.id, rt.label)}
                    disabled={submittingId !== null || activeFamilyRequestType !== null}
                    className="flex flex-col items-center gap-2 rounded-2xl p-2.5 text-center border border-[var(--border)] bg-[var(--surface)] active:scale-[0.97] transition-transform disabled:opacity-60"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[16px] flex-shrink-0"
                      style={{ backgroundColor: `${rt.color}1A` }}
                    >
                      <RequestTypeIcon icon={rt.icon} label={rt.label} imageClassName="h-5 w-5 object-contain" />
                    </div>
                    <span className="text-[11px] font-semibold text-[var(--text-primary)] leading-tight line-clamp-2 break-words">
                      {submittingId === rt.id ? 'Sending…' : rt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Today's activity */}
          <div ref={activitySectionRef}>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] mb-3">
              Today's Activity
            </p>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)]">
              {activity.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">No activity yet.</p>
              )}
              {activity.map(item => (
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
                      {formatActivityTime(item.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
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
    </div>
  )
}
