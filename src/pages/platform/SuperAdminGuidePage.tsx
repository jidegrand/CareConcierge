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
  { id: 'subdomains',   label: 'Subdomain Setup' },
  { id: 'first-admin',  label: 'First Super Admin' },
  { id: 'orgs',         label: 'Organizations' },
  { id: 'tenant-admin', label: 'Tenant Admin Portal' },
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
                <Warning>Do not skip migrations or run them out of order. Each one may depend on objects created by a previous one. In particular, <InlineCode>pending_invites</InlineCode> needs a <InlineCode>UNIQUE (email)</InlineCode> constraint — the <InlineCode>invite-user</InlineCode> Edge Function upserts on <InlineCode>onConflict: 'email'</InlineCode>, and Postgres rejects that upsert with "no unique or exclusion constraint matching the ON CONFLICT specification" if the constraint is missing, silently breaking every invite.</Warning>
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
                    <p className="text-[var(--text-secondary)]">Add <InlineCode>https://care.extendihealth.com/set-password</InlineCode>, <InlineCode>https://care.extendihealth.com/reset-password</InlineCode>, <InlineCode>https://*.extendihealth.com/set-password</InlineCode>, <InlineCode>https://*.extendihealth.com/reset-password</InlineCode>, and the matching localhost URLs for development. If tenant apps live under <InlineCode>care.extendihealth.com</InlineCode>, use <InlineCode>https://*.care.extendihealth.com/...</InlineCode> instead.</p>
                  </div>
                  <div className="rounded-lg bg-[var(--page-bg)] border border-[var(--border)] px-3 py-2.5">
                    <p className="font-semibold text-[var(--text-primary)] mb-1">Email provider</p>
                    <p className="text-[var(--text-secondary)]">The built-in Supabase email provider is only for early testing. For production, use Resend SMTP under <strong>Authentication → Email → SMTP Settings</strong>.</p>
                  </div>
                  <div className="rounded-lg bg-[var(--page-bg)] border border-[var(--border)] px-3 py-2.5">
                    <p className="font-semibold text-[var(--text-primary)] mb-1">Resend SMTP settings</p>
                    <p className="text-[var(--text-secondary)]">
                      Verify the sending domain in Resend, then use <InlineCode>smtp.resend.com</InlineCode>, port <InlineCode>587</InlineCode>, username <InlineCode>resend</InlineCode>, and a Resend API key as the password. Use <InlineCode>no-reply@care.extendihealth.com</InlineCode> as the sender when the domain is verified.
                    </p>
                  </div>
                  <div className="rounded-lg bg-[var(--page-bg)] border border-[var(--border)] px-3 py-2.5">
                    <p className="font-semibold text-[var(--text-primary)] mb-1">Auth email templates</p>
                    <p className="text-[var(--text-secondary)]">
                      Copy <InlineCode>supabase/email-templates/invite.html</InlineCode> into the Supabase <strong>Invite user</strong> template with subject <InlineCode>You&apos;re invited to Care Concierge</InlineCode>. Copy <InlineCode>supabase/email-templates/recovery.html</InlineCode> into <strong>Reset Password</strong>, and copy <InlineCode>supabase/email-templates/magic-link.html</InlineCode> into <strong>Magic Link</strong> as the disabled safety template.
                    </p>
                  </div>
                </div>
                <Warning>Magic-link sign-in is disabled. Staff invites and global admin invites must use the <InlineCode>invite-user</InlineCode> Edge Function. Password resets must use the <InlineCode>request-password-reset</InlineCode> Edge Function. Disable provider link tracking so Supabase verification URLs are not rewritten.</Warning>
                <Note>Set Supabase Edge Function secrets <InlineCode>APP_URL=https://care.extendihealth.com</InlineCode> and <InlineCode>TENANT_ROOT_DOMAIN=extendihealth.com</InlineCode>. These let invite and password reset emails return staff to <InlineCode>{'{{tenant-slug}}.extendihealth.com'}</InlineCode>.</Note>
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

            {/* ── Subdomain Setup ────────────────────────────────── */}
            <GuideSection id="subdomains" title="Subdomain Setup">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Each organization gets its own subdomain (e.g., <InlineCode>conrad.extendihealth.com</InlineCode>). This provides a branded, memorable URL while maintaining strict data isolation via Row Level Security. The platform uses a wildcard DNS record and certificate to serve all tenant subdomains from the same Vercel deployment.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {[
                  { icon: '🌐', title: 'Admin Domain', desc: 'care.extendihealth.com (super-admin only)' },
                  { icon: '🏥', title: 'Tenant Domains', desc: 'yourname.extendihealth.com (org-scoped)' },
                  { icon: '🔐', title: 'SSL Certificate', desc: 'Wildcard *.extendihealth.com (auto-provisioned)' },
                  { icon: '📡', title: 'DNS Record', desc: '*.extendihealth.com → CNAME to Vercel' },
                ].map(c => (
                  <div key={c.title} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                    <div className="text-xl mb-1">{c.icon}</div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{c.title}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{c.desc}</p>
                  </div>
                ))}
              </div>

              <Step n={1} title="Configure wildcard DNS">
                <p className="mb-2">Add a wildcard CNAME record to your DNS provider (Route53, Cloudflare, GoDaddy, etc.):</p>
                <div className="rounded-lg bg-[var(--page-bg)] border border-[var(--border)] px-3 py-2.5">
                  <p className="font-mono text-[10px] text-[var(--text-secondary)]">*.extendihealth.com  CNAME  care.extendihealth.com</p>
                </div>
                <Note>
                  This single record routes <strong>all</strong> subdomains (conrad.extendihealth.com, st-marys.extendihealth.com, etc.) to the Vercel deployment. Propagation typically takes 5-30 minutes.
                </Note>
              </Step>

              <Step n={2} title="Verify wildcard certificate on Vercel">
                <p className="mb-2">In Vercel dashboard, go to <strong>Project Settings → Domains</strong>:</p>
                <div className="space-y-2 text-xs">
                  <div className="rounded-lg bg-[var(--page-bg)] border border-[var(--border)] px-3 py-2.5">
                    <p className="font-semibold text-[var(--text-primary)] mb-1">Step 1: Add root domain</p>
                    <p className="text-[var(--text-secondary)]">Add <InlineCode>extendihealth.com</InlineCode> (Vercel will auto-verify DNS)</p>
                  </div>
                  <div className="rounded-lg bg-[var(--page-bg)] border border-[var(--border)] px-3 py-2.5">
                    <p className="font-semibold text-[var(--text-primary)] mb-1">Step 2: Add wildcard domain</p>
                    <p className="text-[var(--text-secondary)]">Add <InlineCode>*.extendihealth.com</InlineCode> — Vercel auto-provisions a wildcard SSL certificate</p>
                  </div>
                  <div className="rounded-lg bg-[var(--page-bg)] border border-[var(--border)] px-3 py-2.5">
                    <p className="font-semibold text-[var(--text-primary)] mb-1">Step 3: Test resolution</p>
                    <p className="text-[var(--text-secondary)]">Open <InlineCode>https://test.extendihealth.com</InlineCode> in a browser. Should show your app (404 org not found is OK). Check SSL cert details — should be valid for <strong>*.extendihealth.com</strong>.</p>
                  </div>
                </div>
              </Step>

              <Step n={3} title="Create organization slug">
                <p className="mb-2">When creating an organization, assign a <strong>URL slug</strong> — the subdomain name:</p>
                <div className="rounded-lg bg-[var(--page-bg)] border border-[var(--border)] px-3 py-2.5 text-xs space-y-2">
                  <p><strong className="text-[var(--text-primary)]">Slug rules:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-[var(--text-secondary)]">
                    <li>Lowercase, alphanumeric + hyphens only (e.g., <InlineCode>st-marys-medical</InlineCode>)</li>
                    <li>3-63 characters</li>
                    <li>Must be unique across all organizations</li>
                    <li>No spaces or special characters</li>
                  </ul>
                </div>
                <p className="mt-3 text-sm text-[var(--text-secondary)]"><strong>Examples:</strong></p>
                <div className="mt-2 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between items-center px-3 py-2 bg-[var(--page-bg)] rounded border border-[var(--border)]">
                    <span>Conrad Hospital</span>
                    <span className="text-[var(--clinical-blue)]">→ conrad.extendihealth.com</span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 bg-[var(--page-bg)] rounded border border-[var(--border)]">
                    <span>St. Mary's Medical Center</span>
                    <span className="text-[var(--clinical-blue)]">→ st-marys.extendihealth.com</span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 bg-[var(--page-bg)] rounded border border-[var(--border)]">
                    <span>General Hospital Group</span>
                    <span className="text-[var(--clinical-blue)]">→ general-hospital.extendihealth.com</span>
                  </div>
                </div>
              </Step>

              <Step n={4} title="Test the subdomain">
                <p className="mb-2">After creating an organization with a slug:</p>
                <ol className="space-y-2 text-xs text-[var(--text-secondary)] list-decimal list-inside">
                  <li>Wait 1-2 minutes for DNS propagation</li>
                  <li>Open <InlineCode>https://yourslug.extendihealth.com</InlineCode> in a browser</li>
                  <li>Verify the app loads (you'll see login if not authenticated)</li>
                  <li>Check SSL certificate — should be valid, issued to <InlineCode>*.extendihealth.com</InlineCode></li>
                  <li>Sign in as the Tenant Admin for that org</li>
                  <li>Verify you land on <InlineCode>/tenant-admin</InlineCode> (org-scoped portal)</li>
                </ol>
              </Step>

              <Warning>
                <strong>Slug collision prevention:</strong> If two organizations have similar names (e.g., both "General Hospital"), the system prevents slug collisions by appending a number: <InlineCode>general-hospital</InlineCode> and <InlineCode>general-hospital-2</InlineCode>. Always verify the slug is unique before creating the org.
              </Warning>

              <Note>
                <strong>Backward compatibility:</strong> During the transition period, the old single-domain approach (<InlineCode>care.extendihealth.com/admin?tenantId=UUID</InlineCode>) still works. Slugs are optional at first. Gradually migrate organizations to their branded subdomains.
              </Note>
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
                To add more global admins later, use <strong>Platform Console → Access Control → Add Global Admin</strong>. They receive an invite email and set their password on first login.
              </Note>
            </GuideSection>

            {/* ── Tenant Admin Portal ─────────────────────────────── */}
            <GuideSection id="tenant-admin" title="Tenant Admin Portal">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Each tenant organization has access to a dedicated <strong className="text-[var(--text-primary)]">Tenant Admin Portal</strong> at <InlineCode>/tenant-admin</InlineCode>. This is a self-service workspace where tenant admins manage their own organization without needing to contact {COMPANY_NAME} support. The portal enforces row-level security — tenant admins can only see and modify their own organization's data.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {[
                  { icon: '⚙️', title: 'Settings', desc: 'Update branding, logo, and preferences' },
                  { icon: '👥', title: 'Users & Roles', desc: 'Invite staff, assign roles, manage access' },
                  { icon: '🏥', title: 'Sites & Units', desc: 'Create locations and departments' },
                  { icon: '📋', title: 'Licensing', desc: 'View plan, usage limits, and expiry' },
                  { icon: '📝', title: 'Audit Logs', desc: 'Track all organization activity' },
                  { icon: '📊', title: 'Dashboard', desc: 'Overview of setup status and usage' },
                ].map(c => (
                  <div key={c.title} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                    <div className="text-xl mb-1">{c.icon}</div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{c.title}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{c.desc}</p>
                  </div>
                ))}
              </div>

              <Step n={1} title="Tenant Admin access">
                <p className="mb-2">When you invite a user as <strong>Tenant Admin</strong>, they are redirected to <InlineCode>/tenant-admin/dashboard</InlineCode> on first login. They cannot access the Platform Console (<InlineCode>/platform</InlineCode>) — that is super admin only.</p>
              </Step>

              <Step n={2} title="Organization isolation via RLS">
                <p className="mb-2">The Tenant Admin Portal enforces strict data isolation using PostgreSQL Row Level Security. Every page query is automatically filtered by the tenant's <InlineCode>tenant_id</InlineCode>. Tenant admins cannot:</p>
                <ul className="mt-2 space-y-1.5">
                  {[
                    'View another organization\'s settings, users, or sites',
                    'Access audit logs from other tenants',
                    'See licensing data for other organizations',
                    'Modify RLS policies (read-only to them)',
                  ].map(item => (
                    <li key={item} className="flex gap-2 text-xs">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--clinical-blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Step>

              <Step n={3} title="Portal pages">
                <div className="mt-3 space-y-3">
                  {[
                    { path: '/tenant-admin/dashboard', name: 'Dashboard', desc: 'Organization overview, onboarding status, quick stats' },
                    { path: '/tenant-admin/settings', name: 'Settings', desc: 'Organization name, branding, logo upload, preferences' },
                    { path: '/tenant-admin/users', name: 'Users & Roles', desc: 'Invite staff, view active users, manage roles' },
                    { path: '/tenant-admin/sites', name: 'Sites & Units', desc: 'Create and manage sites (hospitals) and units (departments)' },
                    { path: '/tenant-admin/licensing', name: 'Licensing', desc: 'View plan type, current usage vs. limits, expiry date' },
                    { path: '/tenant-admin/audit-logs', name: 'Audit Logs', desc: 'Immutable log of all organization activity with filtering and CSV export' },
                  ].map(item => (
                    <div key={item.path} className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded bg-[var(--page-bg)] border border-[var(--border)] flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--clinical-blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{item.name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{item.desc}</p>
                        <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1">{item.path}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Step>

              <Step n={4} title="Testing the Tenant Admin Portal">
                <p className="mb-2">After inviting a Tenant Admin, verify their experience:</p>
                <ol className="space-y-2 text-xs text-[var(--text-secondary)] list-decimal list-inside">
                  <li>Confirm they receive an invite email and can sign in</li>
                  <li>Verify they land on <InlineCode>/tenant-admin/dashboard</InlineCode></li>
                  <li>Check that they can view their organization's settings (not other orgs)</li>
                  <li>Test creating a site and unit</li>
                  <li>Confirm they cannot navigate to <InlineCode>/platform</InlineCode> (403 Forbidden)</li>
                  <li>Verify audit logs record their activity</li>
                </ol>
              </Step>

              <Note>
                The Tenant Admin Portal is built with React, TypeScript, and Supabase. All data queries respect tenant isolation through RLS policies on the database. No data for other organizations will ever be visible, even in network requests or browser dev tools.
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
                Go to <strong>Access Control</strong> and click <strong>Invite user</strong>. Enter the client's admin email, select their organisation, and assign the <strong>Tenant Admin</strong> role. They receive an invite email, set their password, and then land in the admin workspace after signing in.
              </Step>

              <Step n={4} title="Open the operational workspace for the new org">
                From the organization selector at the top of the Platform Console, select the new org and click <strong>Open operational admin workspace</strong>. This takes you to <InlineCode>/admin?tenantId=…</InlineCode> where you can verify the org's sites, rooms, and request types are in order before handing over to the client.
              </Step>

              <Note>
                <strong>Tenant Admin Portal:</strong> After creating an organization and inviting the Tenant Admin, they can manage most of their organization settings directly via the Tenant Admin Portal at <InlineCode>/tenant-admin</InlineCode>. You only need to intervene from the Platform Console for licensing updates, capacity increases, or role corrections. See the <strong>Tenant Admin Portal</strong> section for details.
              </Note>
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

              <Step n={1} title="Add a Global Admin">
                Click <strong>Add Global Admin</strong>. Enter the email — the user receives an invite and lands on <InlineCode>/platform</InlineCode> on first login. Use this for additional {COMPANY_NAME} engineers or operations staff.
              </Step>

              <Step n={2} title="Change a user's role or organization">
                Find the user using the search bar or role filter. Click their row to open the edit modal. You can change their role and — for non-super-admin users — move them to a different organisation or unit.
              </Step>

              <Step n={3} title="Filter by organization">
                Use the global organization selector at the top of the platform console to scope the Access Control view to a single tenant. Useful when a client reports a user can't log in or has the wrong permissions.
              </Step>

              <Step n={4} title="View account emails">
                The user table includes an <strong>Email</strong> column. Emails are fetched best-effort via the <InlineCode>platform-user-admin</InlineCode> Edge Function (super-admin only) and shown alongside each row — useful for confirming you're editing the right account before changing its role or organisation.
              </Step>

              <Step n={5} title="Delete an account">
                Click <strong>Delete account</strong> on a user's row to permanently remove them. You must type the account's exact email address to confirm — this guards against accidental deletions. Deleting a user removes their <InlineCode>auth.users</InlineCode> row (and cascades to their <InlineCode>user_profiles</InlineCode> row) via the <InlineCode>platform-user-admin</InlineCode> Edge Function. You cannot delete your own account.
              </Step>

              <Note>
                <strong>Promoting an existing account:</strong> If you invite or re-assign someone whose email is already registered, <InlineCode>inviteUserByEmail</InlineCode> won't send a new invite (the account already exists) — the <InlineCode>invite-user</InlineCode> Edge Function instead promotes their <InlineCode>user_profiles</InlineCode> row immediately and sends them an "Your access changed" email via Resend so they know their role, organisation, site, or unit was updated.
              </Note>

              <Danger>
                Changing a user's role to <strong>super_admin</strong> gives them full, unrestricted access to every tenant's data. Reserve this for {COMPANY_NAME} staff only. Deleting an account is permanent and cannot be undone from the UI.
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
                    'Resend SMTP configured with a verified sender domain',
                    'Invite user, disabled Magic Link, and Reset Password email templates copied into Supabase',
                    'Wildcard DNS record added: *.extendihealth.com CNAME to Vercel',
                    'Wildcard SSL certificate provisioned on Vercel (*.extendihealth.com)',
                  ]},
                  { category: 'Vercel', items: [
                    'All 4 env vars set in Vercel dashboard for Production environment',
                    'VITE_APP_URL=https://care.extendihealth.com and VITE_ROOT_DOMAIN=care.extendihealth.com set on Vercel',
                    'vercel --prod run and deployment status is READY',
                    'Login page loads at care.extendihealth.com',
                    'vercel.json rewrite rule present (SPA routing works)',
                  ]},
                  { category: 'Platform', items: [
                    'Super admin account created and can access /platform (care.extendihealth.com)',
                    'Client organization created with license record and unique slug',
                    'Organization slug is valid (lowercase, alphanumeric, no spaces)',
                    'Subdomain resolves correctly (e.g., yourname.extendihealth.com)',
                    'SSL certificate is valid for wildcard (*.extendihealth.com)',
                    'License status is active or trial with a valid expiry',
                    'Tenant Admin invited and invite email confirmed delivered',
                    'Tenant Admin can access their subdomain and lands on /tenant-admin',
                  ]},
                  { category: 'Tenant Admin Portal', items: [
                    'Tenant Admin Portal at /tenant-admin loads without errors',
                    'Tenant Admin can navigate all 6 portal pages (Dashboard, Settings, Users, Sites, Licensing, Audit Logs)',
                    'Settings page allows logo upload and organization name update',
                    'Users & Roles page allows staff invitations and role assignments',
                    'Sites & Units page allows creating sites and units for the organization',
                    'Licensing page correctly displays plan, limits, and expiry (matches super admin view)',
                    'Audit Logs page shows organizational activity and CSV export works',
                    'Tenant Admin cannot access /platform or other organization\'s data (RLS verified)',
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
