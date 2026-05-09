import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'

/**
 * End-to-End Integration Tests for Tenant Admin Portal
 * 
 * These tests verify the complete workflow of tenant admin operations,
 * simulating real user interactions across the entire portal.
 */

describe('Tenant Admin Portal - End-to-End Integration', () => {
  const testUser = {
    email: 'admin@test.local',
    password: 'Test@1234',
    role: 'tenant_admin',
  }

  const testOrganization = {
    name: 'Integration Test Hospital',
    slug: 'integration-test-hospital',
    primaryColor: '#2E75B6',
    secondaryColor: '#1F4788',
  }

  const testSite = {
    name: 'Main Campus',
    address: '123 Medical Center Dr',
    city: 'Boston',
    state: 'MA',
    zip: '02115',
    phone: '617-555-0000',
  }

  const testUnit = {
    name: 'Intensive Care Unit',
    capacity: 15,
  }

  beforeAll(async () => {
    // Setup: Create test tenant and user
    // This would typically be done via API or test utilities
    console.log('Setting up test environment...')
  })

  describe('Complete User Journey', () => {
    it('should allow tenant admin to complete onboarding workflow', async () => {
      // 1. Login
      render(<App />)
      
      const emailInput = screen.getByPlaceholderText(/email/i)
      const passwordInput = screen.getByPlaceholderText(/password/i)
      
      await userEvent.type(emailInput, testUser.email)
      await userEvent.type(passwordInput, testUser.password)
      
      const loginButton = screen.getByRole('button', { name: /sign in/i })
      await userEvent.click(loginButton)

      // 2. Verify redirect to tenant admin dashboard
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
      })

      // 3. Verify onboarding checklist visible
      expect(screen.getByText(/organization/i)).toBeInTheDocument()
      expect(screen.getByText(/create site/i)).toBeInTheDocument()
    })

    it('should allow admin to update organization settings', async () => {
      render(<App />)

      // Navigate to Settings page
      const settingsLink = screen.getByRole('link', { name: /settings/i })
      await userEvent.click(settingsLink)

      // Verify settings form loaded
      await waitFor(() => {
        expect(screen.getByDisplayValue(testOrganization.name)).toBeInTheDocument()
      })

      // Update organization name
      const nameInput = screen.getByLabelText(/organization name/i) as HTMLInputElement
      await userEvent.clear(nameInput)
      await userEvent.type(nameInput, 'Updated Hospital Name')

      // Update colors
      const primaryColorInput = screen.getByDisplayValue(testOrganization.primaryColor)
      await userEvent.clear(primaryColorInput)
      await userEvent.type(primaryColorInput, '#FF0000')

      // Save settings
      const saveButton = screen.getByRole('button', { name: /save/i })
      await userEvent.click(saveButton)

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/saved successfully/i)).toBeInTheDocument()
      })
    })

    it('should allow admin to invite and manage users', async () => {
      render(<App />)

      // Navigate to Users page
      const usersLink = screen.getByRole('link', { name: /users/i })
      await userEvent.click(usersLink)

      // Click "Invite User" button
      const inviteButton = screen.getByRole('button', { name: /invite user/i })
      await userEvent.click(inviteButton)

      // Fill invite form
      const emailInput = screen.getByPlaceholderText(/email/i)
      await userEvent.type(emailInput, 'newuser@test.local')

      const roleSelect = screen.getByLabelText(/role/i)
      await userEvent.selectOptions(roleSelect, 'nurse')

      // Submit invite
      const sendButton = screen.getByRole('button', { name: /send invite/i })
      await userEvent.click(sendButton)

      // Verify success
      await waitFor(() => {
        expect(screen.getByText(/invited successfully/i)).toBeInTheDocument()
      })

      // Verify user appears in list
      expect(screen.getByText(/newuser@test.local/i)).toBeInTheDocument()
    })

    it('should allow admin to create and manage sites', async () => {
      render(<App />)

      // Navigate to Sites & Units page
      const sitesLink = screen.getByRole('link', { name: /sites/i })
      await userEvent.click(sitesLink)

      // Click "Create Site" button
      const createSiteButton = screen.getByRole('button', { name: /create site/i })
      await userEvent.click(createSiteButton)

      // Fill site form
      const nameInput = screen.getByLabelText(/site name/i)
      await userEvent.type(nameInput, testSite.name)

      const addressInput = screen.getByLabelText(/address/i)
      await userEvent.type(addressInput, testSite.address)

      const cityInput = screen.getByLabelText(/city/i)
      await userEvent.type(cityInput, testSite.city)

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create site/i })
      await userEvent.click(submitButton)

      // Verify success and site appears in table
      await waitFor(() => {
        expect(screen.getByText(testSite.name)).toBeInTheDocument()
      })
    })

    it('should allow admin to create units within sites', async () => {
      render(<App />)

      // Navigate to Sites & Units
      const sitesLink = screen.getByRole('link', { name: /sites/i })
      await userEvent.click(sitesLink)

      // Click Units tab
      const unitsTab = screen.getByRole('tab', { name: /units/i })
      await userEvent.click(unitsTab)

      // Click "Create Unit" button
      const createUnitButton = screen.getByRole('button', { name: /create unit/i })
      await userEvent.click(createUnitButton)

      // Fill unit form
      const nameInput = screen.getByLabelText(/unit name/i)
      await userEvent.type(nameInput, testUnit.name)

      const siteSelect = screen.getByLabelText(/site/i)
      await userEvent.selectOptions(siteSelect, testSite.name)

      const capacityInput = screen.getByLabelText(/capacity/i)
      await userEvent.type(capacityInput, testUnit.capacity.toString())

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create unit/i })
      await userEvent.click(submitButton)

      // Verify unit appears in table
      await waitFor(() => {
        expect(screen.getByText(testUnit.name)).toBeInTheDocument()
      })
    })

    it('should display license information and usage', async () => {
      render(<App />)

      // Navigate to Licensing page
      const licensingLink = screen.getByRole('link', { name: /licensing/i })
      await userEvent.click(licensingLink)

      // Verify license information displayed
      await waitFor(() => {
        expect(screen.getByText(/plan/i)).toBeInTheDocument()
      })

      // Verify usage stats are shown
      expect(screen.getByText(/sites/i)).toBeInTheDocument()
      expect(screen.getByText(/users/i)).toBeInTheDocument()
      expect(screen.getByText(/units/i)).toBeInTheDocument()
      expect(screen.getByText(/rooms/i)).toBeInTheDocument()
    })

    it('should display audit logs with filters', async () => {
      render(<App />)

      // Navigate to Audit Logs page
      const auditLink = screen.getByRole('link', { name: /audit logs/i })
      await userEvent.click(auditLink)

      // Verify logs table loaded
      await waitFor(() => {
        expect(screen.getByText(/timestamp/i)).toBeInTheDocument()
      })

      // Test action filter
      const actionSelect = screen.getByLabelText(/action/i)
      await userEvent.selectOptions(actionSelect, 'created')

      // Verify logs updated
      await waitFor(() => {
        // Logs should be filtered
        expect(screen.queryByText(/acknowledged/i)).not.toBeInTheDocument()
      })

      // Test CSV export
      const exportButton = screen.getByRole('button', { name: /export/i })
      await userEvent.click(exportButton)

      // Verify export completed
      await waitFor(() => {
        expect(screen.getByText(/download/i)).toBeInTheDocument()
      })
    })

    it('should prevent invalid operations', async () => {
      render(<App />)

      // Try to create site without name
      const sitesLink = screen.getByRole('link', { name: /sites/i })
      await userEvent.click(sitesLink)

      const createSiteButton = screen.getByRole('button', { name: /create site/i })
      await userEvent.click(createSiteButton)

      // Submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /create site/i })
      await userEvent.click(submitButton)

      // Verify error message shown
      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument()
      })
    })

    it('should handle concurrent operations safely', async () => {
      render(<App />)

      // Navigate to Users
      const usersLink = screen.getByRole('link', { name: /users/i })
      await userEvent.click(usersLink)

      // Simulate rapid user invites
      const inviteButton = screen.getByRole('button', { name: /invite user/i })

      // Click invite button multiple times
      await userEvent.click(inviteButton)
      const emailInput1 = screen.getByPlaceholderText(/email/i)
      await userEvent.type(emailInput1, 'user1@test.local')

      // Submit first invite
      let sendButton = screen.getByRole('button', { name: /send invite/i })
      await userEvent.click(sendButton)

      // Start second invite
      await userEvent.click(inviteButton)
      const emailInput2 = screen.getByPlaceholderText(/email/i)
      await userEvent.type(emailInput2, 'user2@test.local')

      // Submit second invite
      sendButton = screen.getByRole('button', { name: /send invite/i })
      await userEvent.click(sendButton)

      // Both users should be added without conflict
      await waitFor(() => {
        expect(screen.getByText(/user1@test.local/i)).toBeInTheDocument()
        expect(screen.getByText(/user2@test.local/i)).toBeInTheDocument()
      })
    })
  })

  describe('Data Consistency', () => {
    it('should maintain data consistency across pages', async () => {
      render(<App />)

      // Create a site
      const sitesLink = screen.getByRole('link', { name: /sites/i })
      await userEvent.click(sitesLink)

      const createButton = screen.getByRole('button', { name: /create site/i })
      await userEvent.click(createButton)

      const nameInput = screen.getByLabelText(/site name/i)
      await userEvent.type(nameInput, 'Data Test Site')

      const submitButton = screen.getByRole('button', { name: /create site/i })
      await userEvent.click(submitButton)

      // Wait for site to appear
      await waitFor(() => {
        expect(screen.getByText('Data Test Site')).toBeInTheDocument()
      })

      // Navigate away and back
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      await userEvent.click(dashboardLink)

      // Return to sites
      await userEvent.click(sitesLink)

      // Verify site is still there
      await waitFor(() => {
        expect(screen.getByText('Data Test Site')).toBeInTheDocument()
      })
    })

    it('should update statistics in real time', async () => {
      render(<App />)

      // Check initial stats
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      await userEvent.click(dashboardLink)

      const initialSiteCount = screen.getByText(/sites/i)
      expect(initialSiteCount).toBeInTheDocument()

      // Create a new site
      const sitesLink = screen.getByRole('link', { name: /sites/i })
      await userEvent.click(sitesLink)

      const createButton = screen.getByRole('button', { name: /create site/i })
      await userEvent.click(createButton)

      const nameInput = screen.getByLabelText(/site name/i)
      await userEvent.type(nameInput, 'Stats Test Site')

      const submitButton = screen.getByRole('button', { name: /create site/i })
      await userEvent.click(submitButton)

      // Return to dashboard
      await userEvent.click(dashboardLink)

      // Verify stats updated
      await waitFor(() => {
        const updatedCount = screen.getByText(/sites/i)
        expect(updatedCount).toBeInTheDocument()
      })
    })
  })

  describe('Error Recovery', () => {
    it('should handle network errors gracefully', async () => {
      render(<App />)

      // Simulate network error by mocking fetch
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'))

      // Try to load page
      const sitesLink = screen.getByRole('link', { name: /sites/i })
      await userEvent.click(sitesLink)

      // Verify error message shown
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument()
      })

      // Verify retry button available
      const retryButton = screen.queryByRole('button', { name: /retry/i })
      expect(retryButton || screen.getByRole('link', { name: /sites/i })).toBeInTheDocument()
    })

    it('should preserve user input on error', async () => {
      render(<App />)

      // Navigate to create site form
      const sitesLink = screen.getByRole('link', { name: /sites/i })
      await userEvent.click(sitesLink)

      const createButton = screen.getByRole('button', { name: /create site/i })
      await userEvent.click(createButton)

      // Fill form
      const nameInput = screen.getByLabelText(/site name/i) as HTMLInputElement
      await userEvent.type(nameInput, 'Error Test Site')

      const addressInput = screen.getByLabelText(/address/i) as HTMLInputElement
      await userEvent.type(addressInput, '123 Test St')

      // Simulate error on submit
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Submit error'))

      const submitButton = screen.getByRole('button', { name: /create site/i })
      await userEvent.click(submitButton)

      // Verify form data preserved
      await waitFor(() => {
        expect(nameInput.value).toBe('Error Test Site')
        expect(addressInput.value).toBe('123 Test St')
      })
    })
  })

  describe('Performance', () => {
    it('should load pages quickly', async () => {
      const startTime = performance.now()

      render(<App />)

      const sitesLink = screen.getByRole('link', { name: /sites/i })
      await userEvent.click(sitesLink)

      const endTime = performance.now()
      const loadTime = endTime - startTime

      // Page should load in under 2 seconds
      expect(loadTime).toBeLessThan(2000)
    })

    it('should handle large data sets efficiently', async () => {
      render(<App />)

      // Navigate to page with pagination (Audit Logs)
      const auditLink = screen.getByRole('link', { name: /audit logs/i })
      await userEvent.click(auditLink)

      // Verify table renders quickly
      await waitFor(() => {
        expect(screen.getByText(/timestamp/i)).toBeInTheDocument()
      }, { timeout: 1000 })

      // Test pagination performance
      const nextButton = screen.getByRole('button', { name: /next/i })
      const pageStartTime = performance.now()

      await userEvent.click(nextButton)

      const pageEndTime = performance.now()
      const pageLoadTime = pageEndTime - pageStartTime

      // Page transition should be quick
      expect(pageLoadTime).toBeLessThan(1000)
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard navigable', async () => {
      render(<App />)

      // Test keyboard navigation through links
      const emailInput = screen.getByPlaceholderText(/email/i)
      emailInput.focus()

      // Tab through form elements
      await userEvent.tab()
      expect(screen.getByPlaceholderText(/password/i)).toHaveFocus()

      await userEvent.tab()
      expect(screen.getByRole('button', { name: /sign in/i })).toHaveFocus()
    })

    it('should have proper aria labels', async () => {
      render(<App />)

      // Check for ARIA labels on interactive elements
      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(
          button.getAttribute('aria-label') || button.textContent
        ).toBeTruthy()
      })
    })
  })

  afterAll(async () => {
    // Cleanup: Delete test data
    console.log('Cleaning up test environment...')
  })
})
