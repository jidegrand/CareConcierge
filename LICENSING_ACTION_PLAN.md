# Licensing Enforcement — Action Plan

> Companion to the licensing review (2026-06-11). Tracks remediation for the gaps where
> `tenant_licenses` data is stored/displayed but not actually enforced. Supersedes/expands
> `FEATURE_GAPS.md` items #22, #23, #26, #38, #39 with concrete implementation steps.
>
> Status legend: ⬜ not started · 🔶 in progress · ✅ done

---

## P0 — Revenue & access integrity

### 1. ✅ Enforce resource limits server-side (sites/units/rooms/users)
**Problem:** `site_limit`, `unit_limit`, `room_limit`, `user_limit` are stored but nothing blocks `INSERT` when exceeded — every plan has unlimited capacity in practice.

**Implemented in [040_enforce_license_limits.sql](supabase/migrations/040_enforce_license_limits.sql):**
- `sites`/`units`/`rooms`: statement-level `AFTER INSERT` triggers (`enforce_site_limit`, `enforce_unit_limit`, `enforce_room_limit`) that resolve the owning tenant (`units`/`rooms` via `site_id`/`unit_id` joins) and compare the post-insert count against `tenant_licenses.{site,unit,room}_limit`. Statement-level so multi-row inserts (e.g. `createRoomsFromTemplate`) are checked once against the final total, not row-by-row. `NULL` limit = unlimited, matching `useLicenseUsage` display logic.
- `pending_invites`: row-level `BEFORE INSERT OR UPDATE` trigger (`enforce_user_limit`) checks `active user_profiles + other pending invites + 1` against `user_limit`. Enforced **at invite time** (not at `user_profiles` bootstrap on signup) — see design note below.
- All raise a custom exception (`ERRCODE = 'LIC01'`) with a user-facing message, e.g. *"Your organization has reached its site limit of 1. Upgrade your plan to add more sites."*

**No frontend mapping needed:** verified `createSite`/`createUnit`/`createRoomsFromTemplate` (`useTenantSites`, `useTenantUnits`, admin `useSites`) and the `invite-user` edge function → `getInviteFunctionError`/`formatInviteEmailError` all already propagate `err.message` straight to the UI (`SitesAndUnitsPage`, `SitesPanel`, `UsersPage`), so the trigger's message is shown as-is.

**Design note — why `user_limit` is enforced on `pending_invites`, not `user_profiles`:**
`user_profiles` rows are created via a `SECURITY DEFINER` trigger on `auth.users` insert (`handle_invited_user`, migration 025), which fires when the *invited user* completes signup — not when the admin acts. Blocking there would mean an invite could succeed today and then fail confusingly for the end-user during signup if the org's usage crept up in the meantime. Enforcing on `pending_invites` blocks the action at the point the *admin* clicks "Invite", with the error surfacing immediately in `UsersPage`.

**Acceptance:** Attempting to create a 2nd site on a license with `site_limit = 1` fails both via direct Supabase call and via the UI, with a clear message. ✅

---

### 2. ✅ Enforce license status/expiry at the data layer (RLS), not just the React gate
**Problem:** `LicenseGate` is a UI-only check, only mounted in `NurseShell`. Patient-facing routes (`/r/:roomId`, `/patient-guide`) and any direct API access are unaffected by `suspended`/`archived`/expired status.

**Implemented in [042_rls_license_enforcement.sql](supabase/migrations/042_rls_license_enforcement.sql)** (product decisions: hard cutoff for `suspended`/`archived` only; patient pages go fully unavailable, no separate "service unavailable" UI needed):
- New `tenant_license_active(p_tenant_id uuid) RETURNS boolean` `SECURITY DEFINER` helper: `false` only if the tenant's `tenant_licenses.status IN ('suspended','archived')`; `true` for `trial`/`active` and for tenants with no license row (matches `useLicenseUsage`'s "no record = active" default).
  - **Scope decision:** date-based `expires_at` lapsing alone does **not** block access — `LicenseGate`/`LicenseBanner` already nag staff based on expiry, and a hard cutoff the instant `expires_at` passes risked a "surprise outage" before anyone acted on it. RLS is the backstop for an explicit suspend/archive action only.
