import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Site } from '@/types'

export interface SiteWithUnitCount extends Site {
  unitCount?: number
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export function useTenantSites(tenantId: string | undefined) {
  const [sites, setSites] = useState<SiteWithUnitCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!tenantId) {
      setSites([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)

      // Fetch sites with unit count
      const { data: sitesData, error: sitesErr } = await supabase
        .from('sites')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name')

      if (sitesErr) throw new Error(sitesErr.message)

      // Get unit counts for each site
      const sitesWithCounts = await Promise.all(
        (sitesData ?? []).map(async (site: Site) => {
          const { count, error: countErr } = await supabase
            .from('units')
            .select('id', { count: 'exact', head: true })
            .eq('site_id', site.id)

          if (countErr) return { ...site, unitCount: 0 }
          return { ...site, unitCount: count ?? 0 }
        })
      )

      setSites(sitesWithCounts as SiteWithUnitCount[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sites')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { fetch() }, [fetch])

  const createSite = async (name: string, data?: Partial<Site>) => {
    if (!tenantId) throw new Error('No tenant ID')
    try {
      const slug = slugify(name)
      const { error: err } = await supabase.from('sites').insert({
        tenant_id: tenantId,
        name,
        slug,
        address: data?.address || '',
        city: data?.city || '',
        state: data?.state || '',
        zip: data?.zip || '',
        phone: data?.phone || '',
      })
      if (err) throw new Error(err.message)
      await fetch()
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create site')
    }
  }

  const updateSite = async (id: string, name: string, data?: Partial<Site>) => {
    try {
      const slug = slugify(name)
      const { error: err } = await supabase.from('sites').update({
        name,
        slug,
        address: data?.address || '',
        city: data?.city || '',
        state: data?.state || '',
        zip: data?.zip || '',
        phone: data?.phone || '',
      }).eq('id', id)
      if (err) throw new Error(err.message)
      await fetch()
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update site')
    }
  }

  const deleteSite = async (id: string) => {
    try {
      const { error: err } = await supabase.from('sites').delete().eq('id', id)
      if (err) throw new Error(err.message)
      await fetch()
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete site')
    }
  }

  return {
    sites, loading, error, refresh: fetch,
    createSite, updateSite, deleteSite,
  }
}
