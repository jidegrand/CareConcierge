import { useState } from 'react'
import { Link } from 'react-router-dom'
import PlatformShell from '@/components/PlatformShell'
import { COMPANY_NAME, PRODUCT_NAME } from '@/lib/brand'

// ── Helper components ─────────────────────────────────────────────────────────

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
        <div className="text-sm text-[var(--text-secondary)] leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

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

function Danger({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <span className="flex-shrink-0 mt-0.5">🚨</span>
      <span className="leading-relaxed">{children}</span>
    </div>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-[#1C2128] text-[#E6EDF3] rounded-xl px-4 py-3.5 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre">
      {children}
    </pre>
  )
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-[0.8em] bg-[var(--page-bg)] border border-[var(--border)] px-1.5 py-0.5 rounded-md text-[var(--clinical-blue)]">
      {children}
    </code>
  )
}

function EnvRow({ name, desc, example }: { name: string; desc: string; example?: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-3 border-b border-[var(--border)] last:border-0">
      <div className="sm:w-64 flex-shrink-0">
        <InlineCode>{name}</InlineCode>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--text-secondary)]">{desc}</p>
        {example && <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">{example}</p>}
      </div>
    </div>
  )
}

// ── TOC sections ──────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'supabase',     label: 'Supabase Setup' },
  { id: 'vercel',       label: 'Vercel Deployment' },
  { id: 'first-admin',  label: 'First Super Admin' },
  { id: 'orgs',         label: 'Organizations' },
  { id: 'licensing',    label: 'Licensing' },
  { id: 'access',       label: 'Access Control' },
  { id: 'reports',      label: 'Global Reports' },
  { id: 'audit',        label: 'Audit Logs' },
  { id: 'checklist',    label: 'Go-Live Checklist' },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SuperAdminGuidePage() {
  const [active, setActive] = useState('overview')

  function scrollTo(id: string) {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <PlatformShell>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

        {/* Sidebar TOC */}
        <aside className="hidden lg:flex w-52 flex-shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] py-5 overflow-y-auto">
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
              <Link
                to="/platform"
                className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Back to Platform Console
              </Link>
              <div className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 mb-3">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l7 4v6c0 5-3 8-7 10-4-2-7-5-7-10V6l7-4z"/>
                  <path d="M9 12h6"/><path d="M12 9v6"/>
                </svg>
                Super Admin Guide
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{COMPANY_NAME} Platform Guide</h1>
              <p className="text-sm text-[var(--text-secondary)]">
                End-to-end reference for deploying and operating {PRODUCT_NAME} — from a blank Supabase project to a live multi-tenant platform.
              </p>
            </div>

            {/* ── Overview ──────────────────────────────────────── */}
            <GuideSection id="overview" title="Overview">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {PRODUCT_NAME} is a multi-tenant SaaS platform. {COMPANY_NAME} (you, the platform operator) manages the infrastructure and onboards healthcare organisations as <strong className="text-[var(--text-primary)]">tenants</strong>. Each tenant has their own sites, staff, and patients — completely isolated from each other at the database level via Row Level Security.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: '🏗️', title: 'Infrastructure',  desc: 'One Supabase project + one Vercel deployment serves all tenants.' },
                  { icon: '🏥', title: 'Tenants',         desc: 'Each hospital organisation is a separate tenant with isolated data.' },
                  { icon: '🛡️', title: 'Super Admin',     desc: 'You control org lifecycle, licensing, and platform-wide users.' },
                ].map(c => (
                  <div key={c.title} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="text-2xl mb-2">{c.icon}</div>
                    <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{c.title}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{c.desc}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-[var(--border)] overflow-hidden text-sm">
                <div className="px-4 py-2.5 bg-[var(--page-bg)] border-b border-[var(--border)]">
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Two admin surfaces</p>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  <div className="grid grid-cols-[180px,1fr] gap-3 px-4 py-3">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Platform Console <InlineCode>/platform</InlineCode></p>
                    <p className="text-xs text-[var(--text-secondary)]">Global control plane — create orgs, manage licenses, access control, cross-tenant reports, audit logs. Super admin only.</p>
                  </div>
                  <div className="grid grid-cols-[180px,1fr] gap-3 px-4 py-3">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Operational Admin <InlineCode>/admin</InlineCode></p>
                    <p className="text-xs text-[var(--text-secondary)]">Tenant-scoped workspace — sites, rooms, staff users, QR codes. Accessible to Tenant Admins and managers within one org.</p>
                  </div>
                </div>
              </div>
            </GuideSection>

            {/* ── Supabase Setup ─────────────────────────────────── */}
            <GuideSection id="supabase" title="Supabase Setup">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                The entire backend — authentication, database, and real-time subscriptions — runs on a single Supabase project. All data is isolated between tenants via Row Level Security policies built into the schema.
              </p>

              <Step n={1} title="Create a new Supabase project">
                <p>Go to <strong>supabase.com → New project</strong>. Choose a region close to your users. Set a strong database password and save it somewhere safe — you will need it if you ever connect a direct Postgres client.</p>
              </Step>

              <Step n={2} title="Run the database schema">
                <p className="mb-2">In the Supabase dashboard, open <strong>SQL Editor → New query</strong>. Paste the entire contents of <InlineCode>supabase/schema.sql</InlineCode> from the repo and click <strong>Run</strong>. This creates all tables, functions, triggers, and RLS policies in one shot.</p>
                <Note>The schema is idempotent — it uses <InlineCode>CREATE TABLE IF NOT EXISTS</InlineCode> and <InlineCode>CREATE OR REPLACE FUNCTION</InlineCode> so it is safe to re-run if needed.</Note>
              </Step>

              <Step n={3} title="Run migrations in order">
                <p className="mb-2">After the base schema, run the numbered migration files in <InlineCode>supabase/migrations/</InlineCode> in ascending order until you reach the latest one in the repo. Each migration file is self-contained — open it in SQL Editor, paste, and run.</p>
                <Warning>Do not skip migrations or run them out of order. Each one may depend on objects created by a previous one.</Warning>
              </Step>

              <Step n={4} title="Configure Authentication">
                <p className="mb-2">In the Supabase dashboard go to <strong>Authentication → URL Configuration</strong>:</p>
                <div className="space-y-2 text-xs">
                  <div className="rounded-lg bg-[var(--page-bg)] border border-[var(--border)] px-3 py-2.5">
                    <p className="font-semibold text-[var(--text-primary)] mb-1">Site URL</p>
                    <p className="text-[var(--text-secondary)]">Set to your production URL: <InlineCode>https://care.extendihealth.com</InlineCode></p>
                  </div>
                  <div className="rounded-lg bg-[var(--page-bg)] border border-[var(--border)] px-3 py-2.5">
                    <p className="font-semibold text-[var(--text-primary)] mb-1">Redirect URLs</p>
                    <p className="text-[var(--text-secondary)]">Add <InlineCode>https://care.extendihealth.com/**</InlineCode>, <InlineCode>https://*.care.extendihealth.com/**</InlineCode> (for tenant subdomains), and <InlineCode>http://localhost:5173/**</InlineCode> for local development</p>
                  </div>
                  <div className="rounded-lg bg-[var(--page-bg)] border border-[var(--border)] px-3 py-2.5">
                    <p className="font-semibold text-[var(--text-primary)] mb-1">Email provider</p>
                    <p className="text-[var(--text-secondary)]">The built-in Supabase email provider works for low-volume. For production, configure a custom SMTP provider under <strong>Authentication → SMTP Settings</strong> (SendGrid, Resend, Postmark, etc.)</p>
                  </div>
                </div>
              </Step>

              <Step n={5} title="Copy your API keys">
                <p className="mb-2">Go to <strong>Project Settings → API</strong>. You need two values for the environment configuration:</p>
                <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                  <EnvRow name="Project URL" desc="The HTTPS URL for your project" example="https://abcdefgh.supabase.co" />
                  <EnvRow name="anon / public key" desc="Safe to expose in the browser — RLS protects data access" example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." />
                </div>
                <Danger>Never expose the <strong>service_role</strong> key to the browser or commit it to git. It bypasses all Row Level Security.</Danger>
              </Step>

              <Step n={6} title="Enable Realtime for the requests table">
                <p>Go to <strong>Database → Replication</strong>. Find the <InlineCode>requests</InlineCode> table and enable replication for it. This powers the live dashboard updates without page refreshes.</p>
              </Step>
            </GuideSection>

            {/* ── Vercel Deployment ──────────────────────────────── */}
            <GuideSection id="vercel" title="Vercel Deployment">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                The front end is a Vite + React SPA. Vercel hosts it with a single rewrite rule that sends all routes to <InlineCode>index.html</InlineCode>, enabling client-side routing. No server-side functions are used — everything goes through Supabase directly from the browser.
              </p>

              <Note>
                The project does <strong>not</strong> auto-deploy on git push. You must run <InlineCode>vercel --prod</InlineCode> manually each time you want to publish a new version. This is intentional — it prevents accidental deploys from feature branches.
              </Note>

              <Step n={1} title="Install the Vercel CLI">
                <Code>{`npm install -g vercel`}</Code>
              </Step>

              <Step n={2} title="Link the project">
                <p className="mb-2">From the repo root, run <InlineCode>vercel link</InlineCode> and follow the prompts to connect to your Vercel account and project. This creates a <InlineCode>.vercel/project.json</InlineCode> file locally.</p>
                <Code>{`cd path/to/bayrequest
vercel link`}</Code>
              </Step>

              <Step n={3} title="Add environment variables on Vercel">
                <p className="mb-2">In the Vercel dashboard go to <strong>Project → Settings → Environment Variables</strong> and add the variables from <InlineCode>.env.example</InlineCode> for <strong>Production</strong>, <strong>Preview</strong>, and <strong>Development</strong>:</p>
                <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                  <EnvRow
                    name="VITE_SUPABASE_URL"
                    desc="Your Supabase project URL"
                    example="https://abcdefgh.supabase.co"
                  />
                  <EnvRow
                    name="VITE_SUPABASE_ANON_KEY"
                    desc="Supabase anon/public key (safe for browser)"
                    example="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  />
                  <EnvRow
                    name="VITE_APP_URL"
                    desc="The canonical URL of your deployment"
                    example="https://care.extendihealth.com"
                  />
                  <EnvRow
                    name="VITE_ROOT_DOMAIN"
                    desc="Domain used to build patient-facing QR code URLs"
                    example="care.extendihealth.com"
                  />
                </div>
              </Step>

              <Step n={4} title="Pull env vars for local development">
                <p className="mb-2">To run the app locally with the correct variables, pull them from Vercel into a local <InlineCode>.env.local</InlineCode> file:</p>
                <Code>{`vercel env pull .env.local`}</Code>
                <p className="mt-2">Then start the dev server:</p>
                <Code>{`npm run dev`}</Code>
              </Step>

              <Step n={5} title="Deploy to production">
                <p className="mb-2">Build and deploy manually when you are ready to publish:</p>
                <Code>{`vercel --prod`}</Code>
                <p className="mt-2">Vercel runs <InlineCode>npm run build</InlineCode> (which runs <InlineCode>tsc && vite build</InlineCode>), then deploys the <InlineCode>dist/</InlineCode> folder. The <InlineCode>vercel.json</InlineCode> rewrite rule handles client-side routing:</p>
                <Code>{`{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}`}</Code>
              </Step>

              <Step n={6} title="Verify the deployment">
                <p className="mb-2">After the deploy command completes, run <InlineCode>vercel inspect</InlineCode> on the returned URL to confirm the deployment is READY:</p>
                <Code>{`vercel inspect https://care.extendihealth.com`}</Code>
                <p className="mt-2">Then open the URL in a browser and confirm the login page loads. Navigate to <InlineCode>/platform</InlineCode> to access the super admin console.</p>
              </Step>
            </GuideSection>

            {/* ── First Super Admin ───────────────────────────────── */}
            <GuideSection id="first-admin" title="Creating the First Super Admin">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Super admin accounts cannot be created from within the app itself — they must be seeded directly in the database. Do this once per deployment after the schema is loaded.
              </p>

              <Warning>
                Super admins bypass all tenant-scoping. Only create super admin accounts for trusted {COMPANY_NAME} operators. Never give this role to a client's staff.
              </Warning>

              <Step n={1} title="Sign up via the app">
                Open your deployed app and sign up with the email you want to use as the super admin. This creates an entry in <InlineCode>auth.users</InlineCode> and a corresponding row in <InlineCode>user_profiles</InlineCode>.
              </Step>

              <Step n={2} title="Promote the user to super_admin in Supabase">
                <p className="mb-2">In the Supabase SQL Editor, run:</p>
                <Code>{`UPDATE user_profiles
SET role = 'super_admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your@email.com'
);`}</Code>
              </Step>

              <Step n={3} title="Verify access">
                Sign in to the app. You should be redirected automatically to <InlineCode>/platform</InlineCode> instead of <InlineCode>/dashboard</InlineCode>. The Platform Console header confirms the super admin role.
              </Step>

              <Note>
                To add more super admins later, use <strong>Platform Console → Access Control → Add super admin</strong>. They receive an invite email and set their password on first login.
              </Note>
            </GuideSection>

            {/* ── Organizations ───────────────────────────────────── */}
            <GuideSection id="orgs" title="Organizations">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Each healthcare client is an <strong className="text-[var(--text-primary)]">Organization</strong> (internally called a tenant). Creating an organization provisions a new <InlineCode>tenant_id</InlineCode> that scopes all data for that client. From the platform console, go to <strong>Organizations</strong>.
              </p>

              <Step n={1} title="Create a new organization">
                Click <strong>New organization</strong>. Enter the organisation name (e.g. "St. Mary's Hospital"). The system generates a UUID tenant ID and creates the tenant row in the database.
              </Step>

              <Step n={2} title="Create a license for the organization">
                After creating the organisation, navigate to <strong>Licensing</strong> and click <strong>New license</strong>. Select the organisation, set the plan (trial / standard / enterprise), set capacity limits, and configure the expiry date. Without an active or trial license the tenant admin cannot meaningfully use the system — RLS reads license status in some policies.
              </Step>

              <Step n={3} title="Invite the Tenant Admin">
                Go to <strong>Access Control</strong> and click <strong>Invite user</strong>. Enter the client's admin email, select their organisation, and assign the <strong>Tenant Admin</strong> role. They receive a magic-link email and land directly on <InlineCode>/admin</InlineCode> after signing in.
              </Step>

              <Step n={4} title="Open the operational workspace for the new org">
                From the organization selector at the top of the Platform Console, select the new org and click <strong>Open operational admin workspace</strong>. This takes you to <InlineCode>/admin?tenantId=…</InlineCode> where you can verify the org's sites, rooms, and request types are in order before handing over to the client.
              </Step>
            </GuideSection>

            {/* ── Licensing ───────────────────────────────────────── */}
            <GuideSection id="licensing" title="Licensing">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Every organization has exactly one license record. The license controls the plan tier, user and room capacity limits, and the activation status. Go to <strong>Platform Console → Licensing</strong>.
              </p>

              <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="px-4 py-2.5 bg-[var(--page-bg)] border-b border-[var(--border)]">
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">License statuses</p>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {[
                    { status: 'trial',     color: '#DBEAFE', text: '#1D4ED8', desc: 'Time-limited evaluation. Set an expiry date. No capacity restrictions.' },
                    { status: 'active',    color: '#DCFCE7', text: '#166534', desc: 'Fully operational. Capacity limits apply if configured.' },
                    { status: 'suspended', color: '#FEE2E2', text: '#B91C1C', desc: 'Access is blocked. Staff cannot log in. Patient QR pages still load but requests are blocked.' },
                    { status: 'archived',  color: '#E5E7EB', text: '#374151', desc: 'Soft-deleted. Organisation is hidden from the active list but data is preserved.' },
                  ].map(r => (
                    <div key={r.status} className="flex items-start gap-3 px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 capitalize"
                        style={{ background: r.color, color: r.text }}>{r.status}</span>
                      <p className="text-xs text-[var(--text-secondary)]">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Step n={1} title="Set capacity limits">
                On a license record, you can configure <strong>Max users</strong> and <strong>Max rooms</strong>. Leave these blank for unlimited. The platform overview shows current usage vs. capacity for each org.
              </Step>

              <Step n={2} title="Renewing expiring licenses">
                The Platform Overview highlights organizations with licenses expiring within 30 days. Open Licensing, select the org, and update the <strong>Expires at</strong> date. Set it to <InlineCode>null</InlineCode> / blank for open-ended licenses.
              </Step>

              <Step n={3} title="Suspending an organization">
                Change the license status to <strong>Suspended</strong>. Staff sign-ins will fail immediately. Use this for non-payment or decommissioning. The patient QR page shows a "service unavailable" message.
              </Step>
            </GuideSection>

            {/* ── Access Control ──────────────────────────────────── */}
            <GuideSection id="access" title="Access Control">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                The Access Control panel is the master user directory across all organizations. Use it to invite platform-level admins, view every user in the system, and make role corrections that can't be done from within a tenant workspace.
              </p>

              <Step n={1} title="Add a Super Admin">
                Click <strong>Add super admin</strong>. Enter the email — the user receives an invite and lands on <InlineCode>/platform</InlineCode> on first login. Use this for additional {COMPANY_NAME} engineers or operations staff.
              </Step>

              <Step n={2} title="Change a user's role or organization">
                Find the user using the search bar or role filter. Click their row to open the edit modal. You can change their role and — for non-super-admin users — move them to a different organisation or unit.
              </Step>

              <Step n={3} title="Filter by organization">
                Use the global organization selector at the top of the platform console to scope the Access Control view to a single tenant. Useful when a client reports a user can't log in or has the wrong permissions.
              </Step>

              <Danger>
                Changing a user's role to <strong>super_admin</strong> gives them full, unrestricted access to every tenant's data. Reserve this for {COMPANY_NAME} staff only.
              </Danger>
            </GuideSection>

            {/* ── Global Reports ──────────────────────────────────── */}
            <GuideSection id="reports" title="Global Reports">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Global Reports aggregate operational metrics across all organizations (or a selected one). Go to <strong>Platform Console → Global Reports</strong>.
              </p>

              <Step n={1} title="Set the date range">
                Use the date pickers at the top. Presets are 7 days, 30 days, and 90 days. All charts and counts update for the selected window.
              </Step>

              <Step n={2} title="Scope to a single organization">
                Toggle <strong>All organizations</strong> → <strong>Selected organization</strong> to focus on one tenant. Useful for client-facing operational reviews.
              </Step>

              <Step n={3} title="Export platform data">
                Four CSV exports are available:
                <ul className="mt-2 space-y-1.5">
                  {[
                    ['Platform Summary CSV',          'Total requests, response times, and resolution rates per org'],
                    ['Daily Trend CSV',               'Day-by-day request volume across the selected date range'],
                    ['Organization Activity CSV',     'Per-org breakdown of all activity metrics'],
                    ['Request Mix CSV',               'Request type distribution across the platform'],
                  ].map(([name, desc]) => (
                    <li key={name as string} className="flex gap-2 text-xs">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--clinical-blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                      <span><strong>{name as string}</strong> — {desc as string}</span>
                    </li>
                  ))}
                </ul>
              </Step>
            </GuideSection>

            {/* ── Audit Logs ──────────────────────────────────────── */}
            <GuideSection id="audit" title="Audit Logs">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                The Audit Logs panel records every significant platform-level change — organization creation, license updates, role changes, and access control modifications. Up to 250 recent entries are shown. Go to <strong>Platform Console → Audit Logs</strong>.
              </p>

              <Step n={1} title="Filter by scope">
                Toggle between <strong>All organizations</strong> and the currently selected organization to narrow the log view.
              </Step>

              <Step n={2} title="Filter by event type">
                Use the type filter dropdown to show only a specific category of events (e.g. <InlineCode>license</InlineCode>, <InlineCode>organization</InlineCode>, <InlineCode>access</InlineCode>).
              </Step>

              <Note>
                Audit logs are append-only and cannot be deleted from the UI. Every entry includes the actor's ID, the target entity, the action, and a timestamp.
              </Note>
            </GuideSection>

            {/* ── Go-Live Checklist ────────────────────────────────── */}
            <GuideSection id="checklist" title="Go-Live Checklist">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Run through this list before handing a new deployment to a client.
              </p>

              <div className="space-y-2">
                {[
                  { category: 'Infrastructure', items: [
                    'Supabase project created in a GDPR/HIPAA-compliant region',
                    'Full schema + all migrations applied (no errors in SQL Editor)',
                    'Realtime replication enabled on the requests table',
                    'Auth Site URL and redirect URLs configured correctly',
                    'Production SMTP provider configured (not Supabase built-in)',
                  ]},
                  { category: 'Vercel', items: [
                    'All 4 env vars set in Vercel dashboard for Production environment',
                    'VITE_APP_URL=https://care.extendihealth.com and VITE_ROOT_DOMAIN=care.extendihealth.com set on Vercel',
                    'vercel --prod run and deployment status is READY',
                    'Login page loads at care.extendihealth.com',
                    'vercel.json rewrite rule present (SPA routing works)',
                  ]},
                  { category: 'Platform', items: [
                    'Super admin account created and can access /platform',
                    'Client organization created with a license record',
                    'License status is active or trial with a valid expiry',
                    'Tenant Admin invited and invite email confirmed delivered',
                  ]},
                  { category: 'Client Setup', items: [
                    'Tenant Admin signed in and reached /admin',
                    'At least one site, unit, and room created',
                    'Request types configured and active',
                    'QR sheet printed and verified — scanning opens the patient page',
                    'At least one nurse user invited and confirmed',
                    'Test request submitted from patient QR page and acknowledged on dashboard',
                  ]},
                ].map(group => (
                  <div key={group.category} className="rounded-xl border border-[var(--border)] overflow-hidden">
                    <div className="px-4 py-2.5 bg-[var(--page-bg)] border-b border-[var(--border)]">
                      <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{group.category}</p>
                    </div>
                    <ul className="px-4 py-3 space-y-2">
                      {group.items.map(item => (
                        <li key={item} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                          <span className="w-4 h-4 rounded border border-[var(--border)] flex-shrink-0 mt-0.5 bg-white" />
                          {item}
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
    </PlatformShell>
  )
}
