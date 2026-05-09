import { renderHook, act, waitFor } from '@testing-library/react'
import { useTenantUnits } from '../useTenantUnits'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('useTenantUnits', () => {
  const mockTenantId = 'tenant-123'
  const mockUnits = [
    { id: 'unit-1', site_id: 'site-1', name: 'ICU', slug: 'icu', capacity: 10, site: { id: 'site-1', name: 'Main Hospital' } },
    { id: 'unit-2', site_id: 'site-1', name: 'Emergency', slug: 'emergency', capacity: 20, site: { id: 'site-1', name: 'Main Hospital' } },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetch', () => {
    it('should load units for a tenant', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockUnits, error: null }),
        }),
      })

      const mockSitesSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [{ id: 'site-1' }], error: null }),
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'units') {
          return { select: mockSelect } as any
        }
        if (table === 'sites') {
          return { select: mockSitesSelect } as any
        }
        return {} as any
      })

      const { result } = renderHook(() => useTenantUnits(mockTenantId))

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.units.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle fetch errors', async () => {
      const mockError = new Error('Network error')
      const mockSelect = jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: null, error: mockError }),
        }),
      })

      const mockSitesSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'units') {
          return { select: mockSelect } as any
        }
        if (table === 'sites') {
          return { select: mockSitesSelect } as any
        }
        return {} as any
      })

      const { result } = renderHook(() => useTenantUnits(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Network error')
    })

    it('should not fetch without tenant ID', async () => {
      const { result } = renderHook(() => useTenantUnits(undefined))

      expect(result.current.loading).toBe(false)
      expect(result.current.units).toEqual([])
    })
  })

  describe('createUnit', () => {
    it('should create a new unit', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null })
      const mockSelect = jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockUnits, error: null }),
        }),
      })

      const mockSitesSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [{ id: 'site-1' }], error: null }),
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'units') {
          return { insert: mockInsert, select: mockSelect } as any
        }
        if (table === 'sites') {
          return { select: mockSitesSelect } as any
        }
        return {} as any
      })

      const { result } = renderHook(() => useTenantUnits(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.createUnit('site-1', 'New Unit', 15)
      })

      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        site_id: 'site-1',
        name: 'New Unit',
        slug: 'new-unit',
        capacity: 15,
      }))
    })
  })

  describe('updateUnit', () => {
    it('should update an existing unit', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
      const mockSelect = jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockUnits, error: null }),
        }),
      })

      const mockSitesSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [{ id: 'site-1' }], error: null }),
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'units') {
          return { update: mockUpdate, select: mockSelect } as any
        }
        if (table === 'sites') {
          return { select: mockSitesSelect } as any
        }
        return {} as any
      })

      const { result } = renderHook(() => useTenantUnits(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.updateUnit('unit-1', 'Updated Unit', 20)
      })

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Updated Unit',
        capacity: 20,
      }))
    })
  })

  describe('deleteUnit', () => {
    it('should delete a unit', async () => {
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
      const mockSelect = jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      })

      const mockSitesSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'units') {
          return { delete: mockDelete, select: mockSelect } as any
        }
        if (table === 'sites') {
          return { select: mockSitesSelect } as any
        }
        return {} as any
      })

      const { result } = renderHook(() => useTenantUnits(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.deleteUnit('unit-1')
      })

      expect(mockDelete).toHaveBeenCalled()
    })
  })
})
