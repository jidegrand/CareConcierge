-- Enforce tenant license status at the RLS layer for patient-facing access
-- (LICENSING_ACTION_PLAN #2).
--
-- LicenseGate is a UI-only check mounted only in NurseShell — patient-facing
-- routes (/r/:roomId) and any direct API access were unaffected by a
-- suspended/archived license. This adds a SECURITY DEFINER helper and wires
-- it into rooms_public_select.
--
-- Scope (per product decision):
-- - Only status IN ('suspended','archived') blocks access. expires_at lapsing
--   alone does NOT — LicenseGate/LicenseBanner already nag staff based on
--   expiry, and a hard cutoff the instant expires_at passes risks a "surprise
--   outage" before anyone has acted on it. RLS is the backstop for an
--   explicit suspend/archive action.
-- - A tenant with no tenant_licenses row (shouldn't happen post-041) is
--   treated as active, matching useLicenseUsage's "no record = trial" default.
--
-- Cascading effect: requests_public_insert/select/delete and
-- request_feedback_public_insert all resolve their room via a subquery/join
-- on `rooms`, which is itself subject to rooms' RLS policies for the anon
-- role. Gating rooms_public_select alone therefore makes a suspended/archived
-- tenant's rooms (and everything keyed off them) invisible to patients —
-- useRoom() already renders "Room not found. Please ask a staff member for
-- assistance." for this case, so no frontend change is needed.

CREATE OR REPLACE FUNCTION public.tenant_license_active(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status NOT IN ('suspended', 'archived') FROM public.tenant_licenses WHERE tenant_id = p_tenant_id),
    true
  )
$$;

DROP POLICY IF EXISTS "rooms_public_select" ON public.rooms;
CREATE POLICY "rooms_public_select" ON public.rooms
  FOR SELECT USING (
    active = true
    AND public.tenant_license_active(
      (SELECT s.tenant_id FROM public.units u JOIN public.sites s ON s.id = u.site_id WHERE u.id = rooms.unit_id)
    )
  );
