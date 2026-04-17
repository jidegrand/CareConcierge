import { useState, useEffect } from 'react'
import NurseShell from '@/components/NurseShell'
import { useTenantContext } from '@/hooks/useTenantContext'
import { useRequests } from '@/hooks/useRequests'

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        aria-label="Close"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}

// ── Screenshot with click-to-expand ──────────────────────────────────────────
function Screenshot({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="relative group cursor-zoom-in" onClick={() => setOpen(true)}>
        <img src={src} alt={alt}
          className="w-full rounded-xl border border-[var(--border)] shadow-sm transition-opacity group-hover:opacity-90" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="flex items-center gap-1.5 bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
            Click to enlarge
          </span>
        </div>
      </div>
      {open && <Lightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  )
}

// ── Placeholder image slot ────────────────────────────────────────────────────
function ScreenshotPlaceholder({ label, aspect = '16/9' }: { label: string; aspect?: string }) {
  return (
    <div
      className="w-full rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--page-bg)] flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] select-none"
      style={{ aspectRatio: aspect }}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
        <circle cx="12" cy="13" r="3"/>
      </svg>
      <p className="text-xs font-medium opacity-60">{label}</p>
      <p className="text-[11px] opacity-40">Screenshot coming soon</p>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function GuideSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4 pb-2 border-b border-[var(--border)]">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--clinical-blue)] text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{title}</p>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{children}</p>
      </div>
    </div>
  )
}

// ── Sections ─────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'dashboard',  label: 'Dashboard' },
  { id: 'feed',       label: 'Patient Feed' },
  { id: 'baymap',     label: 'Bay Map' },
  { id: 'staffing',   label: 'Staffing' },
  { id: 'reports',    label: 'Reports' },
  { id: 'patient-qr', label: 'Patient QR Page' },
  { id: 'settings',   label: 'Settings' },
]

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UserGuidePage() {
  const { tenantId, tenantName, unitId } = useTenantContext()
  const { requests, stats, soundEnabled, setSoundEnabled, connected } = useRequests(unitId, tenantId)
  const unitName = requests[0]?.room?.unit?.name ?? (unitId ? 'Assigned Unit' : `${tenantName ?? 'Tenant'} · All Units`)
  const [active, setActive] = useState('overview')

  function scrollTo(id: string) {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <NurseShell stats={stats} connected={connected}
      soundEnabled={soundEnabled} onSoundToggle={() => setSoundEnabled(!soundEnabled)}
      unitName={unitName}>

      <div className="flex h-full overflow-hidden">

        {/* Sidebar TOC */}
        <aside className="hidden lg:flex w-48 flex-shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] py-5 overflow-y-auto">
          <p className="px-4 mb-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Contents</p>
          <nav className="flex flex-col gap-0.5 px-2">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => scrollTo(s.id)}
                className={`text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  active === s.id
                    ? 'bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)] font-medium'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--page-bg)] hover:text-[var(--text-primary)]'
                }`}>
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-3xl mx-auto space-y-12">

            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">User Guide</h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Everything you need to know to use BayRequest — from responding to patient requests to reading shift reports.
              </p>
            </div>

            {/* Overview */}
            <GuideSection id="overview" title="Overview">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Care Concierge is a real-time patient request management system. Patients scan a QR code at their bedside to submit requests (water, blanket, nurse, etc.). Staff see those requests instantly on the dashboard and can acknowledge, assign, and resolve them without leaving the floor.
              </p>
              <ScreenshotPlaceholder label="App overview — full workflow" aspect="16/7" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: '📱', title: 'Patient scans QR', desc: 'Submits a request from their bed without needing a call button.' },
                  { icon: '🔔', title: 'Staff gets alerted', desc: 'Request appears on the dashboard with a sound alert.' },
                  { icon: '✅', title: 'Request resolved', desc: 'Staff acknowledges and resolves — patient sees live status.' },
                ].map(card => (
                  <div key={card.title} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="text-2xl mb-2">{card.icon}</div>
                    <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{card.title}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{card.desc}</p>
                  </div>
                ))}
              </div>
            </GuideSection>

            {/* Dashboard */}
            <GuideSection id="dashboard" title="Dashboard">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                The dashboard is your main workspace. All active patient requests appear here in real-time, grouped by status: <strong className="text-[var(--text-primary)]">Pending</strong>, <strong className="text-[var(--text-primary)]">In Progress</strong>, and <strong className="text-[var(--text-primary)]">Resolved</strong>.
              </p>
              <Screenshot src="/screenshot/dashboard.png" alt="Dashboard request queue" />
              <div className="space-y-3">
                <Step n={1} title="Acknowledge a request">
                  Click <strong>Acknowledge</strong> on a pending request card to claim it. The request moves to In Progress and the patient is notified that someone is on the way.
                </Step>
                <Step n={2} title="Resolve a request">
                  Once completed, click <strong>Resolve</strong> on the in-progress card. The patient sees a "Completed" status on their screen.
                </Step>
                <Step n={3} title="Reassign to another staff member">
                  On any in-progress card, click <strong>Reassign →</strong> and pick a colleague from the dropdown to hand off the request.
                </Step>
              </div>
              <Screenshot src="/screenshot/acknowledgment.png" alt="Dashboard — acknowledging a request" />
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <strong>Overdue alerts:</strong> Cards with an orange pulsing border have exceeded the configured response target. Prioritise these first.
              </div>
            </GuideSection>

            {/* Patient Feed */}
            <GuideSection id="feed" title="Patient Feed">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                The Patient Feed shows a chronological stream of every request event — new requests, acknowledgements, and resolutions — across all bays in your unit. Use it to get a bird's-eye view of activity without switching bays.
              </p>
              <ScreenshotPlaceholder label="Patient Feed — live event stream" />
              <Step n={1} title="Filter by bay, event type, or request type">
                Use the filter bar at the top to narrow the feed to a specific bay or event kind (new request, acknowledged, resolved).
              </Step>
              <Step n={2} title="Pause the feed">
                Click <strong>Pause</strong> to stop auto-scrolling while you read an entry. The feed resumes when you click <strong>Resume</strong>.
              </Step>
            </GuideSection>

            {/* Bay Map */}
            <GuideSection id="baymap" title="Bay Map">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                The Bay Map gives a visual floor-plan view of your unit. Each bay tile shows its current status at a glance — colour-coded by the most urgent active request.
              </p>
              <ScreenshotPlaceholder label="Bay Map — unit floor plan" />
              <Step n={1} title="Read bay status colours">
                Red = pending request. Blue = in progress. Green = no active requests. Grey = room inactive.
              </Step>
              <Step n={2} title="Click a bay for details">
                Tap any tile to open a details panel showing all active requests for that room and quick-action buttons.
              </Step>
            </GuideSection>

            {/* Staffing */}
            <GuideSection id="staffing" title="Staffing">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                The Staffing page shows every staff member currently active in your scope — their role, how many requests they have acknowledged and resolved today, and their average response time.
              </p>
              <ScreenshotPlaceholder label="Staffing — team roster and workload" />
              <Step n={1} title="Switch between Roster and Workload views">
                The <strong>Roster</strong> tab lists staff with role badges. The <strong>Workload</strong> tab shows a bar chart of resolved-today counts to spot imbalances.
              </Step>
              <Step n={2} title="Manage a staff member (managers only)">
                Click a staff row to view their profile and, if you have the permission, update their unit assignment or role.
              </Step>
            </GuideSection>

            {/* Reports */}
            <GuideSection id="reports" title="Reports">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                The Reports page provides shift and date-range analytics: total requests, average acknowledgement and resolution time, request type breakdown, and staff performance.
              </p>
              <ScreenshotPlaceholder label="Reports — analytics dashboard" />
              <Step n={1} title="Set a date range">
                Use the date pickers at the top to select any range. All metrics and charts update instantly.
              </Step>
              <Step n={2} title="Export data">
                Click <strong>Export CSV</strong> to download request or staff-performance data for the selected range. Useful for handover notes or management reporting.
              </Step>
            </GuideSection>

            {/* Patient QR Page */}
            <GuideSection id="patient-qr" title="Patient QR Page">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Patients access BayRequest by scanning a QR code posted in their bay. The QR page is designed for one-tap use — no login required, no app to install.
              </p>
              <ScreenshotPlaceholder label="Patient QR page — request buttons" aspect="9/16" />
              <Step n={1} title="Print QR codes">
                Go to <strong>Admin → QR Sheet</strong> and print the sheet for your unit. Each bay has its own unique QR code that links directly to that room's page.
              </Step>
              <Step n={2} title="Patient submits a request">
                The patient taps a request type (water, blanket, nurse, etc.). They immediately see a live status indicator that updates as staff respond.
              </Step>
              <Step n={3} title="Patient cancels a request">
                If the patient no longer needs help, they can tap <strong>Cancel request</strong> on the status screen before it is resolved.
              </Step>
              <ScreenshotPlaceholder label="Patient QR page — live status screen" aspect="9/16" />
            </GuideSection>

            {/* Settings */}
            <GuideSection id="settings" title="Settings">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Access <strong>Settings</strong> from the bottom of the left sidebar. Here you can update your profile, manage notification preferences, change your password, and adjust display preferences like dark mode and overdue thresholds.
              </p>
              <ScreenshotPlaceholder label="Settings — profile tab" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  { tab: 'Profile', desc: 'Update your display name and view your role.' },
                  { tab: 'Notifications', desc: 'Toggle sound alerts and browser push notifications.' },
                  { tab: 'Security', desc: 'Change your password or revoke all active sessions.' },
                  { tab: 'Preferences', desc: 'Set dark mode, overdue threshold, and sound-only-for-urgent.' },
                ].map(item => (
                  <div key={item.tab} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                    <p className="font-medium text-[var(--text-primary)] mb-0.5">{item.tab}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </GuideSection>

          </div>
        </main>
      </div>
    </NurseShell>
  )
}
