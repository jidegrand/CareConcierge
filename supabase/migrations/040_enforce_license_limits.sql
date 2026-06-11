-- Server-side enforcement of tenant_licenses capacity limits.
--
-- Previously site_limit / unit_limit / room_limit / user_limit were stored on
-- tenant_licenses and shown as usage bars in the tenant licensing page, but
-- nothing blocked creation past the configured limit (LICENSING_ACTION_PLAN #1).
-- A NULL limit means "unlimited" and is left unenforced, matching the existing
-- display logic in useLicenseUsage.

-- ── sites: enforce site_limit ───────────────────────────────────────────────
-- Statement-level trigger so multi-row inserts are checked against the final
-- count for the whole statement, not row-by-row.
CREATE OR REPLACE FUNCTION public.enforce_site_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  v_limit INTEGER;
  v_current INTEGER;
BEGIN
  FOR rec IN SELECT DISTINCT tenant_id FROM new_rows LOOP
    SELECT site_limit INTO v_limit FROM public.tenant_licenses WHERE tenant_id = rec.tenant_id;
    IF v_limit IS NOT NULL THEN
      SELECT count(*) INTO v_current FROM public.sites WHERE tenant_id = rec.tenant_id;
      IF v_current > v_limit THEN
        RAISE EXCEPTION 'Your organization has reached its site limit of %. Upgrade your plan to add more sites.', v_limit
          USING ERRCODE = 'LIC01';
      END IF;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_site_limit ON public.sites;
CREATE TRIGGER trg_enforce_site_limit
AFTER INSERT ON public.sites
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION public.enforce_site_limit();

-- ── units: enforce unit_limit (resolved via the parent site's tenant) ──────
CREATE OR REPLACE FUNCTION public.enforce_unit_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  v_limit INTEGER;
  v_current INTEGER;
BEGIN
  FOR rec IN
    SELECT DISTINCT s.tenant_id
    FROM new_rows nr
    JOIN public.sites s ON s.id = nr.site_id
  LOOP
    SELECT unit_limit INTO v_limit FROM public.tenant_licenses WHERE tenant_id = rec.tenant_id;
    IF v_limit IS NOT NULL THEN
      SELECT count(*) INTO v_current
      FROM public.units u
      JOIN public.sites s ON s.id = u.site_id
      WHERE s.tenant_id = rec.tenant_id;

      IF v_current > v_limit THEN
        RAISE EXCEPTION 'Your organization has reached its unit limit of %. Upgrade your plan to add more units.', v_limit
          USING ERRCODE = 'LIC01';
      END IF;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_unit_limit ON public.units;
CREATE TRIGGER trg_enforce_unit_limit
AFTER INSERT ON public.units
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION public.enforce_unit_limit();

-- ── rooms: enforce room_limit (resolved via unit -> site -> tenant) ────────
-- createRoomsFromTemplate inserts many rooms in a single statement, so this
-- must be statement-level to evaluate the final count once.
CREATE OR REPLACE FUNCTION public.enforce_room_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  v_limit INTEGER;
  v_current INTEGER;
BEGIN
  FOR rec IN
    SELECT DISTINCT s.tenant_id
    FROM new_rows nr
    JOIN public.units u ON u.id = nr.unit_id
    JOIN public.sites s ON s.id = u.site_id
  LOOP
    SELECT room_limit INTO v_limit FROM public.tenant_licenses WHERE tenant_id = rec.tenant_id;
    IF v_limit IS NOT NULL THEN
      SELECT count(*) INTO v_current
      FROM public.rooms r
      JOIN public.units u ON u.id = r.unit_id
      JOIN public.sites s ON s.id = u.site_id
      WHERE s.tenant_id = rec.tenant_id;

      IF v_current > v_limit THEN
        RAISE EXCEPTION 'Your organization has reached its room limit of %. Upgrade your plan to add more rooms.', v_limit
          USING ERRCODE = 'LIC01';
      END IF;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_room_limit ON public.rooms;
CREATE TRIGGER trg_enforce_room_limit
AFTER INSERT ON public.rooms
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION public.enforce_room_limit();

-- ── pending_invites: enforce user_limit at invite time ──────────────────────
-- user_limit is enforced when a seat is *claimed* (an invite is created),
-- not when the invited user later accepts and their user_profiles row is
-- bootstrapped — that keeps the failure at the point an admin takes the
-- action, with a message the invite-user edge function can surface directly.
--
-- Row-level trigger: the invite flow always upserts a single row
-- (onConflict: 'email'). Re-inviting an existing pending email must not
-- double-count, so the existing pending_invites row for NEW.email is
-- excluded from the "current usage" count before adding NEW back in.
CREATE OR REPLACE FUNCTION public.enforce_user_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
  v_current INTEGER;
BEGIN
  SELECT user_limit INTO v_limit FROM public.tenant_licenses WHERE tenant_id = NEW.tenant_id;
  IF v_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    (SELECT count(*) FROM public.user_profiles WHERE tenant_id = NEW.tenant_id AND active = true)
    + (SELECT count(*) FROM public.pending_invites WHERE tenant_id = NEW.tenant_id AND lower(email) <> lower(NEW.email))
  INTO v_current;

  IF v_current + 1 > v_limit THEN
    RAISE EXCEPTION 'Your organization has reached its user limit of %. Upgrade your plan to invite more users.', v_limit
      USING ERRCODE = 'LIC01';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_user_limit ON public.pending_invites;
CREATE TRIGGER trg_enforce_user_limit
BEFORE INSERT OR UPDATE ON public.pending_invites
FOR EACH ROW
EXECUTE FUNCTION public.enforce_user_limit();
