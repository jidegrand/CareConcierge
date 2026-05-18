import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0'

interface ResetRequest {
  email?: string
  currentOrigin?: string
}

interface AuthUser {
  id: string
  email?: string
}

interface ProfileTenantRow {
  tenant_id: string
  tenant?: { slug: string } | Array<{ slug: string }> | null
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'admin', 'api', 'care'])

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

function getProtocol(value: string | undefined) {
  if (!value) return 'https:'
  try {
    return new URL(value).protocol === 'http:' ? 'http:' : 'https:'
  } catch {
    return 'https:'
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

function buildTenantUrl(slug: string, path: string, currentOrigin?: string) {
  const normalizedPath = normalizePath(path)
  const requestedHost = getHostname(currentOrigin)

  if (currentOrigin && requestedHost && isLocalhost(requestedHost)) {
    return `${currentOrigin.replace(/\/$/, '')}${normalizedPath}`
  }

  const appUrl = Deno.env.get('APP_URL') ?? Deno.env.get('SITE_URL') ?? undefined
  const tenantRootDomain = (
    Deno.env.get('TENANT_ROOT_DOMAIN') ??
    Deno.env.get('ROOT_DOMAIN') ??
    deriveRootDomain(appUrl)
  )?.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()

  if (currentOrigin && requestedHost && isTenantHost(requestedHost, tenantRootDomain ?? null)) {
    return `${currentOrigin.replace(/\/$/, '')}${normalizedPath}`
  }

  if (tenantRootDomain) {
    return `https://${slug}.${tenantRootDomain}${normalizedPath}`
  }

  if (appUrl) {
    return `${appUrl.replace(/\/$/, '')}${normalizedPath}`
  }

  return undefined
}

function buildRootUrl(path: string, currentOrigin?: string) {
  const normalizedPath = normalizePath(path)
  const requestedHost = getHostname(currentOrigin)

  if (currentOrigin && requestedHost && isLocalhost(requestedHost)) {
    return `${currentOrigin.replace(/\/$/, '')}${normalizedPath}`
  }

  const appUrl = Deno.env.get('APP_URL') ?? Deno.env.get('SITE_URL') ?? undefined
  return appUrl ? `${appUrl.replace(/\/$/, '')}${normalizedPath}` : undefined
}

async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error

    const user = data.users.find((entry: AuthUser) => entry.email?.toLowerCase() === email)
    if (user) return user
    if (!data.nextPage) return null
  }

  return null
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
      return json(500, { error: 'Password reset service is not configured.' })
    }

    const body = (await req.json()) as ResetRequest
    const email = normalizeEmail(body.email)

    // Keep the public response generic so email existence is never exposed.
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(200, { success: true })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const user = await findUserByEmail(admin, email)
    if (!user) {
      return json(200, { success: true })
    }

    const { data: profile } = await admin
      .from('user_profiles')
      .select('tenant_id, tenant:tenants(slug)')
      .eq('id', user.id)
      .maybeSingle()

    const profileRow = profile as ProfileTenantRow | null
    const tenant = Array.isArray(profileRow?.tenant) ? profileRow?.tenant[0] : profileRow?.tenant
    const redirectTo = tenant?.slug
      ? buildTenantUrl(tenant.slug, '/reset-password', body.currentOrigin)
      : buildRootUrl('/reset-password', body.currentOrigin)

    const { error: resetError } = await admin.auth.resetPasswordForEmail(email, { redirectTo })
    if (resetError) throw resetError

    return json(200, { success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to request password reset.'
    return json(500, { error: message })
  }
})
