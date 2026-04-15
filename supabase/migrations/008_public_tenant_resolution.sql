-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 008: Resolve tenant context safely from a public subdomain slug
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.resolve_tenant_by_slug(target_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT t.id, t.name, t.slug
  FROM tenants t
  WHERE lower(t.slug) = lower(target_slug)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.resolve_tenant_by_slug(target_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT
)
LANGUAGE sql
STABLE
SET search_path = public, private, pg_temp
AS $$
  SELECT *
  FROM private.resolve_tenant_by_slug(target_slug);
$$;

GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.resolve_tenant_by_slug(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_tenant_by_slug(TEXT) TO anon, authenticated;
