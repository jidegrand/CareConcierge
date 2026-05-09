-- Create request_audit_log table for immutable audit trail of clinical operations
-- Captures who acknowledged/resolved requests, when, and what changed
-- Critical for healthcare compliance and troubleshooting

CREATE TABLE IF NOT EXISTS public.request_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL
    CHECK (action IN ('created', 'acknowledged', 'resolved', 'reassigned', 'status_changed', 'updated')),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT,
  actor_role TEXT,
  room_id UUID,
  room_name TEXT,
  changes JSONB,
  notes TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.request_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only see audit logs for their tenant's requests
DROP POLICY IF EXISTS "audit_log_tenant_access" ON public.request_audit_log;
CREATE POLICY "audit_log_tenant_access" ON public.request_audit_log
  FOR SELECT
  USING (tenant_id = public.current_tenant_id());

-- Super admins can see all audit logs
DROP POLICY IF EXISTS "audit_log_super_admin_access" ON public.request_audit_log;
CREATE POLICY "audit_log_super_admin_access" ON public.request_audit_log
  FOR SELECT
  USING (public.current_user_role() = 'super_admin');

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_request_audit_tenant
  ON public.request_audit_log(tenant_id);

CREATE INDEX IF NOT EXISTS idx_request_audit_request
  ON public.request_audit_log(request_id);

CREATE INDEX IF NOT EXISTS idx_request_audit_tenant_timestamp
  ON public.request_audit_log(tenant_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_request_audit_actor
  ON public.request_audit_log(actor_id);

-- Function to log request changes
CREATE OR REPLACE FUNCTION public.log_request_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  v_action VARCHAR(50);
  v_changes JSONB;
  v_room_id UUID;
  v_room_name TEXT;
BEGIN
  -- Get tenant_id from room hierarchy
  SELECT
    rooms.id,
    rooms.name,
    sites.tenant_id
  INTO
    v_room_id,
    v_room_name,
    v_tenant_id
  FROM public.rooms
  LEFT JOIN public.units ON rooms.unit_id = units.id
  LEFT JOIN public.sites ON units.site_id = sites.id
  WHERE rooms.id = NEW.room_id;

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_changes := jsonb_build_object(
      'new_status', NEW.status,
      'new_acknowledged_by', NEW.acknowledged_by,
      'new_acknowledged_at', NEW.acknowledged_at,
      'new_resolved_by', NEW.resolved_by,
      'new_resolved_at', NEW.resolved_at
    );
  ELSE
    v_action := CASE
      WHEN NEW.status IS DISTINCT FROM OLD.status THEN 'status_changed'
      WHEN NEW.acknowledged_by IS DISTINCT FROM OLD.acknowledged_by AND NEW.acknowledged_at IS NOT NULL THEN 'acknowledged'
      WHEN NEW.resolved_by IS DISTINCT FROM OLD.resolved_by AND NEW.resolved_at IS NOT NULL THEN 'resolved'
      WHEN NEW.acknowledged_by IS DISTINCT FROM OLD.acknowledged_by THEN 'reassigned'
      ELSE 'updated'
    END;

    v_changes := jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status,
      'old_acknowledged_by', OLD.acknowledged_by,
      'new_acknowledged_by', NEW.acknowledged_by,
      'old_acknowledged_at', OLD.acknowledged_at,
      'new_acknowledged_at', NEW.acknowledged_at,
      'old_resolved_by', OLD.resolved_by,
      'new_resolved_by', NEW.resolved_by,
      'old_resolved_at', OLD.resolved_at,
      'new_resolved_at', NEW.resolved_at
    );
  END IF;

  -- Insert audit log entry
  INSERT INTO public.request_audit_log (
    request_id,
    tenant_id,
    action,
    actor_id,
    actor_name,
    actor_role,
    room_id,
    room_name,
    changes,
    timestamp
  ) VALUES (
    NEW.id,
    v_tenant_id,
    v_action,
    auth.uid(),
    (SELECT full_name FROM public.user_profiles WHERE id = auth.uid()),
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()),
    v_room_id,
    v_room_name,
    v_changes,
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on UPDATE (for status changes, acknowledgments, resolutions)
DROP TRIGGER IF EXISTS trigger_request_audit_update ON public.requests;
CREATE TRIGGER trigger_request_audit_update
  AFTER UPDATE ON public.requests
  FOR EACH ROW
  WHEN (
    -- Only log if something meaningful changed
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.acknowledged_by IS DISTINCT FROM NEW.acknowledged_by OR
    OLD.resolved_by IS DISTINCT FROM NEW.resolved_by
  )
  EXECUTE FUNCTION public.log_request_audit();

-- Trigger on INSERT (for request creation)
DROP TRIGGER IF EXISTS trigger_request_audit_insert ON public.requests;
CREATE TRIGGER trigger_request_audit_insert
  AFTER INSERT ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_request_audit();
