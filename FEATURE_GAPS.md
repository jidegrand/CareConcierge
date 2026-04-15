# Care Concierge — Feature Gap Analysis

> Comprehensive review of missing flows, identified by co-developer audit of the full codebase.
> Organised by domain. Each item includes context and the suggested fix direction.

---

## Clinical Operations

**1. ~~`acknowledged_by` column is missing~~ ✅ DONE**
Added `acknowledged_by uuid` column to `requests` (migration 012) with FK to `user_profiles`. `useRequests` now writes `acknowledged_by = currentUser.id` on acknowledge and joins the acknowledger profile. `useFeed` populates `actorName` on acknowledged and resolved feed events so the Feed page shows "by Nurse Jane". `useStaffing` tracks `acknowledgedToday` and `avgAckSec` per staff member alongside resolved workload.

**2. ~~Request escalation / overdue alerts~~ ✅ DONE**
Added `usePrefs` hook (shared localStorage-backed prefs, reactive across components). Added `useOverdueAlerts` hook that synchronously derives a `Set<string>` of overdue IDs for rendering and fires sound/browser-notification alerts the first time each request crosses the configured `overdueThreshold`. `PendingCard` now has three visual escalation states: normal (red) → approaching (amber "Waiting" badge at `responseTarget`) → overdue (pulsing orange border + "Overdue" badge). `InProgressCard` now shows a pulsing "Long Wait" badge when a request has been active longer than `overdueThreshold × 2`. `SettingsPage` updated to import from the shared `usePrefs` module.

**3. ~~Request reassignment~~ ✅ DONE**
Added `reassign(requestId, newUserId, newUserName?)` to `useRequests` — updates `acknowledged_by` without touching status or timestamps. Added `useAssignableStaff` hook that fetches nurse/charge_nurse/volunteer/site_manager profiles in scope. `InProgressCard` now shows a "Reassign →" button that opens an inline staff picker dropdown; selecting a name hands off the request and updates the card's assignee display immediately.

**4. Clinical notes on requests**
No free-text note can be attached to a request. Staff sometimes need to record what was done (e.g. "gave 500ml water, patient comfortable"). A notes field — write on resolve, visible in history — would complete the resolution record.

**5. ~~Shift handover report~~ ✅ DONE**
Added `HandoverReportModal` component. A "Handover Report" button in the dashboard right panel opens a full-screen modal with: summary stats banner (pending / in-progress / resolved counts), open-requests table (sorted oldest-first, shows bay, type, status badge, age, assignee), resolved-this-shift table (resolver name, time, wait duration), and staff activity log. "Print" calls `window.print()` with a CSS rule that isolates the report for clean printing. "Copy text" writes a plain-text version to the clipboard for pasting into handover notes.

**6. ~~Request deduplication / patient linking~~ ✅ DONE**
Two-layer deduplication: (1) Patient page — on load, fetches pending/acknowledged requests for the room; realtime subscription keeps the set live; buttons for already-active types go into a "Request sent ✓" green state and are disabled. (2) Nurse dashboard — `pendingDupeCounts` map groups pending requests by `room_id:type`; `PendingCard` shows a purple `×N` badge when N > 1; "Acknowledge all ×N" button batch-acknowledges all sibling duplicates via a single update. This prevents queue flooding from patients who tap a request type multiple times.

---

## Patient Experience

