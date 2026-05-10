-- Migration: 036_add_tenant_slug.sql
-- Purpose: Add slug column to tenants table for subdomain-based routing
-- Date: 2026-05-09
-- Status: IN PROGRESS

-- ====================================================================
-- Step 1: Add slug column to tenants table
-- ====================================================================

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS slug VARCHAR(63) UNIQUE NOT NULL DEFAULT '';

-- ====================================================================
-- Step 2: Create index on slug for fast lookups
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- ====================================================================
-- Step 3: Backfill existing tenants with auto-generated slugs
-- ====================================================================

-- Generate slug from tenant name:
-- - Convert to lowercase
-- - Replace spaces with hyphens
-- - Remove special characters
-- - Replace consecutive hyphens with single hyphen
-- - Trim hyphens from start/end

UPDATE tenants
SET slug = LOWER(
  TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ),
    '-'
  )
)
WHERE slug = '' OR slug IS NULL;

-- ====================================================================
-- Step 4: Handle duplicate slugs (add numeric suffix)
-- ====================================================================

-- This handles the case where two organizations have the same name
-- Example: Both "General Hospital" would get "general-hospital" initially
-- Second one gets updated to "general-hospital-2"

WITH duplicates AS (
  SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
  FROM tenants
  WHERE slug IS NOT NULL
)
UPDATE tenants t
SET slug = duplicates.slug || '-' || duplicates.rn
FROM duplicates
WHERE t.id = duplicates.id AND duplicates.rn > 1;

-- ====================================================================
-- Step 5: Add NOT NULL constraint (after backfill, all should have values)
-- ====================================================================

ALTER TABLE tenants
ALTER COLUMN slug SET NOT NULL;

-- ====================================================================
-- Step 6: Add check constraint for valid slug format
-- ====================================================================

ALTER TABLE tenants
ADD CONSTRAINT tenants_slug_format CHECK (
  slug ~ '^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$'
);

-- ====================================================================
-- Verification Queries
-- ====================================================================

-- Check that all tenants have slugs
SELECT COUNT(*) as total_tenants,
       COUNT(CASE WHEN slug IS NOT NULL THEN 1 END) as with_slug,
       COUNT(CASE WHEN slug IS NULL THEN 1 END) as without_slug
FROM tenants;

-- Check for duplicate slugs (should be 0)
SELECT slug, COUNT(*) as count
FROM tenants
WHERE slug IS NOT NULL
GROUP BY slug
HAVING COUNT(*) > 1;

-- Sample of generated slugs
SELECT id, name, slug, created_at
FROM tenants
ORDER BY created_at DESC
LIMIT 10;

-- ====================================================================
-- Rollback Instructions (if needed)
-- ====================================================================

-- To rollback this migration, run:
-- ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_slug_format;
-- ALTER TABLE tenants DROP COLUMN IF EXISTS slug;
-- DROP INDEX IF EXISTS idx_tenants_slug;
