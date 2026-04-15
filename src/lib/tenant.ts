export interface TenantIdentity {
  id: string
  name: string
  slug: string
}

const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'admin', 'api'])

function cleanHost(host: string) {
  return host.toLowerCase().split(':')[0]
}

function isIpAddress(host: string) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host)
}

export function getAppOrigin() {
  if (typeof window !== 'undefined') return window.location.origin
  return (import.meta.env.VITE_APP_URL as string | undefined) ?? ''
}

export function buildAppUrl(path: string) {
  const origin = getAppOrigin().replace(/\/$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${origin}${suffix}`
}

export function getTenantSlugFromHostname(hostname = typeof window !== 'undefined' ? window.location.hostname : '') {
  const host = cleanHost(hostname)
  const localDefault = import.meta.env.VITE_DEFAULT_TENANT_SLUG as string | undefined
  const rootDomain = (import.meta.env.VITE_ROOT_DOMAIN as string | undefined)?.toLowerCase()

  if (!host) return localDefault ?? null
  if (host === 'localhost' || host.endsWith('.localhost') || isIpAddress(host)) {
    return localDefault ?? null
  }

  if (rootDomain) {
    if (host === rootDomain) return null
    if (host.endsWith(`.${rootDomain}`)) {
      const subdomain = host.slice(0, -(`.${rootDomain}`).length)
      const slug = subdomain.split('.').find(Boolean) ?? null
      return slug && !RESERVED_SUBDOMAINS.has(slug) ? slug : null
    }
    return null
  }

  const parts = host.split('.')
  if (parts.length < 3) return null

  const slug = parts[0]
  return RESERVED_SUBDOMAINS.has(slug) ? null : slug
}
