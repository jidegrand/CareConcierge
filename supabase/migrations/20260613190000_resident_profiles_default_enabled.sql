-- Enable resident profiles by default for newly created tenants
alter table public.tenant_settings
  alter column resident_profiles_enabled set default true;
