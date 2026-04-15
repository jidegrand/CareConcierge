import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useRoom } from '@/hooks/useRoom'
import { useRequestTypes } from '@/hooks/useRequestTypes'
import { supabase } from '@/lib/supabase'
import RequestTypeIcon from '@/components/RequestTypeIcon'
import { PRODUCT_NAME } from '@/lib/brand'

type TabId = 'requests' | 'services' | 'fun' | 'info'
const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'requests', label: 'REQUESTS', icon: <TabRequestIcon /> },
  { id: 'services', label: 'SERVICES', icon: <TabServicesIcon /> },
  { id: 'fun',      label: 'FUN',       icon: <TabFunIcon /> },
  { id: 'info',     label: 'INFO',      icon: <TabInfoIcon /> },
]

interface ActiveRequest {
  type:  string
  label: string
  time:  Date
}

export default function PatientPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { room, loading, error } = useRoom(roomId)
  const tenantId = room?.unit?.site?.tenant?.id
  const { requestTypes } = useRequestTypes(tenantId)
  const [activeTab,    setActiveTab]    = useState<TabId>('requests')
  const [submitting,   setSubmitting]   = useState(false)
  const [activeRequest, setActiveRequest] = useState<ActiveRequest | null>(null)
  const [progress,     setProgress]     = useState(0)
  const [callPressed,  setCallPressed]  = useState(false)
  const [submitError,  setSubmitError]  = useState<string | null>(null)
  // Set of request type IDs that already have a pending/acknowledged request for this room
  const [activeTypeSet, setActiveTypeSet] = useState<Set<string>>(new Set())

  // Load active types for this room + subscribe to realtime changes
  useEffect(() => {
    if (!room) return

    const loadActiveTypes = async () => {
      const { data } = await supabase
        .from('requests')
        .select('type')
        .eq('room_id', room.id)
        .in('status', ['pending', 'acknowledged'])
      setActiveTypeSet(new Set((data ?? []).map((r: { type: string }) => r.type)))
    }

    loadActiveTypes()

    const channel = supabase
      .channel(`patient-room-active:${room.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'requests', filter: `room_id=eq.${room.id}` },
        () => loadActiveTypes()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [room])

  // Animate progress bar on active request
  useEffect(() => {
    if (!activeRequest) return
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100 }
        return p + 2
      })
    }, 160) // ~8 seconds to fill
    return () => clearInterval(interval)
  }, [activeRequest])

  const submitRequest = async (id: string, label: string, urgent: boolean) => {
    if (!room || submitting || activeTypeSet.has(id)) return
    setSubmitting(true)
    setSubmitError(null)
    const { error } = await supabase.from('requests').insert({
      room_id:   room.id,
      type:      id,
      is_urgent: urgent,
      status:    'pending',
    })
    if (error) {
      setSubmitError(error.message)
      setSubmitting(false)
      return
    }
    // Optimistically mark this type as active so the button disables immediately
    setActiveTypeSet(prev => new Set(prev).add(id))
    setActiveRequest({ type: id, label, time: new Date() })
    setSubmitting(false)
  }

  const handleCallNurse = async () => {
    if (!room || callPressed || activeTypeSet.has('nurse')) return
    setCallPressed(true)
    setSubmitError(null)
    const { error } = await supabase.from('requests').insert({
      room_id:   room.id,
      type:      'nurse',
      is_urgent: true,
      status:    'pending',
    })
    if (error) {
      setSubmitError(error.message)
      setCallPressed(false)
      return
    }
    setActiveTypeSet(prev => new Set(prev).add('nurse'))
    setActiveRequest({ type: 'nurse', label: 'Call Nurse', time: new Date() })
  }

  const dismiss = () => {
    setActiveRequest(null)
    setCallPressed(false)
    // Don't clear activeTypeSet — it reflects real DB state and will update via realtime
  }

  const orgName = room?.unit?.site?.tenant?.name ?? PRODUCT_NAME
  const commonRequests = requestTypes.filter(item => item.active && item.id !== 'nurse')

  if (loading) return <LoadingScreen />
  if (error || !room) return <ErrorScreen />

  return (
    <div
      className="min-h-screen md:px-6 md:py-8"
      style={{
        background: 'radial-gradient(circle at top, #f8fbff 0%, #edf2f7 42%, #e5ebf3 100%)',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <div className="relative mx-auto flex min-h-screen max-w-[480px] flex-col bg-[#F0F4F8] md:min-h-[calc(100vh-4rem)] md:max-w-[980px] md:overflow-hidden md:rounded-[32px] md:border md:border-white/70 md:shadow-[0_30px_80px_rgba(15,23,42,0.18)]">

        {/* ── Top bar ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-6 pb-3" style={{ background: '#F0F4F8' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#1D6FA8] flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[17px] font-bold text-[#1A1A2E]">{orgName}</p>
              <p className="truncate text-xs font-medium text-[#7A8597]">{room.unit?.name ?? room.name}</p>
            </div>
          </div>
          <button className="w-9 h-9 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center shadow-sm flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>

        {/* ── Tab content ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pb-6">

          {activeTab === 'requests' && (
            <>
              {/* ── Emergency Call Nurse Hero ── */}
              <div className="rounded-3xl overflow-hidden mb-5 shadow-md"
                style={{ background: 'linear-gradient(160deg, #C0392B 0%, #96281B 100%)' }}>
                <div className="px-6 pt-8 pb-7 text-center">
                  {/* Asterisk circle */}
                  <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.18)' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                      <path d="M11 2h2v8.27l6.29-4.2 1.06 1.59L14 12l6.35 4.34-1.06 1.59L14 13.73V22h-2v-8.27l-6.29 4.2-1.06-1.59L11 12 4.65 7.66l1.06-1.59L11 10.27z"/>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1">Call Nurse</h2>
                  <p className="text-white/75 text-sm mb-6 leading-relaxed">
                    For urgent assistance or pain relief
                  </p>
                  <button
                    onClick={handleCallNurse}
                    disabled={callPressed || submitting || activeTypeSet.has('nurse')}
                    className="px-10 py-3.5 rounded-full font-bold text-base transition-all active:scale-95 disabled:opacity-70"
                    style={{ background: 'white', color: '#C0392B' }}>
                    {activeTypeSet.has('nurse') ? 'Nurse Notified ✓' : callPressed ? 'Notifying…' : 'Press Now'}
                  </button>
                </div>
              </div>

              {/* ── Common Requests grid ── */}
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-[17px] font-bold text-[#1A1A2E]">Common Requests</h3>
                <span className="text-xs font-semibold tracking-widest text-[#9CA3AF]">TAP TO SEND</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5 md:grid-cols-3">
                {commonRequests.map(req => {
                  const alreadyActive = activeTypeSet.has(req.id)
                  return (
                    <button
                      key={req.id}
                      onClick={() => submitRequest(req.id, req.label, req.urgent)}
                      disabled={submitting || alreadyActive}
                      className="rounded-2xl p-5 flex flex-col items-center justify-center gap-3 shadow-sm border active:scale-[0.97] transition-all relative overflow-hidden"
                      style={{
                        minHeight: '140px',
                        background: alreadyActive
                          ? 'linear-gradient(180deg, #F0FDF4 0%, #DCFCE7 100%)'
                          : 'linear-gradient(180deg, #FFFFFF 0%, #F7FBFF 100%)',
                        borderColor: alreadyActive ? '#86EFAC' : '#DCE8F3',
                        opacity: alreadyActive ? 1 : submitting ? 0.5 : 1,
                      }}>
                      {alreadyActive && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                      )}
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-2xl border text-[28px]"
                        style={{
                          background: alreadyActive ? '#D1FAE514' : `${req.color}14`,
                          borderColor: alreadyActive ? '#6EE7B7' : `${req.color}33`,
                        }}>
                        <RequestTypeIcon
                          icon={req.icon}
                          label={req.label}
                          className="text-[28px]"
                          imageClassName="h-8 w-8 object-contain"
                        />
                      </div>
                      <div className="text-center">
                        <span className="text-[15px] font-semibold" style={{ color: alreadyActive ? '#065F46' : '#1A1A2E' }}>
                          {req.label}
                        </span>
                        {alreadyActive && (
                          <p className="text-[11px] font-medium text-green-600 mt-0.5">Request sent</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {submitError && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}

            </>
          )}

          {/* ── Services tab ── */}
          {activeTab === 'services' && (
            <ComingSoon icon="🛎️" title="Services" sub="Hospital services and amenities coming soon." />
          )}

          {/* ── Fun tab ── */}
          {activeTab === 'fun' && (
            <ComingSoon icon="🎮" title="Entertainment" sub="Games, music, and relaxation content coming soon." />
          )}

          {/* ── Info tab ── */}
          {activeTab === 'info' && (
            <div className="space-y-3 pt-2">
              <InfoCard
                title="Your Bay"
                value={room.name}
                icon="🏥"
              />
              <InfoCard
                title="Unit"
                value={room.unit?.name ?? '—'}
                icon="📍"
              />
              <InfoCard
                title="Site"
                value={room.unit?.site?.name ?? '—'}
                icon="🏢"
              />
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F3F4F6]">
                <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">About</p>
                <p className="text-sm text-[#4B5563] leading-relaxed">
                  Use the Requests tab to send a message to your care team.
                  For emergencies, press the red Call Nurse button or the
                  physical call button on your bed.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

        {/* ── Bottom tab bar ─────────────────────────────────────── */}
        <div className="bg-white border-t border-[#E5E7EB] px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-8px_20px_rgba(15,23,42,0.05)]">
          <div className="flex">
            {TABS.map(tab => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors">
                  <div className={`transition-colors ${active ? 'text-[#1D6FA8]' : 'text-[#9CA3AF]'}`}>
                    {tab.icon}
                  </div>
                  <span className={`text-[10px] font-bold tracking-wider transition-colors ${
                    active ? 'text-[#1D6FA8]' : 'text-[#9CA3AF]'
                  }`}>
                    {tab.label}
                  </span>
                  {active && (
                    <div className="absolute bottom-0 h-0.5 w-12 rounded-t-full bg-[#1D6FA8]" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {activeRequest && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0f172a]/35 p-4 backdrop-blur-[2px]">
            <div
              className="w-full max-w-md rounded-[28px] border border-[#D8E6F3] p-5 shadow-2xl md:p-6"
              style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #EEF7FF 100%)' }}>
              <div className="mb-4 flex items-start gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-[#CFE0F0]">
                  <div className="w-full h-full bg-[#DDEEFF] flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#1D6FA8">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full bg-[#DCEEFF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1D6FA8]">
                      Active Request
                    </span>
                    <span className="text-xs text-[#6B7C93]">Just now</span>
                  </div>
                  <p className="text-base font-bold leading-tight text-[#16324F] md:text-lg">
                    Your care team has been notified.
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[#4C6178]">
                    Requested: <span className="font-semibold text-[#16324F]">{activeRequest.label}</span>.
                    Estimated arrival: <span className="font-semibold text-[#16324F]">2–4 mins</span>.
                  </p>
                </div>
                <button onClick={dismiss} className="mt-0.5 text-[#7A8DA3] transition-colors hover:text-[#16324F]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div className="mb-5 w-full overflow-hidden rounded-full bg-[#D8E6F3]">
                <div className="h-1.5 rounded-full bg-[#1D6FA8] transition-all duration-300"
                  style={{ width: `${progress}%` }} />
              </div>

              <button
                onClick={dismiss}
                className="w-full rounded-2xl bg-[#1D6FA8] px-4 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98]">
                Okay
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ComingSoon({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="text-center py-20">
      <p className="text-5xl mb-4">{icon}</p>
      <p className="font-bold text-[#1A1A2E] text-lg mb-1">{title}</p>
      <p className="text-sm text-[#9CA3AF]">{sub}</p>
    </div>
  )
}

function InfoCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="bg-white rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm border border-[#F3F4F6]">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">{title}</p>
        <p className="text-base font-bold text-[#1A1A2E] mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-[#1D6FA8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#9CA3AF]">Loading…</p>
      </div>
    </div>
  )
}

function ErrorScreen() {
  return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center px-8">
      <div className="text-center">
        <p className="text-4xl mb-4">🔍</p>
        <p className="font-bold text-[#1A1A2E] mb-1">Room not found</p>
        <p className="text-sm text-[#9CA3AF]">Please scan the QR code at your bedside again or ask a staff member for help.</p>
      </div>
    </div>
  )
}

// ── Tab icons ─────────────────────────────────────────────────────────────────
function TabRequestIcon()  {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}
function TabServicesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}
function TabFunIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
    </svg>
  )
}
function TabInfoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  )
}
