import { renderHook, act, waitFor } from '@testing-library/react'
import { useLicenseUsage } from '../useLicenseUsage'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('useLicenseUsage', () => {
  const mockTenantId = 'tenant-123'
  const mockLicense = {
    id: 'license-1',
    tenant_id: mockTenantId,
    plan: 'professional',
    status: 'active',
    starts_at: '2024-01-01',
    expires_at: '2024-12-31',
    site_limit: 10,
    unit_limit: 50,
    room_limit: 200,
    user_limit: 20,
    features: {
      patient_feedback: true,
      qr_codes: true,
      analytics: true,
      audit_logs: true,
      api_access: true,
      sso: false,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetch', () => {
    it('should load license usage data', async () => {
      const mockSitesSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [{ id: 'site-1' }], count: 1, error: null }),
      })

      const mockLicenseSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: mockLicense, error: null }),
      })

      const mockRpcUnits = jest.fn().mockResolvedValue({ data: { count: 5 }, error: null })
      const mockRpcRooms = jest.fn().mockResolvedValue({ data: { count: 30 }, error: null })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'sites') {
          return { select: mockSitesSelect } as any
        }
        if (table === 'user_profiles') {
          return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [], count: 2, error: null }) }) }) } as any
        }
        if (table === 'tenant_licenses') {
          return { select: mockLicenseSelect } as any
        }
        return {} as any
      })

      mockSupabase.rpc.mockImplementation((fn: string) => {
        if (fn === 'count_units_for_tenant') {
          return Promise.resolve({ data: { count: 5 }, error: null })
        }
        if (fn === 'count_rooms_for_tenant') {
          return Promise.resolve({ data: { count: 30 }, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { result } = renderHook(() => useLicenseUsage(mockTenantId))

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.usage).toBeDefined()
      expect(result.current.usage?.plan).toBe('professional')
      expect(result.current.usage?.status).toBe('active')
    })

    it('should handle fetch errors', async () => {
      const mockError = new Error('Network error')
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, count: null, error: mockError }),
      })

      mockSupabase.from.mockReturnValue({ select: mockSelect } as any)
      mockSupabase.rpc.mockResolvedValue({ data: null, error: mockError })

      const { result } = renderHook(() => useLicenseUsage(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.usage).toBeNull()
    })
  })

  describe('utility functions', () => {
    beforeEach(async () => {
      const mockSitesSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [{ id: 'site-1' }], count: 1, error: null }),
      })

      const mockLicenseSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: mockLicense, error: null }),
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'sites') {
          return { select: mockSitesSelect } as any
        }
        if (table === 'user_profiles') {
          return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [], count: 2, error: null }) }) }) } as any
        }
        if (table === 'tenant_licenses') {
          return { select: mockLicenseSelect } as any
        }
        return {} as any
      })

      mockSupabase.rpc.mockResolvedValue({ data: { count: 5 }, error: null })
    })

    it('should check if limit exceeded', async () => {
      const { result } = renderHook(() => useLicenseUsage(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Site count is 1, limit is 10 - not exceeded
      expect(result.current.isLimitExceeded('sites')).toBe(false)

      // Mock usage at limit
      if (result.current.usage) {
        result.current.usage.sites.current = 10
        expect(result.current.isLimitExceeded('sites')).toBe(true)
      }
    })

    it('should check if license expired', async () => {
      const expiredLicense = { ...mockLicense, expires_at: '2020-01-01' }
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: expiredLicense, error: null }),
      })

      mockSupabase.from.mockReturnValue({ select: mockSelect } as any)

      const { result } = renderHook(() => useLicenseUsage(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isExpired()).toBe(true)
    })

    it('should check if license expiring soon', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const soonExpireLicense = { ...mockLicense, expires_at: tomorrow.toISOString() }
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: soonExpireLicense, error: null }),
      })

      mockSupabase.from.mockReturnValue({ select: mockSelect } as any)

      const { result } = renderHook(() => useLicenseUsage(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isExpiringSoon(30)).toBe(true)
    })

    it('should check if feature available', async () => {
      const { result } = renderHook(() => useLicenseUsage(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.hasFeature('patient_feedback')).toBe(true)
      expect(result.current.hasFeature('sso')).toBe(false)
    })

    it('should check if can create more resources', async () => {
      const { result } = renderHook(() => useLicenseUsage(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Site count is 1, limit is 10
      expect(result.current.canCreateMore('sites')).toBe(true)
    })
  })
})
