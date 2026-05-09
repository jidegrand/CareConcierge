import { renderHook, act, waitFor } from '@testing-library/react'
import { useTenantSites } from '../useTenantSites'
import { supabase } from '@/lib/supabase'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('useTenantSites', () => {
  const mockTenantId = 'tenant-123'
  const mockSites = [
    { id: 'site-1', tenant_id: mockTenantId, name: 'Main Hospital', slug: 'main-hospital', address: '123 Main St', city: 'Boston', state: 'MA', zip: '02101', phone: '617-555-0000' },
    { id: 'site-2', tenant_id: mockTenantId, name: 'Branch Clinic', slug: 'branch-clinic', address: '456 Oak Ave', city: 'Cambridge', state: 'MA', zip: '02139', phone: '617-555-0001' },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetch', () => {
    it('should load sites for a tenant', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockSites, error: null }),
        }),
      })
      mockSupabase.from.mockReturnValue({ select: mockSelect } as any)

      const { result } = renderHook(() => useTenantSites(mockTenantId))

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.sites).toHaveLength(2)
      expect(result.current.sites[0].name).toBe('Main Hospital')
    })

    it('should handle fetch errors', async () => {
      const mockError = new Error('Network error')
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: null, error: mockError }),
        }),
      })
      mockSupabase.from.mockReturnValue({ select: mockSelect } as any)

      const { result } = renderHook(() => useTenantSites(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Network error')
      expect(result.current.sites).toEqual([])
    })

    it('should not fetch without tenant ID', async () => {
      const { result } = renderHook(() => useTenantSites(undefined))

      expect(result.current.loading).toBe(false)
      expect(result.current.sites).toEqual([])
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
  })

  describe('createSite', () => {
    it('should create a new site', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null })
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockSites, error: null }),
        }),
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'sites') {
          return {
            insert: mockInsert,
            select: mockSelect,
          } as any
        }
        return { select: mockSelect } as any
      })

      const { result } = renderHook(() => useTenantSites(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const newSite = { name: 'New Site', address: '789 Elm St', city: 'Boston', state: 'MA', zip: '02115', phone: '617-555-0002' }

      await act(async () => {
        await result.current.createSite(newSite.name, newSite)
      })

      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        tenant_id: mockTenantId,
        name: 'New Site',
        slug: 'new-site',
      }))
    })

    it('should handle create errors', async () => {
      const mockError = new Error('Invalid input')
      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: mockError })
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'sites') {
          return { insert: mockInsert, select: mockSelect } as any
        }
        return { select: mockSelect } as any
      })

      const { result } = renderHook(() => useTenantSites(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(async () => {
        await act(async () => {
          await result.current.createSite('New Site', {})
        })
      }).rejects.toThrow('Invalid input')
    })
  })

  describe('updateSite', () => {
    it('should update an existing site', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockSites, error: null }),
        }),
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'sites') {
          return { update: mockUpdate, select: mockSelect } as any
        }
        return { select: mockSelect } as any
      })

      const { result } = renderHook(() => useTenantSites(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.updateSite('site-1', 'Updated Name', { address: 'New Address' })
      })

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Updated Name',
        slug: 'updated-name',
      }))
    })
  })

  describe('deleteSite', () => {
    it('should delete a site', async () => {
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'sites') {
          return { delete: mockDelete, select: mockSelect } as any
        }
        return { select: mockSelect } as any
      })

      const { result } = renderHook(() => useTenantSites(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.deleteSite('site-1')
      })

      expect(mockDelete).toHaveBeenCalled()
    })

    it('should handle delete errors', async () => {
      const mockError = new Error('Cannot delete site with units')
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: mockError }),
      })
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'sites') {
          return { delete: mockDelete, select: mockSelect } as any
        }
        return { select: mockSelect } as any
      })

      const { result } = renderHook(() => useTenantSites(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(async () => {
        await act(async () => {
          await result.current.deleteSite('site-1')
        })
      }).rejects.toThrow('Cannot delete site with units')
    })
  })
})
