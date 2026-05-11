/**
 * Extract subdomain from current hostname.
 * st-maryhospital.extendihealth.com → "st-maryhospital"
 * care.extendihealth.com            → "care"
 * extendihealth.com                 → undefined
 */
export function getSubdomain(): string | undefined {
  const hostname = window.location.hostname

  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+/.test(hostname)) {
    return undefined
  }

  const parts = hostname.split(':')[0].split('.')
  if (parts.length <= 2) return undefined

  return parts[0]
}

/**
 * Returns true when the current host is a tenant-scoped subdomain
 * (e.g. st-maryhospital.extendihealth.com).
 * Returns false for care.extendihealth.com, www, and bare domains.
 */
export function isTenantSubdomain(): boolean {
  const subdomain = getSubdomain()
  return !!subdomain && subdomain !== 'care' && subdomain !== 'www'
}

/**
 * Returns true for the admin/platform domain (care.extendihealth.com)
 * or any domain without a subdomain.
 */
export function isAdminSubdomain(): boolean {
  return !isTenantSubdomain()
}
