import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuditLogs } from '../useAuditLogs'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('useAuditLogs', () => {
  const mockTenantId = 'tenant-123'
  const mockLogs = Array.from({ length: 60 }, (_, i) => ({
    id: `log-${i}`,
    request_id: `request-${i}`,
    tenant_id: mockTenantId,
    action: i % 3 === 0 ? 'created' : i % 3 === 1 ? 'acknowledged' : 'resolved',
    actor_id: `actor-${i % 5}`,
    actor_name: `User ${i % 5}`,
    actor_role: 'nurse',
    room_id: `room-${i % 10}`,
    room_name: `Room ${i % 10}`,
    changes: { old_status: 'pending', new_status: 'acknowledged' },
    notes: null,
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
  }))

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetch logs', () => {
    it('should load paginated audit logs', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: mockLogs.slice(0, 50),
              count: 100,
              error: null,
            }),
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({ select: mockSelect } as any)

      const { result } = renderHook(() => useAuditLogs(mockTenantId))

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.logs).toHaveLength(50)
      expect(result.current.totalCount).toBe(100)
      expect(result.current.page).toBe(1)
      expect(result.current.totalPages).toBe(2)
    })

    it('should apply action filter', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: mockLogs.filter(l => l.action === 'created').slice(0, 50),
              count: 20,
              error: null,
            }),
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({ select: mockSelect } as any)

      const { result } = renderHook(() => useAuditLogs(mockTenantId, { action: 'created' }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.logs.every(l => l.action === 'created')).toBe(true)
    })

    it('should apply date range filter', async () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: mockLogs.slice(0, 50),
                  count: 75,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({ select: mockSelect } as any)

      const { result } = renderHook(() => useAuditLogs(mockTenantId, {
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.logs.length).toBeGreaterThan(0)
    })

    it('should handle fetch errors', async () => {
      const mockError = new Error('Network error')
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: null,
              count: null,
              error: mockError,
            }),
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({ select: mockSelect } as any)

      const { result } = renderHook(() => useAuditLogs(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Network error')
      expect(result.current.logs).toEqual([])
    })
  })

  describe('pagination', () => {
    beforeEach(() => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: mockLogs.slice(0, 50),
              count: 100,
              error: null,
            }),
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({ select: mockSelect } as any)
    })

    it('should navigate to next page', async () => {
      const { result } = renderHook(() => useAuditLogs(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.page).toBe(1)

      await act(async () => {
        result.current.nextPage()
      })

      // Page should update after next page is called
      await waitFor(() => {
        expect(result.current.page).toBe(2)
      }, { timeout: 1000 })
    })

    it('should navigate to previous page', async () => {
      const { result } = renderHook(() => useAuditLogs(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Go to page 2
      await act(async () => {
        result.current.nextPage()
      })

      await waitFor(() => {
        expect(result.current.page).toBe(2)
      }, { timeout: 1000 })

      // Go back to page 1
      await act(async () => {
        result.current.prevPage()
      })

      await waitFor(() => {
        expect(result.current.page).toBe(1)
      }, { timeout: 1000 })
    })

    it('should not go before page 1', async () => {
      const { result } = renderHook(() => useAuditLogs(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.page).toBe(1)

      await act(async () => {
        result.current.prevPage()
      })

      expect(result.current.page).toBe(1)
    })
  })

  describe('export CSV', () => {
    it('should export logs as CSV', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: mockLogs,
          error: null,
        }),
      })

      mockSupabase.from.mockReturnValue({ select: mockSelect } as any)

      const { result } = renderHook(() => useAuditLogs(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Mock blob creation
      global.URL.createObjectURL = jest.fn()
      global.URL.revokeObjectURL = jest.fn()
      document.createElement = jest.fn((tag) => {
        if (tag === 'a') {
          return { click: jest.fn(), href: '', download: '' } as any
        }
        return document.createElement(tag)
      })

      const result_export = await result.current.exportAsCSV()

      expect(result_export.success).toBe(true)
    })

    it('should handle export errors', async () => {
      const mockError = new Error('Export failed')
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      })

      mockSupabase.from.mockReturnValue({ select: mockSelect } as any)

      const { result } = renderHook(() => useAuditLogs(mockTenantId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const result_export = await result.current.exportAsCSV()

      expect(result_export.success).toBe(false)
      expect(result_export.error).toContain('Export failed')
    })
  })
})