- `rooms_public_select` policy now also requires `tenant_license_active(...)` (resolved via `units` → `sites` → `tenant_id`).
- **Cascading effect (no extra policy edits needed):** `requests_public_insert/select/delete` and `request_feedback_public_insert` all resolve their room via a subquery/join on `rooms`, which is itself subject to `rooms`' RLS for the `anon` role in Postgres. Gating `rooms_public_select` alone makes a suspended/archived tenant's rooms — and everything keyed off them — invisible to patients.
- **No frontend change needed:** `useRoom.ts` already sets `error = 'Room not found. Please ask a staff member for assistance.'` when the room query returns no row (RLS-filtered or nonexistent), and `PatientPage.tsx` renders `ErrorScreen` for that case — this becomes the "service unavailable" UX for free.

**Verified non-breaking:** post-deploy, all 5 production tenants (`status='active'`) return `tenant_license_active = true`, so the new policy clause is currently a no-op and only activates if/when an admin explicitly sets a tenant to `suspended`/`archived`.

**Acceptance:** Setting an org's license `status = 'suspended'` blocks new patient requests via `/r/:roomId` even when called directly against Supabase, not just through `NurseShell`. ✅

**Follow-up — [043_license_expiry_grace_period.sql](supabase/migrations/043_license_expiry_grace_period.sql):** Live testing surfaced a gap: a license with `status='active'` but `expires_at` in the past (e.g. set 2 months overdue) had **zero enforcement** — `tenant_license_active()` only checked `status`, so patients could submit requests indefinitely until an admin manually flipped `status` to `suspended`. Resolved per product decision (3-day grace period):
- `tenant_license_active()` now also returns `false` once `expires_at < CURRENT_DATE - 3 days`, regardless of status.
- [useLicense.ts](src/hooks/useLicense.ts) exports `EXPIRY_GRACE_PERIOD_DAYS = 3` (kept in sync with the migration) and a new `isSuspended` flag mirroring the actual RLS condition (`status IN ('suspended','archived')` OR past the grace period).
- [LicenseBanner.tsx](src/components/LicenseBanner.tsx) now distinguishes three tiers instead of conflating expiry with suspension:
  - **suspended** (RLS already blocking): "Service suspended ... Patient requests are blocked."
  - **expired, in grace period** (RLS still allows, for now): "License expired ... Patient requests will be suspended in N days unless renewed." — previously this state incorrectly showed "Service is suspended" even though it wasn't.
  - **expiring soon**: unchanged.
- [LicenseGate.tsx](src/components/LicenseGate.tsx) (staff UI gate) now uses the same `isSuspended` flag for its "Account Suspended" vs "License Expired" copy, keeping staff-facing messaging aligned with what patients actually experience.

---

### 3. ✅ Fix "Remove stored license" un-suspend footgun
**Problem:** [useLicenses.ts](src/hooks/admin/useLicenses.ts) `deleteLicense()` removed the row entirely; the app then fell back to `status: 'trial', plan: 'pilot'`, no limits, no expiry — silently restoring full unrestricted access to a previously suspended/archived org.

**Implemented (preferred option):** Removed the "Remove stored license" action entirely.
- Item 4's `trg_provision_tenant_license` trigger now guarantees every tenant always has a `tenant_licenses` row, so "no record" can no longer happen for new orgs and was backfilled for existing ones — there's nothing left to safely "reset to defaults".
- Deleted `deleteLicense` from [useLicenses.ts](src/hooks/admin/useLicenses.ts) and the "Remove stored license" button/`handleDelete`/`onDelete` wiring from [PlatformLicensingPage.tsx](src/pages/platform/PlatformLicensingPage.tsx).
- `saveLicense` (an `upsert` on `tenant_id`) remains the only write path — editing is always an UPDATE (or a one-time INSERT for the now-impossible missing-row case).

**Acceptance:** There is no admin action that can move an org from `suspended`/`archived` back to functional access without explicitly setting `status` to `trial`/`active` via "Save license". ✅

---

### 4. ✅ Give trial licenses a real, enforced expiry
**Problem:** `createTenant` (admin "create organization" flow) only inserts into `tenants` — it never created a `tenant_licenses` row. With no row, `useLicense`/`useLicenseUsage` fell back to `status='trial', plan='pilot'`, all limits `null`, `expires_at=null`: unrestricted access forever for any new org.

