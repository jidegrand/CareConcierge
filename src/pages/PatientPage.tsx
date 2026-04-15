import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useRoom } from '@/hooks/useRoom'
import { useRequestTypes } from '@/hooks/useRequestTypes'
import { useTenantSettings } from '@/hooks/useTenantSettings'
import {
  PATIENT_LANGUAGE_OPTIONS,
  PATIENT_LANGUAGE_STORAGE_KEY,
  formatFeedbackThanks,
  getInitialPatientLanguage,
  getPatientCopy,
  translateRequestTypeLabel,
  type PatientLanguage,
} from '@/lib/patientI18n'
import { supabase } from '@/lib/supabase'
import { playPatientReceipt } from '@/lib/sounds'
import RequestTypeIcon from '@/components/RequestTypeIcon'
import { PRODUCT_NAME } from '@/lib/brand'

type TabId = 'requests' | 'services' | 'fun' | 'info'

interface ActiveRequest {
  id: string
  type: string
  baseLabel: string
  time: Date
  status: 'pending' | 'acknowledged' | 'resolved'
}

interface ActiveRequestRow {
  id:         string
  type:       string
  status:     'pending' | 'acknowledged'
  created_at: string
}

export default function PatientPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { room, loading, error } = useRoom(roomId)
  const tenantId = room?.unit?.site?.tenant?.id
  const { requestTypes } = useRequestTypes(tenantId)
  const { settings: tenantSettings } = useTenantSettings(tenantId)
  const [language, setLanguage] = useState<PatientLanguage>(() => getInitialPatientLanguage())
  const [activeTab,    setActiveTab]    = useState<TabId>('requests')
  const [submitting,   setSubmitting]   = useState(false)
  const [activeRequest, setActiveRequest] = useState<ActiveRequest | null>(null)
  const [activeRequestsByType, setActiveRequestsByType] = useState<Record<string, ActiveRequestRow>>({})
  const [cancelingRequest, setCancelingRequest] = useState(false)
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [feedbackByRequestId, setFeedbackByRequestId] = useState<Record<string, number>>({})
  const [callPressed,  setCallPressed]  = useState(false)
  const [submitError,  setSubmitError]  = useState<string | null>(null)
  // Set of request type IDs that already have a pending/acknowledged request for this room
  const [activeTypeSet, setActiveTypeSet] = useState<Set<string>>(new Set())
  const copy = getPatientCopy(language)
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'requests', label: copy.requestsTab, icon: <TabRequestIcon /> },
    { id: 'services', label: copy.servicesTab, icon: <TabServicesIcon /> },
    { id: 'fun',      label: copy.funTab,      icon: <TabFunIcon /> },
    { id: 'info',     label: copy.infoTab,     icon: <TabInfoIcon /> },
  ]
  const getBaseRequestLabel = (type: string, fallbackLabel?: string) =>
    fallbackLabel ?? requestTypes.find(item => item.id === type)?.label ?? copy.requestGeneric
  const getRequestLabel = (type: string, fallbackLabel?: string) =>
    translateRequestTypeLabel(language, type, getBaseRequestLabel(type, fallbackLabel))

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(PATIENT_LANGUAGE_STORAGE_KEY, language)
  }, [language])

  useEffect(() => {
    setActiveRequest(prev => {
      if (!prev) return prev
      const nextBaseLabel = getBaseRequestLabel(prev.type, prev.baseLabel)
      return nextBaseLabel === prev.baseLabel ? prev : { ...prev, baseLabel: nextBaseLabel }
    })
  }, [language, requestTypes])

  const nurseBaseLabel = getBaseRequestLabel('nurse', 'Call Nurse')
  const commonRequests = requestTypes
    .filter(item => item.active && item.id !== 'nurse')
    .map(item => ({
      ...item,
      translatedLabel: getRequestLabel(item.id, item.label),
    }))

  // Load active types for this room + subscribe to realtime changes
  useEffect(() => {
    if (!room) return

    const loadActiveTypes = async () => {
      const { data } = await supabase
        .from('requests')
        .select('id, type, status, created_at')
        .eq('room_id', room.id)
        .in('status', ['pending', 'acknowledged'])
        .order('created_at', { ascending: false })

      const rows = (data ?? []) as ActiveRequestRow[]
      const nextByType: Record<string, ActiveRequestRow> = {}
      for (const row of rows) {
        if (!nextByType[row.type]) nextByType[row.type] = row
      }

      setActiveRequestsByType(nextByType)
      setActiveTypeSet(new Set(Object.keys(nextByType)))
      setActiveRequest(prev => {
        if (!prev) return prev
        const live = nextByType[prev.type]
        return live
          ? { ...prev, id: live.id, time: new Date(live.created_at), status: live.status }
          : { ...prev, status: 'resolved' }
      })
      if (!nextByType.nurse) setCallPressed(false)
    }

    loadActiveTypes()

    const channel = supabase
      .channel(`patient-room-active:${room.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'requests', filter: `room_id=eq.${room.id}` },
        payload => {
          if (payload.eventType === 'UPDATE') {
            const nextStatus = typeof payload.new.status === 'string' ? payload.new.status : null
            const nextType = typeof payload.new.type === 'string' ? payload.new.type : null
            const nextId = typeof payload.new.id === 'string' ? payload.new.id : null
            const createdAt = typeof payload.new.created_at === 'string' ? payload.new.created_at : null

            if (nextStatus === 'resolved' && nextType && nextId) {
              setActiveRequest(prev => {
                if (prev && prev.type !== nextType && prev.status !== 'resolved') return prev
                return {
                  id: nextId,
                  type: nextType,
                  baseLabel: prev?.baseLabel ?? getBaseRequestLabel(nextType),
                  time: createdAt ? new Date(createdAt) : prev?.time ?? new Date(),
                  status: 'resolved',
                }
              })
            }
          }

          void loadActiveTypes()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [room, requestTypes])

  useEffect(() => {
    setFeedbackError(null)
  }, [activeRequest?.id, activeRequest?.status])

  const openActiveRequest = (type: string, baseLabel: string) => {
    const live = activeRequestsByType[type]
    if (!live) return
    setSubmitError(null)
    setActiveRequest({
      id: live.id,
      type,
      baseLabel,
      time: new Date(live.created_at),
      status: live.status,
    })
  }

  const submitRequest = async (typeId: string, baseLabel: string, urgent: boolean) => {
    if (!room || submitting || cancelingRequest || activeTypeSet.has(typeId)) return
    setSubmitting(true)
    setSubmitError(null)
    const { data, error } = await supabase.from('requests').insert({
      room_id:   room.id,
      type:      typeId,
      is_urgent: urgent,
      status:    'pending',
    }).select('id, type, status, created_at').single()
    if (error) {
      setSubmitError(error.message)
      setSubmitting(false)
      return
    }
    const live = data as ActiveRequestRow
    setActiveRequestsByType(prev => ({ ...prev, [typeId]: live }))
    setActiveTypeSet(prev => new Set(prev).add(typeId))
    playPatientReceipt()
    setActiveRequest({ id: live.id, type: typeId, baseLabel, time: new Date(live.created_at), status: live.status })
    setSubmitting(false)
  }

  const handleCallNurse = async () => {
    if (!room || callPressed || cancelingRequest || activeTypeSet.has('nurse')) return
    setCallPressed(true)
    setSubmitError(null)
    const { data, error } = await supabase.from('requests').insert({
      room_id:   room.id,
      type:      'nurse',
      is_urgent: true,
      status:    'pending',
    }).select('id, type, status, created_at').single()
    if (error) {
      setSubmitError(error.message)
      setCallPressed(false)
      return
    }
    const live = data as ActiveRequestRow
    setActiveRequestsByType(prev => ({ ...prev, nurse: live }))
    setActiveTypeSet(prev => new Set(prev).add('nurse'))
    playPatientReceipt()
    setActiveRequest({ id: live.id, type: 'nurse', baseLabel: nurseBaseLabel, time: new Date(live.created_at), status: live.status })
  }

  const cancelRequest = async () => {
    if (!room || !activeRequest) return

    const live = activeRequestsByType[activeRequest.type]
    if (!live || !['pending', 'acknowledged'].includes(live.status)) {
      setActiveRequest(null)
      return
    }

    setCancelingRequest(true)
    setSubmitError(null)

    const { data, error } = await supabase
      .from('requests')
      .delete()
      .eq('room_id', room.id)
      .eq('type', activeRequest.type)
      .in('status', ['pending', 'acknowledged'])
      .select('id, type, status')

    if (error) {
      setSubmitError(error.message)
      setCancelingRequest(false)
      return
    }

    const deletedRows = (data ?? []) as Pick<ActiveRequestRow, 'id' | 'type'>[]
    if (deletedRows.length === 0) {
      const { data: refreshed } = await supabase
        .from('requests')
        .select('id, type, status, created_at')
        .eq('room_id', room.id)
        .in('status', ['pending', 'acknowledged'])
        .order('created_at', { ascending: false })

      const rows = (refreshed ?? []) as ActiveRequestRow[]
      const nextByType: Record<string, ActiveRequestRow> = {}
      for (const row of rows) {
        if (!nextByType[row.type]) nextByType[row.type] = row
      }

      setActiveRequestsByType(nextByType)
      setActiveTypeSet(new Set(Object.keys(nextByType)))
      if (!nextByType.nurse) setCallPressed(false)
      setSubmitError('This request is no longer available to cancel.')
      setCancelingRequest(false)
      return
    }

    setActiveRequestsByType(prev => {
      const next = { ...prev }
      delete next[activeRequest.type]
      return next
    })
    setActiveTypeSet(prev => {
      const next = new Set(prev)
      next.delete(activeRequest.type)
      return next
    })
    if (activeRequest.type === 'nurse') setCallPressed(false)
    setActiveRequest(null)
    setCancelingRequest(false)
  }

  const submitFeedback = async (rating: number) => {
    if (!activeRequest || activeRequest.status !== 'resolved' || feedbackSubmitting) return

    setFeedbackSubmitting(true)
    setFeedbackError(null)

    const { error } = await supabase
      .from('request_feedback')
      .insert({
        request_id: activeRequest.id,
        rating,
      })

    if (error) {
      if (error.code === '23505') {
        setFeedbackByRequestId(prev => ({ ...prev, [activeRequest.id]: rating }))
        setFeedbackSubmitting(false)
        return
      }
      setFeedbackError(error.message)
      setFeedbackSubmitting(false)
      return
    }

    setFeedbackByRequestId(prev => ({ ...prev, [activeRequest.id]: rating }))
    setFeedbackSubmitting(false)
  }

  const dismiss = () => {
    setActiveRequest(null)
    setCallPressed(false)
    setSubmitError(null)
    setFeedbackError(null)
    // Don't clear activeTypeSet — it reflects real DB state and will update via realtime
  }

  const orgName = room?.unit?.site?.tenant?.name ?? PRODUCT_NAME

  if (loading) return <LoadingScreen copy={copy} />
  if (error || !room) return <ErrorScreen copy={copy} />

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
          <div className="min-w-[132px] rounded-2xl border border-[#E5E7EB] bg-white px-3 py-2 shadow-sm">
            <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#7A8597]">
              {copy.language}
            </label>
            <select
              value={language}
              onChange={event => setLanguage(event.target.value as PatientLanguage)}
              className="mt-1 w-full bg-transparent text-sm font-semibold text-[#16324F] outline-none">
              {PATIENT_LANGUAGE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
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
                  <h2 className="text-2xl font-bold text-white mb-1">{copy.callNurseTitle}</h2>
                  <p className="text-white/75 text-sm mb-6 leading-relaxed">
                    {copy.callNurseSub}
                  </p>
                  <button
                    onClick={() => activeTypeSet.has('nurse')
                      ? openActiveRequest('nurse', nurseBaseLabel)
                      : handleCallNurse()}
                    disabled={callPressed || submitting || cancelingRequest}
                    className="px-10 py-3.5 rounded-full font-bold text-base transition-all active:scale-95 disabled:opacity-70"
                    style={{ background: 'white', color: '#C0392B' }}>
                    {activeTypeSet.has('nurse') ? `${copy.nurseNotified} ✓` : callPressed ? copy.notifying : copy.pressNow}
                  </button>
                </div>
              </div>

              {/* ── Common Requests grid ── */}
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-[17px] font-bold text-[#1A1A2E]">{copy.commonRequests}</h3>
                <span className="text-xs font-semibold tracking-widest text-[#9CA3AF]">{copy.tapToSend}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5 md:grid-cols-3">
                {commonRequests.map(req => {
                  const alreadyActive = activeTypeSet.has(req.id)
                  return (
                    <button
                      key={req.id}
                      onClick={() => alreadyActive
                        ? openActiveRequest(req.id, req.label)
                        : submitRequest(req.id, req.label, req.urgent)}
                      disabled={submitting || cancelingRequest}
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
                          label={req.translatedLabel}
                          className="text-[28px]"
                          imageClassName="h-8 w-8 object-contain"
                        />
                      </div>
                      <div className="text-center">
                        <span className="text-[15px] font-semibold" style={{ color: alreadyActive ? '#065F46' : '#1A1A2E' }}>
                          {req.translatedLabel}
                        </span>
                        {alreadyActive && (
                          <p className="text-[11px] font-medium text-green-600 mt-0.5">{copy.requestSent}</p>
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
            <ComingSoon icon="🛎️" title={copy.servicesTitle} sub={copy.servicesSub} />
          )}

          {/* ── Fun tab ── */}
          {activeTab === 'fun' && (
            <ComingSoon icon="🎮" title={copy.funTitle} sub={copy.funSub} />
          )}

          {/* ── Info tab ── */}
          {activeTab === 'info' && (
            <div className="space-y-3 pt-2">
              <InfoCard
                title={copy.yourBay}
                value={room.name}
                icon="🏥"
              />
              <InfoCard
                title={copy.unit}
                value={room.unit?.name ?? '—'}
                icon="📍"
              />
              <InfoCard
                title={copy.site}
                value={room.unit?.site?.name ?? '—'}
                icon="🏢"
              />
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F3F4F6]">
                <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">{copy.about}</p>
                <p className="text-sm text-[#4B5563] leading-relaxed">
                  {copy.aboutBody}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

        {/* ── Bottom tab bar ─────────────────────────────────────── */}
        <div className="bg-white border-t border-[#E5E7EB] px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-8px_20px_rgba(15,23,42,0.05)]">
          <div className="flex">
            {tabs.map(tab => {
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
          <RequestStatusModal
            request={activeRequest}
            language={language}
            canceling={cancelingRequest}
            error={submitError}
            feedbackEnabled={tenantSettings.patient_feedback_enabled}
            feedbackSubmitting={feedbackSubmitting}
            feedbackError={feedbackError}
            feedbackRating={feedbackByRequestId[activeRequest.id] ?? null}
            onDismiss={dismiss}
            onCancel={cancelRequest}
            onRate={submitFeedback}
          />
        )}
      </div>
    </div>
  )
}

// ── Request receipt modal ─────────────────────────────────────────────────────
// Shows a simple submission confirmation after a patient sends a request.
function RequestStatusModal({
  request,
  language,
  canceling,
  error,
  feedbackEnabled,
  feedbackSubmitting,
  feedbackError,
  feedbackRating,
  onDismiss,
  onCancel,
  onRate,
}: {
  request: ActiveRequest
  language: PatientLanguage
  canceling: boolean
  error: string | null
  feedbackEnabled: boolean
  feedbackSubmitting: boolean
  feedbackError: string | null
  feedbackRating: number | null
  onDismiss: () => void
  onCancel: () => void
  onRate: (rating: number) => void
}) {
  const { type, baseLabel, status } = request
  const copy = getPatientCopy(language)
  const label = translateRequestTypeLabel(language, type, baseLabel)
  const canCancel = status === 'pending' || status === 'acknowledged'
  const acknowledgementNote = status === 'acknowledged'
  const resolved = status === 'resolved'
  const showFeedbackPrompt = resolved && feedbackEnabled && feedbackRating === null
  const showFeedbackThanks = resolved && feedbackEnabled && feedbackRating !== null
  const badgeLabel = resolved ? copy.badgeCompleted : acknowledgementNote ? copy.badgeOnTheWay : copy.badgeReceived
  const title = resolved
    ? copy.titleCompleted
    : acknowledgementNote
      ? copy.titleAcknowledged
      : copy.titleReceived
  const body = resolved
    ? feedbackEnabled
      ? copy.bodyCompletedWithFeedback
      : copy.bodyCompleted
    : acknowledgementNote
      ? copy.bodyAcknowledged
      : copy.bodyReceived

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0f172a]/35 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-[28px] border p-5 shadow-2xl md:p-6 transition-all"
        style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F5FBFF 100%)', borderColor: '#D8E6F3' }}>

        {/* Icon + text */}
        <div className="mb-4 flex items-start gap-3">
          <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center"
            style={{ background: '#D1FAE5' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>

          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2 flex-wrap">
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ background: '#DCEEFF', color: '#1D6FA8' }}>
                {badgeLabel}
              </span>
              <span className="text-xs text-[#6B7C93]">{label}</span>
            </div>
            <p className="text-base font-bold leading-tight text-[#16324F] md:text-lg">
              {title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[#4C6178]">
              {body}
            </p>
            {canCancel && (
              <p className="mt-2 text-xs font-medium text-[#7A8DA3]">
                {acknowledgementNote
                  ? copy.cancelNoteAcknowledged
                  : copy.cancelNoteReceived}
              </p>
            )}
          </div>

          <button onClick={onDismiss} className="mt-0.5 text-[#7A8DA3] transition-colors hover:text-[#16324F]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-[#D1FAE5] bg-[#F0FDF4] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#22C55E] flex items-center justify-center flex-shrink-0">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </span>
            <p className="text-sm font-medium text-[#166534]">
              {resolved
                ? copy.bannerCompleted
                : copy.bannerReceived}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {showFeedbackPrompt && (
          <div className="mb-5 rounded-2xl border border-[#D8E6F3] bg-[#F8FBFF] px-4 py-4">
            <p className="text-sm font-semibold text-[#16324F]">{copy.feedbackTitle}</p>
            <p className="mt-1 text-xs text-[#6B7C93]">{copy.feedbackSub}</p>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => onRate(rating)}
                  disabled={feedbackSubmitting}
                  className="rounded-2xl border border-[#D8E6F3] bg-white px-2 py-3 text-center transition-transform active:scale-[0.98] disabled:opacity-60">
                  <div className="text-2xl leading-none text-[#F59E0B]">★</div>
                  <div className="mt-1 text-xs font-semibold text-[#16324F]">{rating}</div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-[#7A8DA3]">{copy.feedbackScale}</p>
          </div>
        )}

        {showFeedbackThanks && (
          <div className="mb-5 rounded-2xl border border-[#D1FAE5] bg-[#F0FDF4] px-4 py-3 text-sm text-[#166534]">
            {formatFeedbackThanks(language, feedbackRating)}
          </div>
        )}

        {feedbackError && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {feedbackError}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {canCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={canceling}
              className="w-full rounded-2xl px-4 py-3 text-sm font-bold transition-transform active:scale-[0.98] disabled:opacity-70"
              style={{ background: '#FEE2E2', color: '#B91C1C' }}>
              {canceling ? `${copy.cancelRequest}...` : copy.cancelRequest}
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="w-full rounded-2xl px-4 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98]"
            style={{ background: '#1D6FA8' }}>
            {copy.dismiss}
          </button>
        </div>
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

function LoadingScreen({ copy }: { copy: ReturnType<typeof getPatientCopy> }) {
  return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-[#1D6FA8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#9CA3AF]">{copy.loading}</p>
      </div>
    </div>
  )
}

function ErrorScreen({ copy }: { copy: ReturnType<typeof getPatientCopy> }) {
  return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center px-8">
      <div className="text-center">
        <p className="text-4xl mb-4">🔍</p>
        <p className="font-bold text-[#1A1A2E] mb-1">{copy.roomNotFoundTitle}</p>
        <p className="text-sm text-[#9CA3AF]">{copy.roomNotFoundBody}</p>
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