**7. ~~Real-time status visible to patient~~ ✅ DONE**
`ActiveRequest` extended with `id` and `status` fields. Insert now uses `.select('id').single()` to capture the row ID. The existing room-level realtime subscription (from gap #6) now also updates `activeRequest.status` — pending/acknowledged rows are matched by ID; absence from the result means resolved. Static modal replaced with `RequestStatusModal`: three visual states (blue spinner "Received" → amber nurse-icon "On the way" → green checkmark "Completed") with a 3-step progress track across the top. Patient sees live status transitions without page refresh.

**8. ~~Request cancellation by patient~~ ✅ DONE**
Patients can now cancel a request from the active-request modal while it is still active (`pending` or `acknowledged`). The patient page tracks the live request row ID/status, keeps the cancel action available after acknowledgment, removes the request from the room's active set after a successful delete, and refreshes live state if the request is no longer cancellable. Supabase RLS now includes a public delete policy limited to active requests on active rooms so the rule is enforced server-side as well.

**9. Patient satisfaction capture**
After a request is resolved, the QR page could show a brief "How did we do?" prompt (thumbs up/down or 1–5 stars). This data would feed a CSAT metric into the reports page.

**10. Services and Fun tabs (patient page)**
Both tabs are currently "coming soon" placeholders. Services could list ward amenities (TV remote, phone charging, newspaper). Fun could link to entertainment or wifi details. These are easy wins for patient experience.

**11. Multi-language support on patient page**
The patient-facing QR page has no i18n. Hospitals serving non-English speakers need at minimum a language selector that switches the request labels.

---

## Staff & Workload

**12. Live "claimed" indicator**
There is no way for other nurses to see that a colleague is already walking to a bay. Adding a "claimed by X" state between acknowledged and resolved would prevent double-handling.

**13. Staff availability / on-duty flag**
The staffing page shows all profiles but has no concept of who is currently on shift. A simple on-duty toggle (or shift start/end time) would make the workload view accurate.

**14. Staff performance targets**
Reports show avg resolution time but there is no configurable target per role or per organization. Benchmarking against a target (e.g. "acknowledge within 5 min") would make the data actionable.

**15. Workload rebalancing suggestion**
When one nurse has significantly more open requests than others, the dashboard could surface a prompt to the charge nurse — "Bay 4 queue heavy, consider reassigning."

---

## Admin Portal

**16. Bulk room creation**
Rooms can only be created one at a time. A CSV import or "create N rooms named Bay 1–24" wizard would be a significant time save for setup.

**17. Room naming templates**
Each organization names rooms differently (Bay, Bed, Room, Suite). A naming template at the unit level (e.g. "Bay {n}") with auto-increment would speed up room setup.

**18. Maintenance / out-of-service flag on rooms**
There is no way to mark a room as out of service (cleaning, maintenance). Such rooms still appear on the bay map and in QR sheets. An inactive flag with reason would clean this up.

**19. Request type library / templates**
Each new organization configures request types from scratch. A template library (standard hospital pack, elder care pack, etc.) that super admins publish and org admins can import would accelerate onboarding.

**20. Onboarding wizard**
The admin overview has a static "getting started" checklist but it is not interactive. A step-by-step wizard (Create site → Add units → Add rooms → Invite users → Print QR codes) with completion tracking would reduce setup abandonment.

**21. User deactivation (not just deletion)**
Currently users can only be deleted. Deactivating a user (preserving their historical data, blocking login) is the correct action when a staff member leaves — deletion orphans `resolved_by` references.

---

## Platform Console

**22. License limit enforcement**
Limits (`site_limit`, `user_limit`, `room_limit`) are stored in `tenant_licenses` but nothing in the app or RLS actually blocks creation when the limit is hit. Either enforce in hooks (check before insert) or enforce in Supabase via a DB trigger.

**23. License expiry enforcement**
When a license `expires_at` passes, the organization continues to function normally. Add a Supabase function or hook check that downgrades access to read-only or shows a grace-period banner when the license has lapsed.

**24. Trial-to-paid conversion flow**
`tenant_admin`s have no in-app path to upgrade their plan. A "Request upgrade" flow that notifies the super admin (email or audit log entry) would close this loop without requiring a full billing integration initially.

**25. Organization onboarding checklist for super admin**
When a super admin creates a new org, there is no guided path. A per-organization "onboarding status" card on the platform overview (license set? first site created? first user invited? QR printed?) would help track new client rollout.

**26. Org-level feature flag enforcement**
`tenant_licenses.features` has flags like `global_reports`, `qr_codes`, `api_access` but these are not checked anywhere in the code. The Reports and QR pages should gate behind the license entitlement check.

---

## Notifications

**27. Browser push notifications**
The UI and settings toggle exist but there is no service worker or push API implementation. For urgent requests, a push notification that fires even when the browser tab is in the background is a core clinical safety feature.

**28. Email digest for managers**
Nurse managers currently have no async visibility. A daily or shift-end email digest (total requests, urgent count, avg resolution time, open items) would be valuable for non-floor managers.

**29. In-app notification center**
There is no notification history anywhere in the app. Staff who missed an alert have no way to review what happened. A bell icon in the shell with a log of the last N events would fill this.

---

## Security & Compliance

**30. "Logout all sessions" not wired up**
The button exists in Settings → Security but makes no API call. Needs `supabase.auth.admin.signOut(userId, { scope: 'global' })` or a session revocation flow.

**31. Request-level audit trail**
`platform_audit_logs` captures platform-level changes (org/license/access) but there is no audit log of who acknowledged/resolved which request and when (beyond what is on the request row). Clinical environments often require an immutable event log at the request level.

**32. Rate limiting on patient QR requests**
The patient page submits requests without any rate limiting. A patient could flood the queue by tapping repeatedly. A simple per-room cooldown (e.g. same request type blocked for 60 seconds) enforced either client-side or via a Supabase function would prevent noise.

**33. Data retention policy**
Old resolved requests accumulate indefinitely. There is no archival or purge schedule. A configurable retention period (e.g. purge requests older than 90 days) per organization would keep the DB performant and meet data minimisation requirements.

---

## Reporting

**34. Period-over-period comparison**
The reports page shows absolute numbers for a date range but no comparison to the previous period. A "+12% vs last week" delta on each metric card would make trends immediately visible.

**35. Per-bay SLA compliance view**
Reports show avg resolution time globally but not which specific bays are consistently slow. A bay-level SLA table (avg ack time per bay, % met target) would help managers identify structural issues.

**36. Scheduled / emailed reports**
No automated report delivery. Managers have to log in and manually export. A schedule (daily/weekly/monthly) that emails a PDF or CSV would close this gap.

**37. Staff performance export scoped to date range**
The CSV export for staff performance uses "today" data, not the selected date range. It should respect the report's date range filter.

---

## Platform / Business Model

**38. Billing integration touchpoint**
License plans and statuses are managed manually by super admins. A Stripe or similar integration — even just a webhook that auto-updates license status on payment — would make the SaaS model operational.

**39. API access entitlement**
`features.api_access` is a license flag but there is no API or API key management anywhere. If this is a roadmap item, a placeholder API keys panel in the admin portal would signal intent.

**40. White-labelling / custom branding per org**
The app uses "Care Concierge" and ExtendiHealth branding throughout. Adding a per-tenant `brand_name`, `logo_url`, and primary color to the tenants table would allow each client's QR page and login screen to carry their own branding.

---

## Priority Guide

| Priority | Items | Rationale |
|----------|-------|-----------|
| **Quick wins** (low effort, high value) | 1, 3, 7, 8, 22, 26, 30, 32 | Mostly wiring up existing plumbing or small schema additions |
| **High clinical value** | 2, 4, 5, 12, 27, 31 | Directly improve patient safety and staff coordination |
| **Growth / SaaS** | 24, 38, 40 | Enable commercial operations and self-service onboarding |
| **Compliance** | 1, 30, 31, 33 | Required for regulated healthcare environments |
