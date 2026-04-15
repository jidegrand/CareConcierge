import OrganizationsPanel from '@/pages/platform/OrganizationsPanel'
import { useTenants } from '@/hooks/useAdminData'
import { usePlatformContext } from '@/pages/platform/usePlatformContext'

export default function PlatformOrganizationsPage() {
  const { selectedOrganizationId, setSelectedOrganizationId } = usePlatformContext()
  const {
    tenants,
    loading,
    error,
    createTenant,
    updateTenant,
    deleteTenant,
  } = useTenants(true)

  return (
    <OrganizationsPanel
      selectedOrganizationId={selectedOrganizationId}
      onSelectOrganization={setSelectedOrganizationId}
      organizations={tenants}
      loading={loading}
      error={error}
      createOrganization={createTenant}
      updateOrganization={updateTenant}
      deleteOrganization={deleteTenant}
    />
  )
}
