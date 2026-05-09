import { renderHook, act, waitFor } from '@testing-library/react'
import { TenantProvider, useTenantContext } from '../useTenantContext'
import { supabase } from '@/lib/supabase'
import React from 'react'

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('useTenantContext', () => {
  const mockTenantId = 'tenant-123'
  const mockTenant = {
    id: mockTenantId,
    name: 'Test Organization',
    slug: 'test-org',
    created_at: '2024-01-01',
  }
  const mockSettings = {
    id: 'settings-1',
    tenant_id: mockTenantId,
    logo_url: 'https://example.com/logo.png',
    primary_color: '#2E75B6',
    secondary_color: '#1F4788',
    default_language: 'en',
    enable_patient_feedback: true,
    enable_qr_codes: true,
    onboarding_completed: false,
    onboarding_step: 'step_organization',
    settings: {},
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should provide tenant context', async () => {
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: mockTenant, error: null }),
    })

    const mockSettingsSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: mockSettings, error: null }),
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'tenants') {
        return { select: mockSelect } as any
      }
      if (table === 'tenant_settings') {
        return { select: mockSettingsSelect } as any
      }
      return {} as any
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TenantProvider tenantId={mockTenantId}>{children}</TenantProvider>
    )

    const { result } = renderHook(() => useTenantContext(), { wrapper })

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.tenant).toBeDefined()
    expect(result.current.tenant?.name).toBe('Test Organization')
    expect(result.current.settings).toBeDefined()
    expect(result.current.settings?.logo_url).toBe('https://example.com/logo.png')
  })

  it('should handle context errors', async () => {
    const mockError = new Error('Network error')
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: mockError }),
    })

    mockSupabase.from.mockReturnValue({ select: mockSelect } as any)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TenantProvider tenantId={mockTenantId}>{children}</TenantProvider>
    )

    const { result } = renderHook(() => useTenantContext(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
  })

  it('should update settings', async () => {
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: mockTenant, error: null }),
    })

    const mockSettingsSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: mockSettings, error: null }),
    })

    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'tenants') {
        return { select: mockSelect } as any
      }
      if (table === 'tenant_settings') {
        return { select: mockSettingsSelect, update: mockUpdate } as any
      }
      return {} as any
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TenantProvider tenantId={mockTenantId}>{children}</TenantProvider>
    )

    const { result } = renderHook(() => useTenantContext(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const newSettings = { ...mockSettings, primary_color: '#FF0000' }

    await act(async () => {
      await result.current.updateSettings(newSettings)
    })

    expect(mockUpdate).toHaveBeenCalled()
  })

  it('should refresh tenant data', async () => {
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: mockTenant, error: null }),
    })

    const mockSettingsSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: mockSettings, error: null }),
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'tenants') {
        return { select: mockSelect } as any
      }
      if (table === 'tenant_settings') {
        return { select: mockSettingsSelect } as any
      }
      return {} as any
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TenantProvider tenantId={mockTenantId}>{children}</TenantProvider>
    )

    const { result } = renderHook(() => useTenantContext(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const initialCallCount = mockSelect.mock.calls.length

    await act(async () => {
      await result.current.refreshTenant()
    })

    expect(mockSelect.mock.calls.length).toBeGreaterThan(initialCallCount)
  })

  it('should throw error when used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    expect(() => {
      renderHook(() => useTenantContext())
    }).toThrow('useTenantContext must be used within TenantProvider')

    consoleSpy.mockRestore()
  })
})