**Implemented in [041_trial_license_defaults.sql](supabase/migrations/041_trial_license_defaults.sql)** (product decisions: 30-day trial, single-site pilot limits):
- Backfills any existing `status='trial' AND expires_at IS NULL` row to `expires_at = starts_at + 30 days` (0 rows affected today — all 5 tenants are already `active` with limits/expiry set).
- One-time safety-net insert for any tenant missing a `tenant_licenses` row entirely (0 rows affected today — counts matched 5/5).
- New `trg_provision_tenant_license` trigger (`AFTER INSERT ON tenants`) auto-creates a `tenant_licenses` row for every new org: `status='trial', plan='pilot', expires_at=CURRENT_DATE+30, site_limit=1, unit_limit=3, room_limit=50, user_limit=5`. These limits are enforced immediately by the triggers from migration 040.
- No frontend change needed: `useLicense.isExpired`/`isExpiringSoon` and `LicenseBanner` already key off `expires_at` and now fire correctly from day 1 for new trials.

**Acceptance:** A newly created org gets a trial license row with `expires_at = today + 30` and non-null limits; `LicenseBanner` shows the countdown from day 1. ✅

---

## P1 — Entitlements consistency

### 5. ✅ Reconcile feature-flag keys between admin editor and tenant display
**Problem:** [PlatformLicensingPage.tsx](src/pages/platform/PlatformLicensingPage.tsx) wrote `custom_requests`, `global_reports`, `qr_codes`, `api_access`. [LicensingPage.tsx](src/pages/tenant-admin/LicensingPage.tsx) `AVAILABLE_FEATURES` displayed `patient_feedback`, `qr_codes`, `analytics`, `audit_logs`, `api_access`, `sso`, `custom_branding`, `dedicated_support`. Only 2 of 8 keys overlapped.

**Implemented:**
- New single source of truth [licenseFeatures.ts](src/lib/licenseFeatures.ts) exports `LICENSE_FEATURES`, each entry tagged with a category:
  - `included` — always available, not stored in `tenant_licenses.features`, not toggleable: `patient_feedback`, `custom_branding`.
  - `entitlement` — stored, toggleable, gated via `hasFeature()`: `qr_codes`, `custom_requests`, `reports` (renamed from `global_reports`/`analytics`), `audit_logs`.
  - `coming_soon` — not implemented anywhere, shown for roadmap visibility only, never "Not available": `api_access`, `sso`.
  - Dropped `dedicated_support` entirely (a support-plan attribute, not a software feature).
- [PlatformLicensingPage.tsx](src/pages/platform/PlatformLicensingPage.tsx): entitlement checkboxes now `.map()` over `ENTITLEMENT_FEATURES`; `buildLicenseForm`/`handleSave` use a `features: Record<string, boolean>` sub-object instead of 4 hardcoded flat fields.
- [LicensingPage.tsx](src/pages/tenant-admin/LicensingPage.tsx): replaced local `AVAILABLE_FEATURES` with `LICENSE_FEATURES`; `included` features always show "Included", `entitlement` features are gated by `hasFeature()`, `coming_soon` features show "Coming soon" instead of "Not available".
- [044_reconcile_license_feature_keys.sql](supabase/migrations/044_reconcile_license_feature_keys.sql): renamed `global_reports` → `reports` and backfilled `audit_logs: true` in `tenant_licenses.features` for all 5 production tenants (verified via query post-apply).

**Acceptance:** Every checkbox a super admin can toggle corresponds to a feature shown on the tenant licensing page, and vice versa. ✅

---

### 6. ✅ Make feature flags actually gate functionality
**Problem:** `hasFeature()` was only used cosmetically; toggling `qr_codes`/`api_access`/`reports`/etc. off had no functional effect.

