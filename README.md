# Care Concierge

Multi-tenant patient request management platform by ExtendiHealth. Patients scan a QR code at the bedside to send requests to the care team in real time, while each hospital or care facility runs as its own tenant on a shared standalone platform.

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/your-org/bayrequest.git
cd bayrequest
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free project
2. In the Supabase dashboard, open **SQL Editor**
3. Run `supabase/schema.sql` — creates all tables, indexes, RLS policies, and enables realtime
4. Run `supabase/seed.sql` — inserts a demo tenant, site, unit, and sample bays
5. Run the SQL files in `supabase/migrations/` in order to enable roles, custom request types, patient-safe public hierarchy lookup, and subdomain tenant resolution

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in your `.env`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APP_URL=http://localhost:5173
VITE_ROOT_DOMAIN=careconcierge.local
VITE_DEFAULT_TENANT_SLUG=demo
```

> Get `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from:
> Supabase Dashboard → Your Project → Settings → API

### 4. Run locally

```bash
npm run dev
```

Use `demo.careconcierge.local` or a direct local/IP hostname during development. In production, each tenant should resolve on its own subdomain, for example:

```text
https://hospital-a.careconcierge.com
https://facility-b.careconcierge.com
```

---

## Routes

| URL | Description |
|-----|-------------|
| `/r/:roomId` | Patient QR landing page — no login required |
| `/dashboard` | Nurse station real-time queue |
| `/admin/*` | Tenant admin and operational tooling |

### Test patient flow locally

Open a browser to one of the seeded bay URLs:

```
http://localhost:5173/r/00000000-0000-0000-0001-000000000001  (Bay 1)
http://localhost:5173/r/00000000-0000-0000-0001-000000000002  (Bay 2)
http://localhost:5173/r/00000000-0000-0000-0001-000000000003  (Bay 3)
```

Open a second tab to `/dashboard` — requests will appear in real time as you submit them.

## Multi-Tenant Model

- The app is built as a shared standalone product with tenant isolation enforced in Supabase.
- Each tenant has its own `tenant`, `site`, `unit`, `room`, `request_types`, and `user_profiles` data.
- Staff/admin pages resolve tenancy from the signed-in user profile.
- Public patient pages can resolve tenancy from the room hierarchy and, when needed, from the current hostname subdomain.
- Custom request types, reports, QR links, and admin flows are all tenant-aware.
- `tenant.slug` is the subdomain identity used for hostname-based resolution.

---

## Project Structure

```
bayrequest/
├── src/
│   ├── pages/
│   │   ├── PatientPage.tsx       # QR landing — patient request screen
│   │   ├── NurseDashboard.tsx    # Real-time nurse queue
│   │   └── AdminPage.tsx         # Phase 2 placeholder
│   ├── components/
│   │   └── RequestCard.tsx       # Individual request row in dashboard
│   ├── hooks/
│   │   ├── useRoom.ts            # Fetch room metadata by UUID
│   │   └── useRequests.ts        # Real-time request queue + status updates
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client singleton
│   │   └── constants.ts          # Request type config + timeAgo util
│   ├── types/
│   │   └── index.ts              # All TypeScript types
│   ├── App.tsx                   # Router
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Tailwind + global styles
├── supabase/
│   ├── schema.sql                # Full DB schema + RLS — run first
│   ├── seed.sql                  # Demo tenant/site/unit/bay seed data
│   └── migrations/               # Incremental schema + policy updates
├── .env.example                  # Environment variable template
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add your environment variables in the Vercel dashboard under **Settings → Environment Variables**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL` (your Vercel domain, e.g. `https://bayrequest.vercel.app`)
- `VITE_ROOT_DOMAIN` (your shared platform root domain, e.g. `careconcierge.com`)
- `VITE_DEFAULT_TENANT_SLUG` (fallback slug for local/dev-only use)

Point each tenant subdomain to the same deployment and create a matching `tenants.slug` record in Supabase.

---

## Development Phases

| Phase | Scope | Status |
|-------|-------|--------|
| 1 — Standalone Core | Patient screen, nurse dashboard, Supabase realtime, QR codes | Live |
| 2 — Multi-Tenant Operations | Tenant/site/unit admin, role auth, QR sheet generator, custom request types | Live |
| 3 — Analytics | Response time tracking, demand heatmaps, CSV export | In progress |
| 4 — Commercial | Billing, white-label, SSO, FHIR-lite API | Planned |

---

## Tech Stack

- **React 18 + Vite** — frontend
- **TypeScript** — type safety
- **Tailwind CSS** — styling
- **Supabase** — PostgreSQL + real-time + auth + RLS
- **React Router v6** — routing
- **Vercel** — hosting

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `VITE_APP_URL` | ✅ | Base URL of the app (used for QR generation) |
| `VITE_ROOT_DOMAIN` | Optional | Shared platform root domain used for tenant subdomains |
| `VITE_DEFAULT_TENANT_SLUG` | Optional | Local development fallback when hostname-based tenant resolution is unavailable |
