-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: resolver profile join
-- Run in Supabase SQL Editor after schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Allow nurses to read profiles of users in their tenant
-- (needed so the resolver name appears in resolved rows)
CREATE POLICY "profiles_select_same_tenant" ON user_profiles
  FOR SELECT USING (
    tenant_id = current_tenant_id()
  );

-- Index to speed up resolved_by lookups
CREATE INDEX IF NOT EXISTS idx_requests_resolved_by ON requests(resolved_by);
CREATE INDEX IF NOT EXISTS idx_requests_resolved_at ON requests(resolved_at DESC);
