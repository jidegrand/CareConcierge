import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0'

type InviteRole =
  | 'super_admin'
  | 'tenant_admin'
  | 'nurse_manager'
  | 'site_manager'
  | 'charge_nurse'
  | 'nurse'
  | 'volunteer'
  | 'viewer'

interface InviteRequest {
  email?: string
  role?: InviteRole
  tenantId?: string
  siteId?: string | null
  unitId?: string | null
  redirectTo?: string
}

interface UserProfileRow {
  id: string
  tenant_id: string
  site_id: string | null
  unit_id: string | null
  role: InviteRole
  full_name: string | null
  active: boolean
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'admin', 'api', 'care'])

const ROLE_RANK: Record<InviteRole, number> = {
  super_admin: 0,
  tenant_admin: 0,
  nurse_manager: 1,
  site_manager: 1,
  charge_nurse: 1,
  nurse: 2,
  volunteer: 3,
  viewer: 3,
}

const INVITABLE_ROLES = new Set<InviteRole>([
  'super_admin',
  'tenant_admin',
  'nurse_manager',
  'site_manager',
  'charge_nurse',
  'nurse',
  'volunteer',
  'viewer',
])

const INVITER_ROLES = new Set<InviteRole>([
  'super_admin',
  'tenant_admin',
  'nurse_manager',
  'site_manager',
])

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function requireUuid(value: string | null | undefined, label: string) {
  if (!value) return null
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${label} is not a valid UUID.`)
  }
  return value
}

function normalizePath(path: string) {
  return path.startsWith('/') ? path : `/${path}`
}

function getHostname(value: string | undefined) {
  if (!value) return null
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return null
  }
}

function isLocalhost(hostname: string) {
  return hostname === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
}

function isTenantHost(hostname: string, tenantRootDomain: string | null) {
  if (isLocalhost(hostname)) return false
  const parts = hostname.split('.')
  const firstLabel = parts[0]

  if (tenantRootDomain) {
    return hostname.endsWith(`.${tenantRootDomain}`) && !RESERVED_SUBDOMAINS.has(firstLabel)
  }

  return parts.length > 2 && !RESERVED_SUBDOMAINS.has(firstLabel)
}

function deriveRootDomain(appUrl: string | undefined) {
  const hostname = getHostname(appUrl)
  if (!hostname || isLocalhost(hostname)) return null

  const parts = hostname.split('.')
  if (parts.length <= 2) return hostname
  if (RESERVED_SUBDOMAINS.has(parts[0])) return parts.slice(1).join('.')
  return hostname
}

function buildRootUrl(path: string, requestedRedirect?: string) {
  const normalizedPath = normalizePath(path)
  const requestedHost = getHostname(requestedRedirect)

  if (requestedRedirect && requestedHost && isLocalhost(requestedHost)) {
    return `${requestedRedirect.replace(/\/$/, '').replace(/\/set-password$/, '')}${normalizedPath}`
  }

  const appUrl = Deno.env.get('APP_URL') ?? Deno.env.get('SITE_URL') ?? undefined
  return appUrl ? `${appUrl.replace(/\/$/, '').replace(/\/set-password$/, '')}${normalizedPath}` : undefined
}

function buildTenantUrl(slug: string, path: string, requestedRedirect?: string) {
  const normalizedPath = normalizePath(path)
  const requestedHost = getHostname(requestedRedirect)

  if (requestedRedirect && requestedHost && isLocalhost(requestedHost)) {
    return `${requestedRedirect.replace(/\/$/, '').replace(/\/set-password$/, '')}${normalizedPath}`
  }

  const appUrl = Deno.env.get('APP_URL') ?? Deno.env.get('SITE_URL') ?? undefined
  const tenantRootDomain = (
    Deno.env.get('TENANT_ROOT_DOMAIN') ??
    Deno.env.get('ROOT_DOMAIN') ??
    deriveRootDomain(appUrl)
  )?.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()

  if (requestedRedirect && requestedHost && isTenantHost(requestedHost, tenantRootDomain ?? null)) {
    return `${requestedRedirect.replace(/\/$/, '').replace(/\/set-password$/, '')}${normalizedPath}`
  }

  if (tenantRootDomain) {
    return `https://${slug}.${tenantRootDomain}${normalizedPath}`
  }

  return buildRootUrl(path, requestedRedirect)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { error: 'Invite service is not configured.' })
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return json(401, { error: 'Missing authorization token.' })
    }

    const body = (await req.json()) as InviteRequest
    const email = normalizeEmail(body.email)
    const role = body.role
    const tenantId = requireUuid(body.tenantId, 'tenantId')
    let siteId = requireUuid(body.siteId, 'siteId')
    const unitId = requireUuid(body.unitId, 'unitId')
    const redirectTo = typeof body.redirectTo === 'string' && body.redirectTo.trim()
      ? body.redirectTo.trim()
      : undefined

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(400, { error: 'Enter a valid email address.' })
    }
    if (!role || !INVITABLE_ROLES.has(role)) {
      return json(400, { error: 'Invalid invite role.' })
    }
    if (!tenantId) {
      return json(400, { error: 'Tenant is required.' })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: authUser, error: authError } = await admin.auth.getUser(token)
    if (authError || !authUser.user) {
      console.warn('invite-user auth verification failed', authError?.message ?? 'No user returned')
      return json(401, { error: 'Your login session could not be verified. Sign out, sign back in, then send the invite again.' })
    }

    const { data: callerProfile, error: profileError } = await admin
      .from('user_profiles')
      .select('id, tenant_id, site_id, unit_id, role, full_name, active')
      .eq('id', authUser.user.id)
      .single()

    if (profileError || !callerProfile) {
      return json(403, { error: 'Only active administrators can invite users.' })
    }

    const caller = callerProfile as UserProfileRow
    if (!caller.active || !INVITER_ROLES.has(caller.role)) {
      return json(403, { error: 'Only active administrators can invite users.' })
    }
    if (caller.role !== 'super_admin' && caller.tenant_id !== tenantId) {
      return json(403, { error: 'You can only invite users into your own organization.' })
    }
    if (caller.role !== 'super_admin' && role === 'super_admin') {
      return json(403, { error: 'Only global admins can invite global admins.' })
    }
    if (ROLE_RANK[role] < ROLE_RANK[caller.role]) {
      return json(403, { error: 'You cannot invite a role above your own access level.' })
    }

    const { data: tenant, error: tenantError } = await admin
      .from('tenants')
      .select('id, name, slug')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return json(404, { error: 'Organization not found.' })
    }

    if (siteId) {
      const { data: site, error: siteError } = await admin
        .from('sites')
        .select('id, name, tenant_id')
        .eq('id', siteId)
        .single()

      if (siteError || !site || site.tenant_id !== tenantId) {
        return json(400, { error: 'Selected site does not belong to this organization.' })
      }
    }

    if (unitId) {
      const { data: unit, error: unitError } = await admin
        .from('units')
        .select('id, name, site_id, site:sites(id, tenant_id)')
        .eq('id', unitId)
        .single()

      const unitSite = Array.isArray(unit?.site) ? unit?.site[0] : unit?.site
      if (unitError || !unit || !unitSite || unitSite.tenant_id !== tenantId) {
        return json(400, { error: 'Selected unit does not belong to this organization.' })
      }
      if (siteId && unit.site_id !== siteId) {
        return json(400, { error: 'Selected unit does not belong to the selected site.' })
      }
      siteId = siteId ?? unit.site_id
    }

    if (caller.site_id) {
      if (siteId && siteId !== caller.site_id) {
        return json(403, { error: 'You can only invite users within your site scope.' })
      }
      siteId = caller.site_id
    }

    const inviteRedirectTo = role === 'super_admin'
      ? buildRootUrl('/set-password', redirectTo)
      : buildTenantUrl(tenant.slug, '/set-password', redirectTo)

    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteRedirectTo,
      data: {
        organization_name: tenant.name,
        organization_slug: tenant.slug,
        role,
        tenant_id: tenantId,
        site_id: siteId,
        unit_id: unitId,
        invited_by_name: caller.full_name,
        invited_by_email: authUser.user.email,
      },
    })

    // "User already registered" means the account exists — no invite email needed,
    // but we still upsert pending_invites so the DB trigger updates their profile.
    const userAlreadyExists =
      inviteError?.message?.toLowerCase().includes('already registered') ?? false

    if (inviteError && !userAlreadyExists) {
      return json(400, { error: inviteError.message })
    }

    const inviteRecord = {
      email,
      tenant_id: tenantId,
      site_id: siteId,
      unit_id: unitId,
      role,
      created_at: new Date().toISOString(),
    }

    const { error: pendingInviteError } = await admin
      .from('pending_invites')
      .upsert(inviteRecord, { onConflict: 'email' })

    if (pendingInviteError) {
      return json(400, { error: pendingInviteError.message })
    }

    return json(200, { success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to send invite.'
    return json(400, { error: message })
  }
})
