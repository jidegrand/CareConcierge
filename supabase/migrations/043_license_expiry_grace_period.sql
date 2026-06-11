-- Add a grace period to tenant_license_active() so that licenses with
-- status still 'active'/'trial' but expires_at significantly in the past
-- also lose patient-facing access (LICENSING_ACTION_PLAN #2 follow-up).
--
-- Previously only status IN ('suspended','archived') blocked RLS, per the
-- "no surprise outage" decision in 042_rls_license_enforcement.sql. In
-- practice this meant a license could sit expired-but-active indefinitely
-- with zero enforcement until an admin manually flipped status — confirmed
-- by testing against St-Mary Hospital's license (expires_at in the past,
-- status still 'active', patients still able to submit requests).
--
-- New rule: expires_at more than 3 days in the past also counts as
-- inactive, regardless of status. This gives staff a short window to renew
-- (surfaced via LicenseBanner's "expired, grace period" tier) before patient
-- access is cut off.
--
-- Keep the 3-day constant in sync with EXPIRY_GRACE_PERIOD_DAYS in
-- src/hooks/useLicense.ts.

CREATE OR REPLACE FUNCTION public.tenant_license_active(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status NOT IN ('suspended', 'archived')
            AND (expires_at IS NULL OR expires_at >= CURRENT_DATE - INTERVAL '3 days')
     FROM public.tenant_licenses WHERE tenant_id = p_tenant_id),
    true
  )
$$;
