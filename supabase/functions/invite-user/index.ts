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

const ROLE_LABELS: Record<InviteRole, string> = {
  super_admin: 'Global Admin',
  tenant_admin: 'Tenant Admin',
  nurse_manager: 'Nurse Manager',
  site_manager: 'Site Manager',
  charge_nurse: 'Charge Nurse',
  nurse: 'Nurse',
  volunteer: 'Volunteer',
  viewer: 'Viewer',
}

const ACCESS_CHANGED_EMAIL_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Access changed</title></head>
<body style="margin:0;background:#0D1117;font-family:Arial,Helvetica,sans-serif;color:#E6EDF3;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0D1117;padding:32px 16px;"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#161B22;border:1px solid #30363D;border-radius:16px;overflow:hidden;"><tr><td style="padding:24px 28px;border-bottom:1px solid #30363D;"><div style="font-size:15px;font-weight:700;">Care <span style="color:#4DA6E8;">Concierge</span></div></td></tr><tr><td style="padding:30px 28px;"><h1 style="margin:0;font-size:24px;line-height:1.25;">Your access changed</h1><p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#8B949E;">Your Care Concierge role or site/unit scope was updated for {{ organization_name }}.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;background:#0D1117;border:1px solid #30363D;border-radius:12px;"><tr><td style="padding:16px 18px;font-size:14px;line-height:1.6;color:#E6EDF3;">Role: {{ role }}<br>Site: {{ site_name }}<br>Unit: {{ unit_name }}</td></tr></table></td></tr></table></td></tr></table></body></html>`

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function sendAccessChangedEmail(params: {
  to: string
  organizationName: string
  role: InviteRole
  siteName: string | null
  unitName: string | null
}) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not configured; skipping access-changed notification email')
    return
  }

  const fromAddress = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Care Concierge <no-reply@care.extendihealth.com>'
  const html = ACCESS_CHANGED_EMAIL_HTML
    .replaceAll('{{ organization_name }}', escapeHtml(params.organizationName))
    .replaceAll('{{ role }}', escapeHtml(ROLE_LABELS[params.role]))
    .replaceAll('{{ site_name }}', escapeHtml(params.siteName ?? 'All sites'))
    .replaceAll('{{ unit_name }}', escapeHtml(params.unitName ?? 'All units'))

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: params.to,
      subject: 'Your Care Concierge access changed',
      html,
    }),
  })

  if (!res.ok) {
    console.warn('Failed to send access-changed notification email', await res.text())
  }
}

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

    let siteName: string | null = null
    let unitName: string | null = null

    if (siteId) {
      const { data: site, error: siteError } = await admin
        .from('sites')
        .select('id, name, tenant_id')
        .eq('id', siteId)
        .single()

      if (siteError || !site || site.tenant_id !== tenantId) {
        return json(400, { error: 'Selected site does not belong to this organization.' })
      }
      siteName = site.name
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
      unitName = unit.name
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

    // Write the pending invite BEFORE calling inviteUserByEmail. inviteUserByEmail
    // creates the auth.users row synchronously, which fires a DB trigger that reads
    // pending_invites to assign the trusted role/tenant — if that row doesn't exist
    // yet, the trigger falls back to (and downgrades) the role from user metadata.
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

    // "User already registered" means the account exists — no invite email needed.
    // The pending_invites row we wrote above is consumed immediately by the
    // on_pending_invite_created_profile trigger, which promotes their profile to
    // the new role/tenant/scope. Notify them by email since they won't get an invite.
    const userAlreadyExists =
      inviteError?.message?.toLowerCase().includes('already registered') ?? false

    if (inviteError && !userAlreadyExists) {
      await admin.from('pending_invites').delete().eq('email', email)
      return json(400, { error: inviteError.message })
    }

    if (userAlreadyExists) {
      await sendAccessChangedEmail({
        to: email,
        organizationName: tenant.name,
        role,
        siteName,
        unitName,
      })
    }

    return json(200, { success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to send invite.'
    return json(400, { error: message })
  }
})
