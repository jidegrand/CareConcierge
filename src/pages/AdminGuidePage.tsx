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
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
            Click to enlarge
          </span>
        </div>
      </div>
      {open && <Lightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  )
}

// ── Guide section ─────────────────────────────────────────────────────────────
function GuideSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4 pb-2 border-b border-[var(--border)]">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

// ── Numbered step ─────────────────────────────────────────────────────────────
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

// ── Callout box ───────────────────────────────────────────────────────────────
function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      <span className="flex-shrink-0 mt-0.5">💡</span>
      <span className="leading-relaxed">{children}</span>
    </div>
  )
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <span className="flex-shrink-0 mt-0.5">⚠️</span>
      <span className="leading-relaxed">{children}</span>
    </div>
  )
}

// ── Table of contents sections ────────────────────────────────────────────────
const SECTIONS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'structure',  label: 'Sites & Rooms' },
  { id: 'users',      label: 'Managing Users' },
  { id: 'requests',   label: 'Request Types' },
  { id: 'qr',         label: 'QR Codes' },
  { id: 'reports',    label: 'Reports & Exports' },
  { id: 'roles',      label: 'Roles Reference' },
]

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminGuidePage() {
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
              <div className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--clinical-blue-lt)] text-[var(--clinical-blue)] mb-3">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Admin Guide
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Admin Portal Guide</h1>
              <p className="text-sm text-[var(--text-secondary)]">
                How to set up and manage your organisation — sites, rooms, staff users, request types, and QR codes.
              </p>
            </div>

            {/* Overview */}
            <GuideSection id="overview" title="Overview">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                The Admin portal is the control centre for your Care Concierge deployment. Tenant Admins use it to set up the physical structure of their organisation, invite staff, configure what request types patients see, and print room QR codes. Access it from the left sidebar under <strong className="text-[var(--text-primary)]">Admin</strong>.
              </p>
              <Screenshot src="/screenshot/Overview.png" alt="Care Concierge overview" />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: '🏥', title: 'Sites & Rooms',   desc: 'Define your hospitals, wings, units, and individual patient rooms.' },
                  { icon: '👥', title: 'Staff Users',     desc: 'Invite nurses by email, assign roles, and set their unit.' },
                  { icon: '📋', title: 'Request Types',   desc: 'Control which request buttons appear on the patient QR page.' },
                ].map(card => (
                  <div key={card.title} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="text-2xl mb-2">{card.icon}</div>
                    <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{card.title}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{card.desc}</p>
                  </div>
                ))}
              </div>

              <Note>
                Only users with the <strong>Tenant Admin</strong> role have full access to the Admin portal. Site Managers can manage rooms within their site. Nurse Managers can manage rooms within their unit.
              </Note>
            </GuideSection>

            {/* Sites & Rooms */}
            <GuideSection id="structure" title="Sites & Rooms">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Care Concierge organises your facility into a three-level hierarchy: <strong className="text-[var(--text-primary)]">Sites</strong> (a hospital or campus) contain <strong className="text-[var(--text-primary)]">Units</strong> (wards or floors), which contain <strong className="text-[var(--text-primary)]">Rooms</strong> (individual patient bays). You must set this up before staff can use the system.
              </p>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center gap-4 text-sm">
                <span className="font-semibold text-[var(--text-primary)]">Organisation</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                <span className="font-semibold text-[var(--clinical-blue)]">Site</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                <span className="font-semibold text-[var(--clinical-blue)]">Unit</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                <span className="font-semibold text-[var(--clinical-blue)]">Room</span>
              </div>

              <Step n={1} title="Create a Site">
                Go to <strong>Admin → Sites & Rooms</strong>. Click <strong>Add site</strong> and enter the site name (e.g. "Main Campus" or "North Wing"). A site represents a physical hospital building or campus.
              </Step>
              <Step n={2} title="Add Units to the site">
                With a site selected, click <strong>Add unit</strong> under the Units column. Enter the unit name (e.g. "ICU", "Ward 3A", "Emergency"). Each unit is a distinct ward or floor.
              </Step>
              <Step n={3} title="Add Rooms to the unit">
                Select a unit, then click <strong>Add room</strong>. Enter the room or bay name (e.g. "Bay 1", "Room 12"). Each room gets a unique QR code that links patients directly to that bay's request page.
              </Step>
              <Step n={4} title="Activate or deactivate rooms">
                Toggle the <strong>Active</strong> switch on any room to control whether its QR code is live. Inactive rooms still appear in the admin panel but patients cannot submit requests from them.
              </Step>

              <Warning>
                Room names are printed on QR codes and shown to patients. Keep them short and recognisable — "Bay 4" is better than "Room 4 — Emergency Ward ICU North".
              </Warning>
            </GuideSection>

            {/* Users */}
            <GuideSection id="users" title="Managing Users">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Invite nurses, charge nurses, and managers by email. They receive a one-time sign-in link and are immediately added to your organisation. No passwords to manage — staff use magic link or password login.
              </p>

              <Step n={1} title="Invite a staff member">
                Go to <strong>Admin → Users</strong> and click <strong>Invite user</strong>. Enter their email address and select their role. They will receive an email with a sign-in link.
              </Step>
              <Step n={2} title="Assign a unit">
                After inviting, or by clicking a user row, set their <strong>Assigned unit</strong> from the dropdown. This scopes what requests and rooms they see on the dashboard.
              </Step>
              <Step n={3} title="Change a user's role">
                Click any user row to open their detail panel. Select a new role from the dropdown and save. Role changes take effect on the user's next page load.
              </Step>
              <Step n={4} title="Deactivate a user">
                Toggle the <strong>Active</strong> switch off to immediately revoke access. The user's history is preserved — they can be reactivated at any time.
              </Step>

              <Note>
                Invites expire after 24 hours. If a nurse missed their invite email, open the Admin portal, find the user, and click <strong>Resend invite</strong>.
              </Note>

              {/* Roles quick-ref inline */}
              <div className="rounded-xl border border-[var(--border)] overflow-hidden text-sm">
                <div className="px-4 py-2.5 bg-[var(--page-bg)] border-b border-[var(--border)]">
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Who can invite users?</p>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {[
                    { role: 'Tenant Admin',  can: 'Invite anyone across any site or unit' },
                    { role: 'Site Manager',  can: 'Invite users within their site' },
                    { role: 'Nurse Manager', can: 'Invite nurses within their unit' },
                  ].map(r => (
                    <div key={r.role} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xs font-semibold text-[var(--text-primary)] w-32 flex-shrink-0">{r.role}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{r.can}</span>
                    </div>
                  ))}
                </div>
              </div>
            </GuideSection>

            {/* Request Types */}
            <GuideSection id="requests" title="Request Types">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Request types are the buttons that appear on the patient QR page. You can add custom types, reorder them, mark some as urgent, and temporarily hide others — all without touching any code.
              </p>

              <Step n={1} title="Open Request Types">
                Go to <strong>Admin → Common Requests</strong>. You'll see all currently configured request types for your organisation.
              </Step>
              <Step n={2} title="Add a new request type">
                Click <strong>Add request type</strong>. Enter a label (e.g. "Medication"), pick an icon or emoji, choose a colour, and decide if it should be marked as urgent. Click <strong>Save</strong>.
              </Step>
              <Step n={3} title="Edit or reorder">
                Drag rows to reorder — the order here is the order patients see on their QR page. Click the pencil icon to edit an existing type's label, icon, or colour.
              </Step>
              <Step n={4} title="Hide a request type">
                Toggle the <strong>Active</strong> switch off to hide a type from patients without deleting it. Useful for types that are only needed seasonally.
              </Step>

              <Warning>
                The <strong>Call Nurse</strong> request type is built-in and always shown at the top of the patient page. It cannot be removed, but you can customise the label.
              </Warning>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { icon: '💧', label: 'Water' },
                  { icon: '🛏️', label: 'Blanket' },
                  { icon: '⚠️', label: 'Pain / Discomfort' },
                  { icon: '💊', label: 'Medication' },
                  { icon: '🚶', label: 'Bathroom Help' },
                  { icon: '🌡️', label: 'Temperature' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2.5 bg-[var(--surface)] rounded-xl border border-[var(--border)] px-3 py-2.5">
                    <span className="text-xl leading-none flex-shrink-0">{item.icon}</span>
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{item.label}</span>
                  </div>
                ))}
              </div>
            </GuideSection>

            {/* QR Codes */}
            <GuideSection id="qr" title="QR Codes">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Every room has a unique QR code. When a patient scans it, they land directly on that room's request page — no app, no login. Print and laminate one QR code per bay.
              </p>
              <Screenshot src="/screenshot/QRcodes.png" alt="QR code print sheet" />

              <Step n={1} title="Open the QR sheet">
                Go to <strong>Admin → QR Codes</strong> and select the unit you want to print for. All active rooms in that unit are shown with their unique QR codes.
              </Step>
              <Step n={2} title="Print the sheet">
                Click <strong>Print QR Sheet</strong>. The page opens a print-ready layout — each QR code includes the room name underneath. Use card stock or laminate for durability.
              </Step>
              <Step n={3} title="Post at the bedside">
                Attach each QR code to the corresponding bay — at eye level from the bed, or on the bedside table card holder. Patients can scan using any smartphone camera without installing an app.
              </Step>
              <Step n={4} title="Replace a QR code">
                If a QR code is damaged or lost, simply reprint it from the same screen. The URL never changes — reprints are always valid.
              </Step>

              <Note>
                Deactivating a room in <strong>Sites & Rooms</strong> makes its QR code show a "This bay is not currently active" message instead of the request screen. The printed code itself doesn't need to be removed.
              </Note>
            </GuideSection>

            {/* Reports */}
            <GuideSection id="reports" title="Reports & Exports">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                The Reports page is available to Nurse Managers and above. It provides daily analytics and CSV/DOCX exports for any date range — useful for shift handovers, compliance reporting, and performance reviews.
              </p>
              <Screenshot src="/screenshot/reports.png" alt="Reports — analytics dashboard" />
              <Screenshot src="/screenshot/newReports.png" alt="Reports — detailed analytics view" />

              <Step n={1} title="View today's analytics">
                Open <strong>Reports</strong> from the sidebar. The Analytics tab shows today's totals: request volume, average response time, resolution rate, and request type breakdown.
              </Step>
              <Step n={2} title="Export data">
                Switch to the <strong>Export</strong> tab and choose a report type: Bay Summary, Open Requests, Staff Performance, Request Log, or a full Shift Report. Select a date range and click the export button to download.
              </Step>
              <Step n={3} title="Generate a handover report">
                From the main Dashboard, click the <strong>Handover Report</strong> button in the right panel. This generates a structured end-of-shift summary including all active requests, staff activity, and key metrics.
              </Step>

              <div className="rounded-xl border border-[var(--border)] overflow-hidden text-sm">
                <div className="px-4 py-2.5 bg-[var(--page-bg)] border-b border-[var(--border)]">
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Available export formats</p>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {[
                    { format: 'Bay Summary CSV',          desc: 'Request count and resolution rate per room' },
                    { format: 'Open Requests CSV',        desc: 'All currently unresolved requests with timestamps' },
                    { format: 'Request Log CSV',          desc: 'Full audit trail — every request and status change' },
                    { format: 'Staff Performance CSV',    desc: 'Per-nurse response times and resolved counts' },
                    { format: 'Urgent Requests CSV',      desc: 'All requests flagged urgent in the selected range' },
                    { format: 'Shift Report DOCX',        desc: 'Formatted Word document for manager sign-off' },
                  ].map(r => (
                    <div key={r.format} className="flex items-start gap-3 px-4 py-3">
                      <span className="text-xs font-semibold text-[var(--text-primary)] w-48 flex-shrink-0">{r.format}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{r.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </GuideSection>

            {/* Roles Reference */}
            <GuideSection id="roles" title="Roles Reference">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Each user has one role that controls what they can see and do. Assign the most specific role that meets the person's needs — avoid giving admin access to front-line nurses.
              </p>

              <div className="space-y-3">
                {[
                  {
                    role: 'Tenant Admin',
                    badge: { bg: '#EDE9FE', text: '#5B21B6' },
                    desc: 'Full access to everything: Admin portal, all sites, all users, all reports. Typically the IT lead or operations manager for the organisation.',
                    can: ['Manage all sites, units, and rooms', 'Invite and manage all staff', 'Configure request types', 'Access all reports and exports', 'Manage patient feedback settings'],
                  },
                  {
                    role: 'Site Manager',
                    badge: { bg: '#DBEAFE', text: '#1D4ED8' },
                    desc: 'Manages one hospital site. Can add units and rooms, invite staff within their site, and view reports for their site.',
                    can: ['Manage units and rooms within their site', 'Invite staff to their site', 'View reports for their site', 'Access staffing and bay map'],
                  },
                  {
                    role: 'Nurse Manager',
                    badge: { bg: '#DBEAFE', text: '#1D4ED8' },
                    desc: 'Manages one unit. Can add rooms, invite nurses to their unit, view staffing, and access reports.',
                    can: ['Manage rooms within their unit', 'Invite nurses to their unit', 'View reports for their unit', 'Access staffing page'],
                  },
                  {
                    role: 'Charge Nurse',
                    badge: { bg: '#DBEAFE', text: '#1D4ED8' },
                    desc: 'Senior nurse with dashboard access. Can acknowledge and resolve requests, reassign, and view staffing. No admin portal access.',
                    can: ['Dashboard, feed, bay map', 'Acknowledge, resolve, and reassign requests', 'View staffing page'],
                  },
                  {
                    role: 'Nurse',
                    badge: { bg: '#ECFDF5', text: '#065F46' },
                    desc: 'Front-line staff. Sees and acts on patient requests. No management features.',
                    can: ['Dashboard, feed, bay map', 'Acknowledge and resolve requests'],
                  },
                  {
                    role: 'Volunteer',
                    badge: { bg: '#FEF3C7', text: '#92400E' },
                    desc: 'Limited access for volunteers. Can see and action non-urgent requests.',
                    can: ['Dashboard and feed (read + acknowledge)', 'No reassign, no reports'],
                  },
                  {
                    role: 'Viewer',
                    badge: { bg: '#F3F4F6', text: '#374151' },
                    desc: 'Read-only. Can see the dashboard and feed but cannot take any action on requests.',
                    can: ['Dashboard and feed (read-only)'],
                  },
                ].map(r => (
                  <div key={r.role} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: r.badge.bg, color: r.badge.text }}>
                        {r.role}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mb-2">{r.desc}</p>
                    <ul className="space-y-1">
                      {r.can.map(c => (
                        <li key={c} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--clinical-blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          {c}
                        </li>
                      ))}
                    </ul>
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
