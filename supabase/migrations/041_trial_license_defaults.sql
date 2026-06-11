-- Give trial licenses a real, enforced expiry (LICENSING_ACTION_PLAN #4).
--
-- Previously new tenants got NO tenant_licenses row at all (createTenant only
-- inserts into `tenants`), so useLicense/useLicenseUsage fell back to
-- status='trial', plan='pilot', unlimited limits, expires_at=null — i.e.
-- unrestricted access forever. And any trial row that did exist with
-- expires_at=null never expired.

-- ── 1. Backfill: any trial license with no expiry gets a 30-day trial window ──
UPDATE public.tenant_licenses
SET expires_at = (COALESCE(starts_at, created_at::date, CURRENT_DATE) + INTERVAL '30 days')::date
WHERE status = 'trial' AND expires_at IS NULL;

-- ── 2. Safety net: any tenant that somehow has no license row gets one ────────
INSERT INTO public.tenant_licenses (
  tenant_id, status, plan, starts_at, expires_at,
  site_limit, unit_limit, room_limit, user_limit, updated_at
)
SELECT t.id, 'trial', 'pilot', CURRENT_DATE, (CURRENT_DATE + INTERVAL '30 days')::date,
       1, 3, 50, 5, now()
FROM public.tenants t
LEFT JOIN public.tenant_licenses tl ON tl.tenant_id = t.id
WHERE tl.tenant_id IS NULL;

-- ── 3. Auto-provision a trial license for every new tenant going forward ──────
-- Defaults: 30-day trial, single-site pilot limits (site_limit=1, unit_limit=3,
-- room_limit=50, user_limit=5), enforced by the triggers in
-- 040_enforce_license_limits.sql. Super admins adjust via the Platform
-- Licensing page when converting to a paid plan.
CREATE OR REPLACE FUNCTION public.provision_tenant_license()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tenant_licenses (
    tenant_id, status, plan, starts_at, expires_at,
    site_limit, unit_limit, room_limit, user_limit, updated_at
  )
  VALUES (
    NEW.id, 'trial', 'pilot', CURRENT_DATE, (CURRENT_DATE + INTERVAL '30 days')::date,
    1, 3, 50, 5, now()
  )
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_provision_tenant_license ON public.tenants;
CREATE TRIGGER trg_provision_tenant_license
AFTER INSERT ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.provision_tenant_license();
