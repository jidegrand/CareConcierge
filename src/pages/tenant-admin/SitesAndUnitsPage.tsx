import { useState } from 'react'
import { useTenantContext } from '@/hooks/useTenantContext'
import { useTenantSites } from '@/hooks/tenant/useTenantSites'
import { useTenantUnits } from '@/hooks/tenant/useTenantUnits'
import type { Site, Unit } from '@/types'

type TabType = 'sites' | 'units'

interface SiteFormData {
  name: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
}

interface UnitFormData {
  name: string
  siteId: string
  capacity: number
}

export default function SitesAndUnitsPage() {
  const { tenant } = useTenantContext()
  const { sites, loading: sitesLoading, error: sitesError, createSite, updateSite, deleteSite } = useTenantSites(tenant?.id)
  const { units, loading: unitsLoading, error: unitsError, createUnit, updateUnit, deleteUnit } = useTenantUnits(tenant?.id)

  const [activeTab, setActiveTab] = useState<TabType>('sites')
  const [showSiteModal, setShowSiteModal] = useState(false)
  const [showUnitModal, setShowUnitModal] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [siteFormError, setSiteFormError] = useState<string | null>(null)
  const [unitFormError, setUnitFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [siteFormData, setSiteFormData] = useState<SiteFormData>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
  })
  const [unitFormData, setUnitFormData] = useState<UnitFormData>({
    name: '',
    siteId: '',
    capacity: 0,
  })

  // ── Site Modal Handlers ────────────────────────────────────────────────
  const openCreateSiteModal = () => {
    setEditingSite(null)
    setSiteFormData({ name: '', address: '', city: '', state: '', zip: '', phone: '' })
    setSiteFormError(null)
    setShowSiteModal(true)
  }

  const openEditSiteModal = (site: Site) => {
    setEditingSite(site)
    setSiteFormData({
      name: site.name || '',
      address: site.address || '',
      city: site.city || '',
      state: site.state || '',
      zip: site.zip || '',
      phone: site.phone || '',
    })
    setSiteFormError(null)
    setShowSiteModal(true)
  }

  const closeSiteModal = () => {
    setShowSiteModal(false)
    setEditingSite(null)
    setSiteFormData({ name: '', address: '', city: '', state: '', zip: '', phone: '' })
    setSiteFormError(null)
  }

  const handleSiteFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSiteFormError(null)

    if (!siteFormData.name.trim()) {
      setSiteFormError('Site name is required')
      return
    }

    try {
      if (editingSite) {
        await updateSite(editingSite.id, siteFormData.name, siteFormData)
        setSuccessMessage('Site updated successfully')
      } else {
        await createSite(siteFormData.name, siteFormData)
        setSuccessMessage('Site created successfully')
      }
      closeSiteModal()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setSiteFormError(err instanceof Error ? err.message : 'Failed to save site')
    }
  }

  const handleDeleteSite = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this site? This will also delete all associated units and rooms.')) {
      return
    }
    try {
      setDeletingId(id)
      await deleteSite(id)
      setSuccessMessage('Site deleted successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setSiteFormError(err instanceof Error ? err.message : 'Failed to delete site')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Unit Modal Handlers ────────────────────────────────────────────────
  const openCreateUnitModal = () => {
    setEditingUnit(null)
    setUnitFormData({ name: '', siteId: sites[0]?.id || '', capacity: 0 })
    setUnitFormError(null)
    setShowUnitModal(true)
  }

  const openEditUnitModal = (unit: Unit) => {
    setEditingUnit(unit)
    setUnitFormData({
      name: unit.name || '',
      siteId: unit.site_id || '',
      capacity: unit.capacity || 0,
    })
    setUnitFormError(null)
    setShowUnitModal(true)
  }

  const closeUnitModal = () => {
    setShowUnitModal(false)
    setEditingUnit(null)
    setUnitFormData({ name: '', siteId: '', capacity: 0 })
    setUnitFormError(null)
  }

  const handleUnitFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUnitFormError(null)

    if (!unitFormData.name.trim()) {
      setUnitFormError('Unit name is required')
      return
    }

    if (!unitFormData.siteId) {
      setUnitFormError('Please select a site')
      return
    }

    try {
      if (editingUnit) {
        await updateUnit(editingUnit.id, unitFormData.name, unitFormData.capacity)
        setSuccessMessage('Unit updated successfully')
      } else {
        await createUnit(unitFormData.siteId, unitFormData.name, unitFormData.capacity)
        setSuccessMessage('Unit created successfully')
      }
      closeUnitModal()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setUnitFormError(err instanceof Error ? err.message : 'Failed to save unit')
    }
  }

  const handleDeleteUnit = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this unit? This will also delete all associated rooms.')) {
      return
    }
    try {
      setDeletingId(id)
      await deleteUnit(id)
      setSuccessMessage('Unit deleted successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setUnitFormError(err instanceof Error ? err.message : 'Failed to delete unit')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Sites & Units</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage your organization's physical locations
          </p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 rounded-lg border border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)] text-sm">
          ✓ {successMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab('sites')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'sites'
              ? 'text-[var(--clinical-blue)] border-[var(--clinical-blue)]'
              : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
          }`}
        >
          Sites ({sites.length})
        </button>
        <button
          onClick={() => setActiveTab('units')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'units'
              ? 'text-[var(--clinical-blue)] border-[var(--clinical-blue)]'
              : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
          }`}
        >
          Units ({units.length})
        </button>
      </div>

      {/* Sites Tab */}
      {activeTab === 'sites' && (
        <div className="space-y-4">
          <button
            onClick={openCreateSiteModal}
            className="px-4 py-2 bg-[var(--clinical-blue)] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
          >
            + Create Site
          </button>

          {sitesError && (
            <div className="p-4 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm">
              Error: {sitesError}
            </div>
          )}

          {sitesLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sites.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-secondary)]">
              No sites yet. Create your first site to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--surface-subtle)] border-b border-[var(--border)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                      City
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                      Units
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {sites.map((site) => (
                    <tr key={site.id} className="hover:bg-[var(--surface-subtle)] transition-colors">
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                        {site.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                        {site.address || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                        {site.city || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {site.unitCount || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditSiteModal(site)}
                          className="text-[var(--clinical-blue)] hover:underline font-medium text-sm mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSite(site.id)}
                          disabled={deletingId === site.id}
                          className="text-red-600 hover:underline font-medium text-sm disabled:opacity-50"
                        >
                          {deletingId === site.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Units Tab */}
      {activeTab === 'units' && (
        <div className="space-y-4">
          <button
            onClick={openCreateUnitModal}
            disabled={sites.length === 0}
            className="px-4 py-2 bg-[var(--clinical-blue)] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Create Unit
          </button>

          {sites.length === 0 && (
            <div className="p-4 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-700 text-sm">
              You need to create at least one site before creating units.
            </div>
          )}

          {unitsError && (
            <div className="p-4 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm">
              Error: {unitsError}
            </div>
          )}

          {unitsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : units.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-secondary)]">
              No units yet. Create your first unit to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--surface-subtle)] border-b border-[var(--border)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                      Site
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                      Capacity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                      Rooms
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {units.map((unit) => (
                    <tr key={unit.id} className="hover:bg-[var(--surface-subtle)] transition-colors">
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                        {unit.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                        {unit.site_name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                        {unit.capacity || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {unit.room_count || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditUnitModal(unit)}
                          className="text-[var(--clinical-blue)] hover:underline font-medium text-sm mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUnit(unit.id)}
                          disabled={deletingId === unit.id}
                          className="text-red-600 hover:underline font-medium text-sm disabled:opacity-50"
                        >
                          {deletingId === unit.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Site Form Modal */}
      {showSiteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-[var(--border)] shadow-lg">
            <div className="p-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
                {editingSite ? 'Edit Site' : 'Create New Site'}
              </h2>

              {siteFormError && (
                <div className="mb-4 p-3 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm">
                  {siteFormError}
                </div>
              )}

              <form onSubmit={handleSiteFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Site Name *
                  </label>
                  <input
                    type="text"
                    value={siteFormData.name}
                    onChange={(e) => setSiteFormData({ ...siteFormData, name: e.target.value })}
                    placeholder="e.g., Main Hospital"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={siteFormData.address}
                    onChange={(e) => setSiteFormData({ ...siteFormData, address: e.target.value })}
                    placeholder="Street address"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={siteFormData.city}
                      onChange={(e) => setSiteFormData({ ...siteFormData, city: e.target.value })}
                      placeholder="City"
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={siteFormData.state}
                      onChange={(e) => setSiteFormData({ ...siteFormData, state: e.target.value })}
                      placeholder="State"
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Zip Code
                    </label>
                    <input
                      type="text"
                      value={siteFormData.zip}
                      onChange={(e) => setSiteFormData({ ...siteFormData, zip: e.target.value })}
                      placeholder="Zip code"
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={siteFormData.phone}
                      onChange={(e) => setSiteFormData({ ...siteFormData, phone: e.target.value })}
                      placeholder="Phone number"
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeSiteModal}
                    className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-primary)] font-medium text-sm hover:bg-[var(--surface-subtle)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[var(--clinical-blue)] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
                  >
                    {editingSite ? 'Update Site' : 'Create Site'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Unit Form Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-[var(--border)] shadow-lg">
            <div className="p-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
                {editingUnit ? 'Edit Unit' : 'Create New Unit'}
              </h2>

              {unitFormError && (
                <div className="mb-4 p-3 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm">
                  {unitFormError}
                </div>
              )}

              <form onSubmit={handleUnitFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Unit Name *
                  </label>
                  <input
                    type="text"
                    value={unitFormData.name}
                    onChange={(e) => setUnitFormData({ ...unitFormData, name: e.target.value })}
                    placeholder="e.g., ICU, Emergency Department"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Site *
                  </label>
                  <select
                    value={unitFormData.siteId}
                    onChange={(e) => setUnitFormData({ ...unitFormData, siteId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
                  >
                    <option value="">Select a site</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={unitFormData.capacity}
                    onChange={(e) => setUnitFormData({ ...unitFormData, capacity: parseInt(e.target.value) || 0 })}
                    placeholder="Number of beds"
                    min="0"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeUnitModal}
                    className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-primary)] font-medium text-sm hover:bg-[var(--surface-subtle)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[var(--clinical-blue)] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
                  >
                    {editingUnit ? 'Update Unit' : 'Create Unit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