**Implemented:**
- New [useFeatureGate.ts](src/hooks/useFeatureGate.ts) hook: looks up `license.features[key]` via `useLicense()`, with `super_admin` always treated as enabled (they manage the platform, not a single tenant's entitlements).
- New [FeatureLocked.tsx](src/components/FeatureLocked.tsx): shared "Upgrade to unlock" placeholder (light theme for in-shell pages, `dark` variant for QRSheetPage's standalone dark theme).
- `qr_codes` → [QRSheetPage.tsx](src/pages/QRSheetPage.tsx) renders `FeatureLocked` (dark) when disabled; [NurseShell.tsx](src/components/NurseShell.tsx) hides the "QR Sheets" nav item (`showQR = canAny(role, 'page.qrsheet') && qrCodesEnabled`).
- `reports` → [ReportsPage.tsx](src/pages/ReportsPage.tsx) renders `FeatureLocked` when disabled; `NurseShell.tsx` filters the "Reports" item out of `mainNav` when disabled.
- `audit_logs` → [AuditLogsPage.tsx](src/pages/tenant-admin/AuditLogsPage.tsx) renders `FeatureLocked` when disabled; [TenantAdminLayout.tsx](src/pages/tenant-admin/TenantAdminLayout.tsx) hides the "Audit Logs" sidebar item.
- `custom_requests` → [AdminPage.tsx](src/pages/AdminPage.tsx) "Common Requests" tab renders `FeatureLocked` instead of `RequestTypesPanel` when disabled.
- `api_access` → left as-is (still `coming_soon`, not yet a real feature — tracked under FEATURE_GAPS #39).
- `PlatformGlobalReportsPage` → no change needed; it's `super_admin`-only and `useFeatureGate` always returns `enabled: true` for `super_admin`.

**Acceptance:** Disabling `qr_codes` for a tenant hides the QR Sheet nav item and shows an "Upgrade to unlock" placeholder on direct navigation to `/qr-sheet`. Same pattern applies to `reports`, `audit_logs`, and `custom_requests`. ✅

---

## P2 — UX polish

### 7. ✅ Tighten expiry-warning visibility for tenant_admin
**Problem:** `LicenseBanner` warning tier was dismissible per session via `sessionStorage`; combined with `tenant_admin` bypassing `LicenseGate` entirely, an org could coast past expiry without a hard prompt until status flips.

**Implemented in [LicenseBanner.tsx](src/components/LicenseBanner.tsx):**
- Item 2's RLS enforcement already makes this lower-stakes (real consequences kick in regardless of banner dismissal), but the banner itself now also escalates dismissal behavior:
  - **> 7 days until expiry:** unchanged — dismiss is remembered for the session via `sessionStorage`.
  - **≤ 7 days until expiry (urgent):** dismiss is now stored in `localStorage` keyed by `` `${license.id}:${today's date}` ``, so it only suppresses the banner for the rest of that calendar day. A long-lived session sees it again the next day.
- `suspended`/`expired` banners remain non-dismissible, unchanged.

**Acceptance:** A `tenant_admin` cannot avoid seeing the critical (≤7 day) banner more than once per day. ✅

---

## P3 — Process / structural (no code yet — needs scoping)

### 8. ⬜ Seat-based / per-user license tracking
Current `user_limit` is a headcount cap only (and unenforced until item 1). If per-seat billing is the target model, design a `tenant_license_seats` table or `user_profiles.license_seat boolean` column. **Needs product input before scoping.**

### 9. ⬜ Billing integration touchpoint
All plan/status changes are manual via Platform Console. Longer-term: webhook from Stripe (or chosen processor) to update `tenant_licenses.status`/`plan`/`expires_at` on payment events. **Blocked on choice of billing provider — out of scope until a provider is selected.**

---

## Suggested sequencing

1. **Item 4** (trial expiry defaults) — small, low-risk migration, unblocks realistic testing of items 1–2.
2. **Item 3** (remove/neuter the delete-license footgun) — small, prevents accidental access restoration while other work lands.
3. **Item 1** (server-side resource limits) — highest revenue-integrity impact.
4. **Item 2** (RLS status/expiry enforcement) — needs the Open Questions below resolved first since it can lock out real orgs if scoped wrong.
5. **Items 5–6** (feature flag reconciliation + gating) — independent, can run in parallel with 1–4.
6. **Item 7** — trivial, do alongside item 2.
7. **Items 8–9** — defer until product/billing decisions are made.
