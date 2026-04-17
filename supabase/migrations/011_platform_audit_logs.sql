-- Platform-wide audit trail for organization, licensing, and access control changes.

CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id          UUID,
  actor_name        TEXT NOT NULL DEFAULT 'Platform User',
  actor_role        TEXT,
  organization_id   UUID REFERENCES tenants(id) ON DELETE SET NULL,
  organization_name TEXT,
  action            TEXT NOT NULL,
  target_type       TEXT NOT NULL,
  target_id         TEXT NOT NULL,
  summary           TEXT NOT NULL,
  details           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_audit_logs_select_super_admin" ON platform_audit_logs;
CREATE POLICY "platform_audit_logs_select_super_admin" ON platform_audit_logs
  FOR SELECT
  USING (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "platform_audit_logs_insert_super_admin" ON platform_audit_logs;
CREATE POLICY "platform_audit_logs_insert_super_admin" ON platform_audit_logs
  FOR INSERT
  WITH CHECK (current_user_role() = 'super_admin' AND actor_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_created_at ON platform_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_organization_id ON platform_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_action ON platform_audit_logs(action);

CREATE OR REPLACE FUNCTION platform_write_audit_log(
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

CREATE OR REPLACE FUNCTION audit_tenants_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user_role() <> 'super_admin' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM platform_write_audit_log(
      NEW.id,
      NEW.name,
      'organization.created',
      'organization',
      NEW.id::text,
      format('Created organization %s.', NEW.name),
      jsonb_build_object('slug', NEW.slug, 'after', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF ROW(NEW.name, NEW.slug) IS DISTINCT FROM ROW(OLD.name, OLD.slug) THEN
      PERFORM platform_write_audit_log(
        NEW.id,
        NEW.name,
        'organization.updated',
        'organization',
        NEW.id::text,
        format('Updated organization %s.', NEW.name),
        jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM platform_write_audit_log(
      OLD.id,
      OLD.name,
      'organization.deleted',
      'organization',
      OLD.id::text,
      format('Deleted organization %s.', OLD.name),
      jsonb_build_object('before', to_jsonb(OLD))
    );
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS platform_audit_tenants ON tenants;
CREATE TRIGGER platform_audit_tenants
AFTER INSERT OR UPDATE OR DELETE ON tenants
FOR EACH ROW
EXECUTE FUNCTION audit_tenants_changes();

CREATE OR REPLACE FUNCTION audit_tenant_licenses_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
  org_name TEXT;
BEGIN
  IF current_user_role() <> 'super_admin' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  org_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
  SELECT name INTO org_name FROM tenants WHERE id = org_id;
  org_name := COALESCE(org_name, 'Unknown organization');

  IF TG_OP = 'INSERT' THEN
    PERFORM platform_write_audit_log(
      org_id,
      org_name,
      'license.created',
      'license',
      NEW.id::text,
      format('Created a license record for %s.', org_name),
      jsonb_build_object('after', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF ROW(NEW.status, NEW.plan, NEW.site_limit, NEW.unit_limit, NEW.room_limit, NEW.user_limit, NEW.starts_at, NEW.expires_at, NEW.features, NEW.notes)
      IS DISTINCT FROM
      ROW(OLD.status, OLD.plan, OLD.site_limit, OLD.unit_limit, OLD.room_limit, OLD.user_limit, OLD.starts_at, OLD.expires_at, OLD.features, OLD.notes)
    THEN
      PERFORM platform_write_audit_log(
        org_id,
        org_name,
        'license.updated',
        'license',
        NEW.id::text,
        format('Updated licensing for %s.', org_name),
        jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM platform_write_audit_log(
      org_id,
      org_name,
      'license.deleted',
      'license',
      OLD.id::text,
      format('Removed the stored license record for %s.', org_name),
      jsonb_build_object('before', to_jsonb(OLD))
    );
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS platform_audit_tenant_licenses ON tenant_licenses;
CREATE TRIGGER platform_audit_tenant_licenses
AFTER INSERT OR UPDATE OR DELETE ON tenant_licenses
FOR EACH ROW
EXECUTE FUNCTION audit_tenant_licenses_changes();

CREATE OR REPLACE FUNCTION audit_platform_access_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
  org_name TEXT;
  subject_name TEXT;
BEGIN
  IF current_user_role() <> 'super_admin' THEN
    RETURN NEW;
  END IF;

  IF ROW(NEW.role, NEW.tenant_id, NEW.unit_id) IS NOT DISTINCT FROM ROW(OLD.role, OLD.tenant_id, OLD.unit_id) THEN
    RETURN NEW;
  END IF;

  org_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
  SELECT name INTO org_name FROM tenants WHERE id = org_id;
  subject_name := COALESCE(NEW.full_name, OLD.full_name, format('User %s', NEW.id::text));

  PERFORM platform_write_audit_log(
    org_id,
    COALESCE(org_name, 'Unknown organization'),
    'access.updated',
    'user_access',
    NEW.id::text,
    format('Updated access for %s.', subject_name),
    jsonb_build_object(
      'user_name', subject_name,
      'before', jsonb_build_object(
        'role', OLD.role,
        'tenant_id', OLD.tenant_id,
        'unit_id', OLD.unit_id
      ),
      'after', jsonb_build_object(
        'role', NEW.role,
        'tenant_id', NEW.tenant_id,
        'unit_id', NEW.unit_id
      )
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_audit_user_profiles_access ON user_profiles;
CREATE TRIGGER platform_audit_user_profiles_access
AFTER UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION audit_platform_access_changes();
