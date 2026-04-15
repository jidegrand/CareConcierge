-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 012: Add acknowledged_by to requests
-- Tracks which staff member acknowledged each patient request,
-- completing the full audit trail: submitted → acknowledged_by → resolved_by
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS acknowledged_by uuid,
  ADD CONSTRAINT requests_acknowledged_by_profile_fkey
    FOREIGN KEY (acknowledged_by) REFERENCES user_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_requests_acknowledged_by ON requests(acknowledged_by);
