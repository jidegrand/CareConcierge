-- Avoid FK failures when writing platform audit rows during tenant deletion.
-- If the referenced tenant no longer exists, store NULL in organization_id
-- while retaining the organization_name snapshot.

CREATE OR REPLACE FUNCTION public.platform_write_audit_log(
  p_organization_id UUID,
  p_organization_name TEXT,
  p_action TEXT,
  p_target_type TEXT,
  p_target_id TEXT,
  p_summary TEXT,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_full_name TEXT;
  actor_role_value TEXT;
  resolved_organization_id UUID;
BEGIN
  SELECT full_name, role
  INTO actor_full_name, actor_role_value
  FROM user_profiles
  WHERE id = auth.uid();

  SELECT t.id
  INTO resolved_organization_id
  FROM tenants t
  WHERE t.id = p_organization_id;

  INSERT INTO platform_audit_logs (
    actor_id,
    actor_name,
    actor_role,
    organization_id,
    organization_name,
    action,
    target_type,
    target_id,
    summary,
    details
  )
  VALUES (
    auth.uid(),
    COALESCE(actor_full_name, 'Platform User'),
    actor_role_value,
    resolved_organization_id,
    p_organization_name,
    p_action,
    p_target_type,
    p_target_id,
    p_summary,
    COALESCE(p_details, '{}'::jsonb)
  );
END;
$$;
