-- Ensure new tenants are provisioned with Reports & Analytics enabled by
-- default, matching every existing tenant's tenant_licenses.features.
--
-- provision_tenant_license() (041_trial_license_defaults.sql) previously
-- inserted a trial tenant_licenses row without a `features` value, falling
-- back to the column default '{}'::jsonb. That left `reports` unset for any
-- newly created organization, so non-super-admin staff at that tenant
-- couldn't see Reports & Analytics (useFeatureGate('reports') requires
-- features.reports === true).

CREATE OR REPLACE FUNCTION public.provision_tenant_license()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tenant_licenses (
    tenant_id, status, plan, starts_at, expires_at,
    site_limit, unit_limit, room_limit, user_limit, features, updated_at
  )
  VALUES (
    NEW.id, 'trial', 'pilot', CURRENT_DATE, (CURRENT_DATE + INTERVAL '30 days')::date,
    1, 3, 50, 5, '{"reports": true}'::jsonb, now()
  )
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$;
